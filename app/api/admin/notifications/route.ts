import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { resolveSegmentToUserIds } from "@/lib/segment-resolver";
import { processNotificationChunk } from "@/lib/notification-processor";
import { writeAuditLog } from "@/lib/audit-log";
import {
    NOTIFICATIONS_COLLECTION,
    NOTIFICATION_DELIVERIES_COLLECTION,
    notificationToPublic,
    type NotificationDocument,
    type NotificationSegment,
    type NotificationType,
} from "@/models/Notification";

const LOG = "[admin/notifications]";

export async function GET(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));
    const status = searchParams.get("status") ?? undefined;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    try {
        const client = await clientPromise;
        const db = client.db();
        const col = db.collection<NotificationDocument>(NOTIFICATIONS_COLLECTION);

        const [docs, total] = await Promise.all([
            col
                .find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray(),
            col.countDocuments(filter),
        ]);

        return NextResponse.json({
            notifications: docs.map(notificationToPublic),
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error(`${LOG} GET error:`, err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    let body: {
        type?: NotificationType;
        title?: string;
        body?: string;
        imageUrl?: string;
        data?: Record<string, string>;
        segment?: NotificationSegment;
        scheduledAt?: string;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { type = "push", title, body: notifBody, imageUrl, data, segment, scheduledAt } = body;

    if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!notifBody?.trim()) return NextResponse.json({ error: "body is required" }, { status: 400 });
    if (!segment) return NextResponse.json({ error: "segment is required" }, { status: 400 });

    console.log(`${LOG} Sending notification: type=${type}, title="${title}", segment=${JSON.stringify(segment)}`);

    try {
        const client = await clientPromise;
        const db = client.db();

        // Resolve user IDs for targeting
        const userIds = await resolveSegmentToUserIds(segment);
        console.log(`${LOG} Resolved segment to ${userIds.length} user(s)`);

        if (userIds.length === 0) {
            return NextResponse.json({ error: "No users match the selected segment" }, { status: 400 });
        }

        const scheduledDate = scheduledAt ? new Date(scheduledAt) : undefined;
        const now = new Date();

        const notifPayload = {
            type,
            title: title.trim(),
            body: notifBody.trim(),
            imageUrl,
            data,
        };

        // Insert notification document
        const notifDoc: NotificationDocument = {
            type,
            title: title.trim(),
            body: notifBody.trim(),
            imageUrl: imageUrl?.trim() || undefined,
            data: data ?? {},
            segment,
            status: scheduledDate ? "scheduled" : "sending",
            scheduledAt: scheduledDate,
            totalTargeted: userIds.length,
            totalSent: 0,
            totalFailed: 0,
            createdAt: now,
            updatedAt: now,
        };

        const result = await db.collection<NotificationDocument>(NOTIFICATIONS_COLLECTION).insertOne(notifDoc);
        const notificationId = result.insertedId.toString();
        console.log(`${LOG} Notification document created: id=${notificationId}, targeted=${userIds.length} users`);

        // Insert pending delivery records for all targets
        const deliveries = userIds.map((uid) => ({
            notificationId: result.insertedId,
            userId: new ObjectId(uid),
            channel: "desktop_rtdb" as const,
            status: "pending" as const,
            createdAt: now,
        }));
        for (let i = 0; i < deliveries.length; i += 1000) {
            await db.collection(NOTIFICATION_DELIVERIES_COLLECTION).insertMany(deliveries.slice(i, i + 1000));
        }
        console.log(`${LOG} Created ${userIds.length} pending delivery record(s)`);

        if (scheduledDate) {
            // Scheduled sends need a queue with delay — try to enqueue
            console.log(`${LOG} Scheduled for ${scheduledDate.toISOString()} — trying to enqueue`);
            try {
                const { enqueueNotificationJobs } = await import("@/lib/queue");
                await enqueueNotificationJobs(notificationId, userIds, notifPayload, scheduledDate);
                console.log(`${LOG} Scheduled job enqueued for ${scheduledDate.toISOString()}`);
            } catch (qErr) {
                console.error(`${LOG} Failed to enqueue scheduled notification (Redis unavailable?):`, qErr);
                // Mark as failed since we can't schedule without a queue
                await db.collection(NOTIFICATIONS_COLLECTION).updateOne(
                    { _id: result.insertedId },
                    { $set: { status: "failed", updatedAt: new Date() } }
                );
                return NextResponse.json({
                    error: "Scheduled notifications require a Redis connection. Set REDIS_URI in your environment.",
                }, { status: 503 });
            }
        } else {
            // Send now: ALWAYS process inline — never depend on a background worker.
            // This guarantees the notification is delivered immediately within the request.
            console.log(`${LOG} Processing ${userIds.length} user(s) inline (${Math.ceil(userIds.length / 500)} chunk(s))`);
            await processInline(notificationId, userIds, notifPayload, db, result.insertedId);
        }

        await writeAuditLog("notification.send", "notification", notificationId, {
            type, title, segment, userCount: userIds.length,
        }, req.headers.get("x-forwarded-for") ?? undefined);

        return NextResponse.json({
            id: notificationId,
            status: scheduledDate ? "scheduled" : "completed",
            totalTargeted: userIds.length,
        });
    } catch (err) {
        console.error(`${LOG} POST error:`, err);
        return NextResponse.json({
            error: err instanceof Error ? err.message : "Internal error",
        }, { status: 500 });
    }
}

/** Process notification chunks inline (synchronous, no queue required). */
async function processInline(
    notificationId: string,
    userIds: string[],
    payload: {
        type: string;
        title: string;
        body: string;
        imageUrl?: string;
        data?: Record<string, string>;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: any,
    insertedId: ObjectId
): Promise<void> {
    const CHUNK_SIZE = 500;
    const totalChunks = Math.ceil(userIds.length / CHUNK_SIZE);

    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
        const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
        const chunk = userIds.slice(i, i + CHUNK_SIZE);
        console.log(`${LOG} Processing inline chunk ${chunkIndex}/${totalChunks} (${chunk.length} users)`);

        await processNotificationChunk({
            notificationId,
            userIds: chunk,
            payload: {
                type: payload.type,
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl,
                data: payload.data,
            },
        });
    }

    // Mark notification as completed
    await db.collection(NOTIFICATIONS_COLLECTION).updateOne(
        { _id: insertedId },
        { $set: { status: "completed", sentAt: new Date(), updatedAt: new Date() } }
    );
    console.log(`${LOG} Notification ${notificationId} completed and marked done`);
}
