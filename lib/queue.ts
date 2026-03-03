import { Queue, Worker, Job } from "bullmq";

const REDIS_URI = process.env.REDIS_URI || process.env.REDIS_URL || "redis://localhost:6379";

/** Parse a Redis URL into BullMQ ConnectionOptions */
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

export const NOTIFICATION_QUEUE = "notification-send";

export interface NotificationJobData {
    notificationId: string;
    userIds: string[];
    payload: {
        title: string;
        body: string;
        imageUrl?: string | null;
        data?: Record<string, string>;
        type: string;
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let notificationQueue: Queue<NotificationJobData, any, string> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNotificationQueue(): Queue<NotificationJobData, any, string> {
    if (!notificationQueue) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        notificationQueue = new Queue<NotificationJobData, any, string>(NOTIFICATION_QUEUE, {
            connection: redisConnection,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 },
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 200 },
            },
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return notificationQueue!;
}

/** Enqueue notification jobs, splitting userIds into chunks of 500 */
export async function enqueueNotificationJobs(
    notificationId: string,
    userIds: string[],
    payload: NotificationJobData["payload"],
    scheduledAt?: Date
): Promise<void> {
    const queue = getNotificationQueue();
    const CHUNK_SIZE = 500;

    const jobOptions = scheduledAt
        ? { delay: Math.max(0, scheduledAt.getTime() - Date.now()) }
        : {};

    const jobs = [];
    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
        const chunk = userIds.slice(i, i + CHUNK_SIZE);
        jobs.push({
            name: `chunk-${Math.floor(i / CHUNK_SIZE)}`,
            data: { notificationId, userIds: chunk, payload } as NotificationJobData,
            opts: jobOptions,
        });
    }

    if (jobs.length > 0) {
        await queue.addBulk(jobs);
    }
}

/** Create and return a notification worker (call from standalone worker process) */
export function createNotificationWorker(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    processor: (job: Job<NotificationJobData, any, string>) => Promise<void>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Worker<NotificationJobData, any, string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Worker<NotificationJobData, any, string>(NOTIFICATION_QUEUE, processor, {
        connection: redisConnection,
        concurrency: 5,
    });
}
