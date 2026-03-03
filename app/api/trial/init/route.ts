import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import clientPromise from "@/lib/mongodb";
import {
    DEVICE_TRIALS_COLLECTION,
    TRIAL_SETTINGS_COLLECTION,
    DEFAULT_TRIAL_SETTINGS,
    deviceTrialToPublic,
    type DeviceTrialDocument,
    type TrialSettingsDocument,
} from "@/models/DeviceTrial";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max trial-init calls per device per hour before rate-limiting kicks in */
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Minimum time between consecutive init calls from the same device */
const MIN_CALL_INTERVAL_MS = 30 * 1000; // 30 seconds

/** Accept only hex strings of exactly 64 characters (SHA-256) */
const DEVICE_ID_REGEX = /^[0-9a-f]{64}$/i;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    // ── 1. Parse body ──────────────────────────────────────────────────────────
    let body: { deviceId?: string; associatedUserId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawDeviceId = (body.deviceId ?? "").trim();
    if (!DEVICE_ID_REGEX.test(rawDeviceId)) {
        return NextResponse.json({ error: "Invalid device identifier" }, { status: 400 });
    }

    // Double-hash on the server side so the DB never holds the client-supplied hash
    const deviceId = createHash("sha256")
        .update(`pgstudio:device:${rawDeviceId}`)
        .digest("hex");

    const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown";

    // ── 2. Connect to MongoDB ──────────────────────────────────────────────────
    const client = await clientPromise;
    const db = client.db();
    const col = db.collection<DeviceTrialDocument>(DEVICE_TRIALS_COLLECTION);

    // ── 3. Ensure indexes exist (idempotent) ───────────────────────────────────
    await col.createIndex({ deviceId: 1 }, { unique: true, background: true });
    await col.createIndex({ state: 1, trialExpiryDate: 1 }, { background: true });

    // ── 4. Load trial settings ─────────────────────────────────────────────────
    const settingsCol = db.collection<TrialSettingsDocument>(TRIAL_SETTINGS_COLLECTION);
    const settings =
        (await settingsCol.findOne({ key: "global" })) ??
        (DEFAULT_TRIAL_SETTINGS as TrialSettingsDocument);

    // ── 5. Fetch existing record ───────────────────────────────────────────────
    const now = new Date();
    const existing = await col.findOne({ deviceId });

    if (existing) {
        // ── 5a. Rate-limit check ───────────────────────────────────────────────
        const timeSinceLast = now.getTime() - existing.lastRequestAt.getTime();
        if (timeSinceLast < MIN_CALL_INTERVAL_MS) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
        if (
            existing.lastRequestAt > windowStart &&
            existing.requestCount >= RATE_LIMIT_REQUESTS
        ) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        // ── 5b. Auto-expire if past expiry date ────────────────────────────────
        let state = existing.state;
        if (state === "active" && existing.trialExpiryDate < now) {
            state = "expired";
        }

        // ── 5c. Associate a logged-in user if provided ─────────────────────────
        const updateFields: Partial<DeviceTrialDocument> = {
            state,
            lastSeenIp: clientIp,
            lastRequestAt: now,
            requestCount: existing.requestCount + 1,
            updatedAt: now,
        };
        if (body.associatedUserId && !existing.associatedUserId) {
            updateFields.associatedUserId = body.associatedUserId;
        }

        await col.updateOne({ deviceId }, { $set: updateFields });

        const updated = { ...existing, ...updateFields };
        return NextResponse.json({
            trial: deviceTrialToPublic(updated as DeviceTrialDocument),
        });
    }

    // ── 6. First-time device ───────────────────────────────────────────────────
    if (!settings.trialEnabled) {
        // Trial is globally disabled — new devices get no trial
        return NextResponse.json({
            trial: null,
            trialDisabled: true,
            message: "Free trial is not available",
        });
    }

    const trialExpiryDate = new Date(
        now.getTime() + settings.trialDurationDays * 24 * 60 * 60 * 1000
    );

    const newRecord: DeviceTrialDocument = {
        deviceId,
        trialStartDate: now,
        trialExpiryDate,
        state: "active",
        trialUsed: false,
        firstSeenIp: clientIp,
        lastSeenIp: clientIp,
        requestCount: 1,
        lastRequestAt: now,
        associatedUserId: body.associatedUserId,
        createdAt: now,
        updatedAt: now,
    };

    await col.insertOne(newRecord);

    return NextResponse.json({
        trial: deviceTrialToPublic(newRecord),
        isNewDevice: true,
    });
}
