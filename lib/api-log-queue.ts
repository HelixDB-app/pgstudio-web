/**
 * API Log Queue — high-performance, non-blocking log ingestion.
 *
 * Architecture:
 *  1. Client sends a log event to POST /api/gemini-logs
 *  2. Route handler enqueues via addApiLog() and immediately returns 202
 *  3. BullMQ worker (or inline fallback) batch-inserts into MongoDB
 *
 * Falls back to direct MongoDB insert when Redis is unavailable.
 */

import { Queue, Worker, Job } from "bullmq";
import clientPromise from "@/lib/mongodb";
import type { ApiLogDocument } from "@/models/ApiLog";
import { API_LOGS_COLLECTION, API_LOGS_INDEX_SPECS } from "@/models/ApiLog";

const REDIS_URI = process.env.REDIS_URI || process.env.REDIS_URL || "redis://localhost:6379";
export const API_LOG_QUEUE = "api-log-ingest";

function parseRedisUrl(url: string) {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname || "localhost",
            port: parseInt(parsed.port || "6379", 10),
            password: parsed.password || undefined,
            db: parsed.pathname ? parseInt(parsed.pathname.replace("/", "") || "0", 10) : 0,
            tls: parsed.protocol === "rediss:" ? {} : undefined,
        };
    } catch {
        return { host: "localhost", port: 6379 };
    }
}

const redisConnection = parseRedisUrl(REDIS_URI);

export interface ApiLogJobData {
    logs: Omit<ApiLogDocument, "_id">[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let apiLogQueue: Queue<ApiLogJobData, any, string> | null = null;
let queueAvailable = true;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApiLogQueue(): Queue<ApiLogJobData, any, string> | null {
    if (!queueAvailable) return null;
    try {
        if (!apiLogQueue) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            apiLogQueue = new Queue<ApiLogJobData, any, string>(API_LOG_QUEUE, {
                connection: redisConnection,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: { type: "exponential", delay: 2000 },
                    removeOnComplete: { count: 50 },
                    removeOnFail: { count: 100 },
                },
            });

            apiLogQueue.on("error", (err) => {
                console.warn("[api-log-queue] Queue error, switching to direct insert:", err.message);
                queueAvailable = false;
            });
        }
        return apiLogQueue;
    } catch {
        queueAvailable = false;
        return null;
    }
}

/** One-time index setup — idempotent, call on first use */
let indexesEnsured = false;
async function ensureIndexes(): Promise<void> {
    if (indexesEnsured) return;
    try {
        const client = await clientPromise;
        const col = client.db().collection(API_LOGS_COLLECTION);
        for (const spec of API_LOGS_INDEX_SPECS) {
            await col.createIndex(spec.key, { name: spec.name, background: true });
        }
        indexesEnsured = true;
    } catch (err) {
        console.warn("[api-log-queue] Index creation failed (non-fatal):", err);
    }
}

/**
 * Enqueue a single API log entry.
 * Non-blocking — returns immediately regardless of outcome.
 * Falls back to direct MongoDB insert if Redis is unavailable.
 */
export function addApiLog(log: Omit<ApiLogDocument, "_id">): void {
    const queue = getApiLogQueue();

    if (queue) {
        queue.add("log", { logs: [log] }, { priority: 10 }).catch((err) => {
            console.warn("[api-log-queue] Enqueue failed, falling back to direct insert:", err.message);
            directInsert([log]);
        });
    } else {
        directInsert([log]);
    }
}

/** Direct MongoDB insert (fallback path) */
function directInsert(logs: Omit<ApiLogDocument, "_id">[]): void {
    Promise.resolve()
        .then(async () => {
            await ensureIndexes();
            const client = await clientPromise;
            await client.db().collection(API_LOGS_COLLECTION).insertMany(
                logs.map((l) => ({ ...l, createdAt: l.createdAt ?? new Date() }))
            );
        })
        .catch((err) => console.error("[api-log-queue] Direct insert failed:", err));
}

/**
 * Create and return a BullMQ worker for processing API log jobs.
 * Designed for batch inserts: collects up to BATCH_SIZE logs per MongoDB write.
 */
export function createApiLogWorker(): Worker<ApiLogJobData> {
    return new Worker<ApiLogJobData>(
        API_LOG_QUEUE,
        async (job: Job<ApiLogJobData>) => {
            const { logs } = job.data;
            if (!logs || logs.length === 0) return;

            await ensureIndexes();
            const client = await clientPromise;
            await client.db().collection(API_LOGS_COLLECTION).insertMany(
                logs.map((l) => ({ ...l, createdAt: l.createdAt ?? new Date() }))
            );
        },
        {
            connection: redisConnection,
            concurrency: 10,
            limiter: { max: 100, duration: 1000 },
        }
    );
}
