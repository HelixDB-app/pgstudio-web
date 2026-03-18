import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import clientPromise from "@/lib/mongodb";
import {
    DEVICE_TRIALS_COLLECTION,
    deviceTrialToPublic,
    type DeviceTrialDocument,
} from "@/models/DeviceTrial";

const DEVICE_ID_REGEX = /^[0-9a-f]{64}$/i;

export async function GET(req: NextRequest) {
    const rawDeviceId = (req.nextUrl.searchParams.get("deviceId") ?? "").trim();
    if (!DEVICE_ID_REGEX.test(rawDeviceId)) {
        return NextResponse.json({ error: "Invalid device identifier" }, { status: 400 });
    }

    // Re-hash the client-supplied hash to match the stored server-side double-hash
    const deviceId = createHash("sha256")
        .update(`pgstudio:device:${rawDeviceId}`)
        .digest("hex");

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection<DeviceTrialDocument>(DEVICE_TRIALS_COLLECTION);

    const now = new Date();
    const record = await col.findOne({ deviceId });

    if (!record) {
        return NextResponse.json({ trial: null, exists: false });
    }

    // Auto-expire on read
    if (record.state === "active" && record.trialExpiryDate < now) {
        await col.updateOne(
            { deviceId },
            { $set: { state: "expired", trialUsed: true, updatedAt: now } }
        );
        record.state = "expired";
        record.trialUsed = true;
    } else if ((record.state === "expired" || record.state === "blocked") && !record.trialUsed) {
        await col.updateOne(
            { deviceId },
            { $set: { trialUsed: true, updatedAt: now } }
        );
        record.trialUsed = true;
    }

    return NextResponse.json({ trial: deviceTrialToPublic(record), exists: true });
}
