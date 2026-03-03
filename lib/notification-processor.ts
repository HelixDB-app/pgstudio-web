/**
 * Core notification processor. Used by both the BullMQ worker
 * and the serverless inline processor (fallback when Redis is unavailable).
 */
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
    NOTIFICATIONS_COLLECTION,
    NOTIFICATION_DELIVERIES_COLLECTION,
    DEVICE_TOKENS_COLLECTION,
} from "@/models/Notification";
import type { NotificationJobData } from "@/lib/queue";
import { writeNotificationToRTDB, sendFCMToTokens } from "@/lib/firebase-admin";

const LOG = "[notification-processor]";

export async function processNotificationChunk(data: NotificationJobData): Promise<void> {
    const { notificationId, userIds, payload } = data;

    console.log(`${LOG} Starting chunk for notification=${notificationId}, users=${userIds.length}, type=${payload.type}`);

    const client = await clientPromise;
    const db = client.db();

    const now = new Date();
    const notifObjId = new ObjectId(notificationId);

    let rtdbSent = 0;
    let rtdbFailed = 0;

    // ── Step 1: Write to Firebase RTDB for all users (desktop + in-app fallback) ──
    console.log(`${LOG} Writing to RTDB for ${userIds.length} users...`);

    for (const userId of userIds) {
        try {
            await writeNotificationToRTDB(userId, notificationId, {
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl,
                data: payload.data,
                type: payload.type,
                createdAt: now.toISOString(),
            });

            await db.collection(NOTIFICATION_DELIVERIES_COLLECTION).updateOne(
                { notificationId: notifObjId, userId: new ObjectId(userId), channel: "desktop_rtdb" },
                {
                    $set: { status: "sent", sentAt: now, updatedAt: now },
                    $setOnInsert: {
                        notificationId: notifObjId,
                        userId: new ObjectId(userId),
                        channel: "desktop_rtdb",
                        createdAt: now,
                    },
                },
                { upsert: true }
            );
            rtdbSent++;
        } catch (err) {
            console.error(`${LOG} RTDB write failed for userId=${userId}:`, err);
            rtdbFailed++;
            await db.collection(NOTIFICATION_DELIVERIES_COLLECTION).updateOne(
                { notificationId: notifObjId, userId: new ObjectId(userId), channel: "desktop_rtdb" },
                {
                    $set: {
                        status: "failed",
                        error: err instanceof Error ? err.message : String(err),
                        updatedAt: now,
                    },
                    $setOnInsert: {
                        notificationId: notifObjId,
                        userId: new ObjectId(userId),
                        channel: "desktop_rtdb",
                        createdAt: now,
                    },
                },
                { upsert: true }
            );
        }
    }

    console.log(`${LOG} RTDB phase complete: sent=${rtdbSent}, failed=${rtdbFailed}`);

    // ── Step 2: Fetch and send FCM to web-registered tokens ──
    const userObjectIds = userIds.map((id) => new ObjectId(id));
    const deviceTokenDocs = await db
        .collection(DEVICE_TOKENS_COLLECTION)
        .find({ userId: { $in: userObjectIds }, platform: "web" })
        .toArray();

    console.log(`${LOG} Found ${deviceTokenDocs.length} web FCM token(s) for this chunk`);

    let fcmSent = 0;
    let fcmFailed = 0;

    if (deviceTokenDocs.length > 0) {
        const tokens = deviceTokenDocs.map((d) => d.token as string);
        const tokenToUserId = new Map<string, string>(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            deviceTokenDocs.map((d: any) => [d.token as string, (d.userId as ObjectId).toString()])
        );

        const failedTokens = await sendFCMToTokens(tokens, {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.imageUrl,
            data: payload.data,
        });

        const failedSet = new Set(failedTokens);

        for (const doc of deviceTokenDocs) {
            const token = doc.token as string;
            const uid = tokenToUserId.get(token)!;
            const status = failedSet.has(token) ? "failed" : "sent";

            await db.collection(NOTIFICATION_DELIVERIES_COLLECTION).updateOne(
                { notificationId: notifObjId, userId: new ObjectId(uid), channel: "web_fcm" },
                {
                    $set: {
                        status,
                        sentAt: status === "sent" ? now : undefined,
                        updatedAt: now,
                    },
                    $setOnInsert: {
                        notificationId: notifObjId,
                        userId: new ObjectId(uid),
                        channel: "web_fcm",
                        createdAt: now,
                    },
                },
                { upsert: true }
            );

            if (status === "sent") fcmSent++;
            else fcmFailed++;
        }

        // Cleanup stale/invalid FCM tokens
        if (failedTokens.length > 0) {
            console.warn(`${LOG} Removing ${failedTokens.length} invalid/expired FCM token(s)`);
            await db
                .collection(DEVICE_TOKENS_COLLECTION)
                .deleteMany({ token: { $in: failedTokens } });
        }

        console.log(`${LOG} FCM phase complete: sent=${fcmSent}, failed=${fcmFailed}`);
    }

    // ── Step 3: Update notification aggregate counters ──
    const totalSentDelta = rtdbSent + fcmSent;
    const totalFailedDelta = rtdbFailed + fcmFailed;

    await db.collection(NOTIFICATIONS_COLLECTION).updateOne(
        { _id: notifObjId },
        { $inc: { totalSent: totalSentDelta, totalFailed: totalFailedDelta } }
    );

    console.log(`${LOG} Chunk done. totalSentDelta=${totalSentDelta}, totalFailedDelta=${totalFailedDelta}`);
}
