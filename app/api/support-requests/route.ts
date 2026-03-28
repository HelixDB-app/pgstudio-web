import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import { ensureSupportRequestIndexes } from "@/lib/support-request-db";
import {
    SUPPORT_REQUESTS_COLLECTION,
    SUPPORT_TOPICS,
    type SupportTopic,
    type SupportRequestDocument,
} from "@/models/SupportRequest";

const NAME_MIN = 2;
const NAME_MAX = 120;
const EMAIL_MAX = 320;
const SUBJECT_MIN = 5;
const SUBJECT_MAX = 200;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 8000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_EMAIL = 5;
const RATE_MAX_IP = 15;

function isValidEmail(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function getClientIp(req: NextRequest): string {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
        const first = xff.split(",")[0]?.trim();
        if (first) return first.slice(0, 64);
    }
    return req.headers.get("x-real-ip")?.trim().slice(0, 64) ?? "unknown";
}

function sanitizeTopic(raw: unknown): SupportTopic {
    if (typeof raw === "string" && SUPPORT_TOPICS.includes(raw as SupportTopic)) {
        return raw as SupportTopic;
    }
    return "other";
}

function sanitizeString(raw: unknown, max: number): string {
    if (typeof raw !== "string") return "";
    return raw.trim().slice(0, max);
}

export async function POST(req: NextRequest) {
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

    // Honeypot: bots often fill hidden fields
    if (typeof b.website === "string" && b.website.trim() !== "") {
        return NextResponse.json({ success: true });
    }

    const name = sanitizeString(b.name, NAME_MAX);
    const email = sanitizeString(b.email, EMAIL_MAX).toLowerCase();
    const subject = sanitizeString(b.subject, SUBJECT_MAX);
    const message = sanitizeString(b.message, MESSAGE_MAX);
    const topic = sanitizeTopic(b.topic);

    if (name.length < NAME_MIN) {
        return NextResponse.json(
            { error: `Name must be at least ${NAME_MIN} characters` },
            { status: 400 }
        );
    }
    if (!email || !isValidEmail(email)) {
        return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) {
        return NextResponse.json(
            { error: `Subject must be between ${SUBJECT_MIN} and ${SUBJECT_MAX} characters` },
            { status: 400 }
        );
    }
    if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
        return NextResponse.json(
            { error: `Message must be between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters` },
            { status: 400 }
        );
    }

    const userId = await getUserId(req);
    const userAgent = req.headers.get("user-agent")?.slice(0, 512);
    const clientIp = getClientIp(req);

    try {
        await ensureSupportRequestIndexes();
        const client = await clientPromise;
        const db = client.db();
        const col = db.collection<SupportRequestDocument>(SUPPORT_REQUESTS_COLLECTION);

        const since = new Date(Date.now() - RATE_WINDOW_MS);

        const [emailCount, ipCount] = await Promise.all([
            col.countDocuments({ email, createdAt: { $gte: since } }),
            clientIp !== "unknown"
                ? col.countDocuments({ clientIp, createdAt: { $gte: since } })
                : Promise.resolve(0),
        ]);

        if (emailCount >= RATE_MAX_EMAIL) {
            return NextResponse.json(
                { error: "Too many requests from this email. Please try again later." },
                { status: 429 }
            );
        }
        if (ipCount >= RATE_MAX_IP) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            );
        }

        const doc: Omit<SupportRequestDocument, "_id"> = {
            name,
            email,
            topic,
            subject,
            message,
            ...(userId ? { userId } : {}),
            ...(userAgent ? { userAgent } : {}),
            ...(clientIp !== "unknown" ? { clientIp } : {}),
            createdAt: new Date(),
        };

        const result = await col.insertOne(doc as SupportRequestDocument);
        return NextResponse.json({ success: true, id: result.insertedId.toString() });
    } catch (err) {
        console.error("[api/support-requests POST]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
