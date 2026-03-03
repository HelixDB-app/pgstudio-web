import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
    TRIAL_SETTINGS_COLLECTION,
    DEFAULT_TRIAL_SETTINGS,
    type TrialSettingsDocument,
} from "@/models/DeviceTrial";

export async function GET(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const client = await clientPromise;
    const db = client.db();
    const settings = await db
        .collection<TrialSettingsDocument>(TRIAL_SETTINGS_COLLECTION)
        .findOne({ key: "global" });

    return NextResponse.json(settings ?? DEFAULT_TRIAL_SETTINGS);
}

export async function PUT(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    let body: { trialEnabled?: boolean; trialDurationDays?: number };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (
        body.trialDurationDays !== undefined &&
        (typeof body.trialDurationDays !== "number" ||
            body.trialDurationDays < 1 ||
            body.trialDurationDays > 90)
    ) {
        return NextResponse.json(
            { error: "trialDurationDays must be between 1 and 90" },
            { status: 400 }
        );
    }

    const now = new Date();
    const client = await clientPromise;
    const db = client.db();

    const update: Partial<TrialSettingsDocument> = { updatedAt: now };
    if (typeof body.trialEnabled === "boolean") update.trialEnabled = body.trialEnabled;
    if (typeof body.trialDurationDays === "number") update.trialDurationDays = body.trialDurationDays;

    await db.collection<TrialSettingsDocument>(TRIAL_SETTINGS_COLLECTION).updateOne(
        { key: "global" },
        {
            $set: update,
            $setOnInsert: {
                key: "global",
                trialEnabled: DEFAULT_TRIAL_SETTINGS.trialEnabled,
                trialDurationDays: DEFAULT_TRIAL_SETTINGS.trialDurationDays,
            },
        },
        { upsert: true }
    );

    const saved = await db
        .collection<TrialSettingsDocument>(TRIAL_SETTINGS_COLLECTION)
        .findOne({ key: "global" });

    return NextResponse.json(saved);
}
