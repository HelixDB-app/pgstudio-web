import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { DEVICE_TRIALS_COLLECTION, type DeviceTrialDocument } from "@/models/DeviceTrial";

export async function GET(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection<DeviceTrialDocument>(DEVICE_TRIALS_COLLECTION);
    const now = new Date();

    // Auto-expire stale active records
    await col.updateMany(
        { state: "active", trialExpiryDate: { $lt: now } },
        { $set: { state: "expired", updatedAt: now } }
    );

    const [total, active, expired, blocked, recent] = await Promise.all([
        col.countDocuments(),
        col.countDocuments({ state: "active" }),
        col.countDocuments({ state: "expired" }),
        col.countDocuments({ state: "blocked" }),
        col
            .find({}, {
                projection: {
                    deviceId: 0,     // never expose hashed IDs in listings
                    firstSeenIp: 1,
                    lastSeenIp: 1,
                    state: 1,
                    trialStartDate: 1,
                    trialExpiryDate: 1,
                    requestCount: 1,
                    associatedUserId: 1,
                    createdAt: 1,
                },
            })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray(),
    ]);

    return NextResponse.json({
        stats: { total, active, expired, blocked },
        recent: recent.map((r) => ({
            ...r,
            _id: r._id?.toString(),
            trialStartDate: r.trialStartDate?.toISOString(),
            trialExpiryDate: r.trialExpiryDate?.toISOString(),
            createdAt: r.createdAt?.toISOString(),
        })),
    });
}
