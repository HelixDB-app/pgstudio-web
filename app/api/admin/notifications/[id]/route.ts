import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { enqueueNotificationJobs } from "@/lib/queue";
import { writeAuditLog } from "@/lib/audit-log";
import {
    NOTIFICATIONS_COLLECTION,
    NOTIFICATION_DELIVERIES_COLLECTION,
    notificationToPublic,
    type NotificationDocument,
} from "@/models/Notification";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const { id } = await params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    try {
        const client = await clientPromise;
        const db = client.db();
        const notif = await db
            .collection<NotificationDocument>(NOTIFICATIONS_COLLECTION)
            .findOne({ _id: new ObjectId(id) });

        if (!notif) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Delivery stats
        const deliveries = await db
            .collection(NOTIFICATION_DELIVERIES_COLLECTION)
            .aggregate([
                { $match: { notificationId: new ObjectId(id) } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ])
            .toArray();

        const stats: Record<string, number> = { sent: 0, failed: 0, pending: 0, opened: 0 };
        for (const d of deliveries) stats[d._id as string] = d.count;

        const openedCount = await db
            .collection(NOTIFICATION_DELIVERIES_COLLECTION)
            .countDocuments({ notificationId: new ObjectId(id), openedAt: { $exists: true } });
        stats.opened = openedCount;

        return NextResponse.json({ ...notificationToPublic(notif), deliveryStats: stats });
    } catch (err) {
        console.error("[admin/notifications GET id]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: Params) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const { id } = await params;
    const url = new URL(req.url);
    const action = url.pathname.endsWith("/retry") ? "retry" : null;

    if (action !== "retry") {
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    try {
        const client = await clientPromise;
        const db = client.db();

        const notif = await db
            .collection<NotificationDocument>(NOTIFICATIONS_COLLECTION)
            .findOne({ _id: new ObjectId(id) });
        if (!notif) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Get failed delivery user IDs
        const failedDeliveries = await db
            .collection(NOTIFICATION_DELIVERIES_COLLECTION)
            .find({ notificationId: new ObjectId(id), status: "failed" }, { projection: { userId: 1 } })
            .toArray();

        const userIds = [...new Set(failedDeliveries.map((d) => d.userId.toString()))];
        if (userIds.length === 0) {
            return NextResponse.json({ message: "No failed deliveries to retry" });
        }

        // Reset failed deliveries to pending
        await db.collection(NOTIFICATION_DELIVERIES_COLLECTION).updateMany(
            { notificationId: new ObjectId(id), status: "failed" },
            { $set: { status: "pending", error: undefined } }
        );

        await enqueueNotificationJobs(id, userIds, {
            type: notif.type,
            title: notif.title,
            body: notif.body,
            imageUrl: notif.imageUrl,
            data: notif.data as Record<string, string> | undefined,
        });

        await writeAuditLog("notification.retry", "notification", id, { retryCount: userIds.length });

        return NextResponse.json({ queued: userIds.length });
    } catch (err) {
        console.error("[admin/notifications retry]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
