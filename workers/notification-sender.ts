/**
 * Standalone notification sender worker.
 * Run with: npx ts-node workers/notification-sender.ts
 * or: node --experimental-vm-modules workers/notification-sender.js (after build)
 *
 * This worker picks up jobs from the notification-send BullMQ queue
 * and processes each chunk of user IDs.
 */
import "dotenv/config";
import { ObjectId } from "mongodb";
import { createNotificationWorker } from "@/lib/queue";
import { processNotificationChunk } from "@/lib/notification-processor";
import { NOTIFICATIONS_COLLECTION } from "@/models/Notification";
import clientPromise from "@/lib/mongodb";

const LOG = "[notification-worker]";

const worker = createNotificationWorker(async (job) => {
    console.log(`${LOG} Processing job=${job.id} notification=${job.data.notificationId} users=${job.data.userIds.length}`);

    try {
        await processNotificationChunk(job.data);
        console.log(`${LOG} Job=${job.id} chunk processed successfully`);
    } catch (err) {
        console.error(`${LOG} Job=${job.id} chunk failed:`, err);
        throw err; // Re-throw so BullMQ retries per job options
    }
});

worker.on("completed", async (job) => {
    console.log(`${LOG} Job=${job.id} completed`);

    try {
        const client = await clientPromise;
        const db = client.db();
        const notifId = new ObjectId(job.data.notificationId);
        const notif = await db.collection(NOTIFICATIONS_COLLECTION).findOne({ _id: notifId });

        if (notif && notif.status === "sending") {
            const processedCount = (notif.totalSent ?? 0) + (notif.totalFailed ?? 0);
            const totalTargeted = notif.totalTargeted ?? 0;

            console.log(`${LOG} Completion check: processed=${processedCount}, targeted=${totalTargeted}`);

            // Only mark complete once all targeted users have been processed
            if (totalTargeted > 0 && processedCount >= totalTargeted) {
                await db.collection(NOTIFICATIONS_COLLECTION).updateOne(
                    { _id: notifId, status: "sending" },
                    { $set: { status: "completed", sentAt: new Date(), updatedAt: new Date() } }
                );
                console.log(`${LOG} Notification ${notif._id} marked as completed`);
            } else {
                console.log(`${LOG} Notification ${notif._id} still in progress (${processedCount}/${totalTargeted})`);
            }
        }
    } catch (err) {
        console.error(`${LOG} Status update failed for job=${job.id}:`, err);
    }
});

worker.on("failed", (job, err) => {
    console.error(`${LOG} Job=${job?.id} failed after retries for notification=${job?.data?.notificationId}:`, err);
});

worker.on("error", (err) => {
    console.error(`${LOG} Worker error:`, err);
});

console.log(`${LOG} Notification sender worker started, waiting for jobs...`);

process.on("SIGINT", async () => {
    console.log(`${LOG} SIGINT received, shutting down gracefully...`);
    await worker.close();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log(`${LOG} SIGTERM received, shutting down gracefully...`);
    await worker.close();
    process.exit(0);
});
