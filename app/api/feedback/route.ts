import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { ensureBetaFeedbackIndexes } from "@/lib/beta-feedback-db";
import {
    BETA_FEEDBACK_CATEGORIES,
    BETA_FEEDBACK_COLLECTION,
    type BetaFeedbackCategory,
    type BetaFeedbackDocument,
} from "@/models/BetaFeedback";
import { USERS_COLLECTION, type UserDocument } from "@/models/User";
import { ObjectId } from "mongodb";

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;
const CONTACT_EMAIL_MAX = 320;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_PER_WINDOW = 20;

function isValidEmail(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function sanitizeCategory(raw: unknown): BetaFeedbackCategory {
    if (typeof raw === "string" && BETA_FEEDBACK_CATEGORIES.includes(raw as BetaFeedbackCategory)) {
        return raw as BetaFeedbackCategory;
    }
    return "general";
}

function sanitizeOptionalString(raw: unknown, max: number): string | undefined {
    if (typeof raw !== "string") return undefined;
    const t = raw.trim();
    if (!t) return undefined;
    return t.slice(0, max);
}

export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    const messageRaw = typeof b.message === "string" ? b.message.trim() : "";
    if (messageRaw.length < MESSAGE_MIN || messageRaw.length > MESSAGE_MAX) {
        return NextResponse.json(
            { error: `Message must be between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters` },
            { status: 400 }
        );
    }

    const category = sanitizeCategory(b.category);
    const contactEmail = sanitizeOptionalString(b.contactEmail, CONTACT_EMAIL_MAX);
    if (contactEmail && !isValidEmail(contactEmail)) {
        return NextResponse.json({ error: "Invalid contact email" }, { status: 400 });
    }

    const appVersion = sanitizeOptionalString(b.appVersion, 64);
    const platform = sanitizeOptionalString(b.platform, 128);
    const clientLocale = sanitizeOptionalString(b.clientLocale, 64);
    const userAgent = req.headers.get("user-agent")?.slice(0, 512);

    let oid: ObjectId;
    try {
        oid = new ObjectId(userId);
    } catch {
        return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    try {
        await ensureBetaFeedbackIndexes();
        const client = await clientPromise;
        const db = client.db();
        const col = db.collection<BetaFeedbackDocument>(BETA_FEEDBACK_COLLECTION);

        const since = new Date(Date.now() - RATE_WINDOW_MS);
        const recentCount = await col.countDocuments({
            userId,
            createdAt: { $gte: since },
        });
        if (recentCount >= RATE_MAX_PER_WINDOW) {
            return NextResponse.json(
                { error: "Too many submissions. Please try again later." },
                { status: 429 }
            );
        }

        const user = await db
            .collection<UserDocument>(USERS_COLLECTION)
            .findOne(
                { _id: oid, deletedAt: { $exists: false } },
                { projection: { name: 1, email: 1 } }
            );

        const doc: Omit<BetaFeedbackDocument, "_id"> = {
            userId,
            userName: user?.name,
            userEmail: user?.email,
            message: messageRaw,
            category,
            ...(contactEmail ? { contactEmail } : {}),
            ...(appVersion ? { appVersion } : {}),
            ...(platform ? { platform } : {}),
            ...(userAgent ? { userAgent } : {}),
            ...(clientLocale ? { clientLocale } : {}),
            createdAt: new Date(),
        };

        const result = await col.insertOne(doc as BetaFeedbackDocument);
        return NextResponse.json({ success: true, id: result.insertedId.toString() });
    } catch (err) {
        console.error("[api/feedback POST]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
