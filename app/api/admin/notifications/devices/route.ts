/**
 * Returns registered device counts for a notification segment.
 * Used by the admin UI to show audience preview before sending.
 */
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { resolveSegmentToUserIds } from "@/lib/segment-resolver";
import { DEVICE_TOKENS_COLLECTION } from "@/models/Notification";
import type { NotificationSegment } from "@/models/Notification";

export interface DevicePreviewResult {
    totalUsers: number;
    desktopDevices: number;
    webDevices: number;
    totalDevices: number;
    activeDevices: {
        userId: string;
        platform: string;
        os?: string;
        lastActiveAt: string;
    }[];
}

export async function POST(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    let body: { segment?: NotificationSegment };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.segment) {
        return NextResponse.json({ error: "segment is required" }, { status: 400 });
    }

    try {
        const userIds = await resolveSegmentToUserIds(body.segment);

        if (userIds.length === 0) {
            const empty: DevicePreviewResult = {
                totalUsers: 0,
                desktopDevices: 0,
                webDevices: 0,
                totalDevices: 0,
                activeDevices: [],
            };
            return NextResponse.json(empty);
        }

        const client = await clientPromise;
        const db = client.db();

        const userObjectIds = userIds.map((id) => new ObjectId(id));
        const devices = await db
            .collection(DEVICE_TOKENS_COLLECTION)
            .find({ userId: { $in: userObjectIds } })
            .sort({ lastActiveAt: -1 })
            .toArray();

        const desktopDevices = devices.filter((d) => d.platform === "desktop").length;
        const webDevices = devices.filter((d) => d.platform === "web").length;

        const result: DevicePreviewResult = {
            totalUsers: userIds.length,
            desktopDevices,
            webDevices,
            totalDevices: devices.length,
            activeDevices: devices.slice(0, 20).map((d) => ({
                userId: (d.userId as ObjectId).toString(),
                platform: d.platform as string,
                os: d.os as string | undefined,
                lastActiveAt:
                    d.lastActiveAt instanceof Date
                        ? d.lastActiveAt.toISOString()
                        : String(d.lastActiveAt ?? ""),
            })),
        };

        return NextResponse.json(result);
    } catch (err) {
        console.error("[admin/notifications/devices] Error:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
