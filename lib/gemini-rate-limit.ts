/**
 * Sliding-window rate limit for Gemini proxy (Redis).
 * Default: fail closed on Redis errors (503) so the proxy stays protected.
 * Set GEMINI_RATE_LIMIT_FAIL_OPEN=true only when Redis is optional (e.g. local dev without Redis).
 */

import type { NextRequest } from "next/server";
import Redis from "ioredis";

const REDIS_URI = process.env.REDIS_URI || process.env.REDIS_URL || "redis://localhost:6379";

function failOpenWhenRedisDown(): boolean {
    const v = process.env.GEMINI_RATE_LIMIT_FAIL_OPEN?.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
}

/** Max Gemini proxy calls per client IP per rolling window. */
export const GEMINI_RATE_LIMIT_MAX = 10;
/** Window size in milliseconds (1 minute). */
export const GEMINI_RATE_LIMIT_WINDOW_MS = 60_000;

const KEY_PREFIX = "ratelimit:gemini:";

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldestScore = tonumber(oldest[2])
  if oldestScore then
    local retryMs = oldestScore + window - now
    if retryMs < 0 then retryMs = 0 end
    return {0, math.ceil(retryMs / 1000)}
  end
  return {0, 60}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, 0}
`;

type GlobalRedis = typeof globalThis & { __geminiRateLimitRedis?: Redis };

function getRedisClient(): Redis {
    const g = globalThis as GlobalRedis;
    if (!g.__geminiRateLimitRedis) {
        g.__geminiRateLimitRedis = new Redis(REDIS_URI, {
            maxRetriesPerRequest: 2,
            enableReadyCheck: true,
            lazyConnect: false,
            connectTimeout: 5_000,
            commandTimeout: 4_000,
        });
        g.__geminiRateLimitRedis.on("error", (err) => {
            console.warn("[gemini-rate-limit] Redis error:", err.message);
        });
    }
    return g.__geminiRateLimitRedis;
}

/**
 * Normalize client identifier for rate-limit keys (IPv4-mapped IPv6, trim).
 */
export function normalizeClientIp(ip: string): string {
    const t = ip.trim();
    if (t.startsWith("::ffff:")) return t.slice(7);
    return t;
}

/**
 * Client IP for rate limiting (trusted reverse proxy: Vercel, etc.).
 */
export function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim();
        if (first) return normalizeClientIp(first);
    }
    const realIp = req.headers.get("x-real-ip")?.trim();
    if (realIp) return normalizeClientIp(realIp);
    return "unknown";
}

export type GeminiRateLimitResult =
    | { ok: true }
    | { ok: false; retryAfterSeconds: number }
    | { ok: false; redisUnavailable: true };

/**
 * Atomically record one request if under the sliding-window limit.
 */
export async function consumeGeminiRateLimitSlot(clientIp: string): Promise<GeminiRateLimitResult> {
    const safeIp = clientIp.replace(/[^a-zA-Z0-9.:_-]/g, "_").slice(0, 128) || "unknown";
    const key = `${KEY_PREFIX}${safeIp}`;
    const now = Date.now();
    const member = `${now}:${Math.random().toString(36).slice(2, 12)}`;

    try {
        const redis = getRedisClient();
        const raw = (await redis.eval(
            SLIDING_WINDOW_LUA,
            1,
            key,
            String(GEMINI_RATE_LIMIT_WINDOW_MS),
            String(GEMINI_RATE_LIMIT_MAX),
            String(now),
            member
        )) as [number, number];

        const allowed = raw[0] === 1;
        const retryAfter = raw[1] ?? 60;
        if (allowed) return { ok: true };
        return { ok: false, retryAfterSeconds: Math.max(1, retryAfter) };
    } catch (err) {
        console.warn("[gemini-rate-limit] Redis eval failed:", err);
        if (failOpenWhenRedisDown()) {
            return { ok: true };
        }
        return { ok: false, redisUnavailable: true };
    }
}

/** JSON body + hint for clients when Redis is required but unreachable. */
export function geminiRateLimitServiceErrorPayload(): {
    error: {
        message: string;
        code: number;
        details: string;
    };
} {
    return {
        error: {
            message: "Rate limit service unavailable. Try again later.",
            code: 503,
            details:
                "The Gemini proxy uses Redis (REDIS_URI or REDIS_URL) for per-IP limits. " +
                "Provision Redis (e.g. Upstash) and set the connection string, or for local dev only set GEMINI_RATE_LIMIT_FAIL_OPEN=true.",
        },
    };
}
