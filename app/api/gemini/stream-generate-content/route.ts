import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/lib/cors";
import {
    consumeGeminiRateLimitSlot,
    geminiRateLimitServiceErrorPayload,
    getClientIp,
} from "@/lib/gemini-rate-limit";
import { buildStreamGenerateContentUrl, isValidGeminiModelId } from "@/lib/gemini-proxy";

export const maxDuration = 300;

const GOOGLE_API_KEY_HEADER = "x-goog-api-key";

function attachCors(res: NextResponse, req: NextRequest): NextResponse {
    const origin = req.headers.get("origin");
    Object.entries(getCorsHeaders(origin ?? null)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
}

export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get("origin");
    return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin ?? null),
    });
}

export async function POST(req: NextRequest) {
    const apiKey = req.headers.get(GOOGLE_API_KEY_HEADER)?.trim();
    if (!apiKey) {
        return attachCors(
            NextResponse.json(
                { error: { message: "Missing x-goog-api-key header", code: 400 } },
                { status: 400 }
            ),
            req
        );
    }

    const model = req.nextUrl.searchParams.get("model")?.trim() ?? "";
    if (!isValidGeminiModelId(model)) {
        return attachCors(
            NextResponse.json(
                { error: { message: "Invalid or missing model query parameter", code: 400 } },
                { status: 400 }
            ),
            req
        );
    }

    const bodyText = await req.text();
    if (!bodyText.trim()) {
        return attachCors(
            NextResponse.json(
                { error: { message: "Empty request body", code: 400 } },
                { status: 400 }
            ),
            req
        );
    }

    const ip = getClientIp(req);
    const limit = await consumeGeminiRateLimitSlot(ip);
    if ("redisUnavailable" in limit && limit.redisUnavailable) {
        return attachCors(
            NextResponse.json(geminiRateLimitServiceErrorPayload(), { status: 503 }),
            req
        );
    }
    if (!limit.ok && "retryAfterSeconds" in limit) {
        const res = NextResponse.json(
            {
                error: {
                    message: "Too many Gemini requests from this network. Please wait before trying again.",
                    code: 429,
                    status: "RESOURCE_EXHAUSTED",
                },
            },
            { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
        );
        return attachCors(res, req);
    }

    const url = buildStreamGenerateContentUrl(model, apiKey);
    let upstream: Response;
    try {
        upstream = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: bodyText,
        });
    } catch (e) {
        console.warn("[gemini-proxy] streamGenerateContent upstream fetch failed:", e);
        return attachCors(
            NextResponse.json(
                { error: { message: "Failed to reach Gemini API", code: 502 } },
                { status: 502 }
            ),
            req
        );
    }

    if (!upstream.ok || !upstream.body) {
        const text = await upstream.text();
        const res = new NextResponse(text, {
            status: upstream.status,
            headers: {
                "Content-Type": upstream.headers.get("content-type") ?? "application/json",
            },
        });
        return attachCors(res, req);
    }

    const contentType = upstream.headers.get("content-type") ?? "text/event-stream";
    const res = new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
    return attachCors(res, req);
}
