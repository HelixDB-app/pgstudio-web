import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getUserId } from "@/lib/get-user-id";
import {
    COLLABORATION_EVENTS_COLLECTION,
    collaborationEventToPublic,
    type CollaborationEventDocument,
} from "@/models/CollaborationEvent";

const WEB_BASE_URL = (process.env.NEXT_PUBLIC_WEB_APP_URL ?? "https://pgstudio-web.vercel.app").replace(/\/$/, "");

function normalizeRoomId(input?: string): string {
    if (!input) return "";
    return input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64);
}

function generateRoomId(): string {
    return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let hostObjectId: ObjectId;
    try {
        hostObjectId = new ObjectId(userId);
    } catch {
        return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const events = await db
            .collection<CollaborationEventDocument>(COLLABORATION_EVENTS_COLLECTION)
            .find({ hostUserId: hostObjectId })
            .sort({ startsAt: 1 })
            .limit(200)
            .toArray();

        return NextResponse.json({
            events: events.map((event) => ({
                ...collaborationEventToPublic(event),
                shareUrl: `${WEB_BASE_URL}/collab/${encodeURIComponent(event.roomId)}`,
            })),
        });
    } catch (error) {
        console.error("[/api/collab/events GET]", error);
        return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let hostObjectId: ObjectId;
    try {
        hostObjectId = new ObjectId(userId);
    } catch {
        return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    try {
        const body = await req.json();
        const title = typeof body.title === "string" ? body.title.trim() : "";
        const startsAt = typeof body.startsAt === "string" ? new Date(body.startsAt) : null;
        const durationMinutesRaw = Number(body.durationMinutes ?? 60);
        const durationMinutes = Number.isFinite(durationMinutesRaw)
            ? Math.max(15, Math.min(24 * 60, Math.round(durationMinutesRaw)))
            : 60;
        const timezone = typeof body.timezone === "string" && body.timezone.trim()
            ? body.timezone.trim()
            : "UTC";
        const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";
        const invitedEmails = Array.isArray(body.invitedEmails)
            ? (body.invitedEmails as unknown[])
                .filter((value): value is string => typeof value === "string")
                .map((value) => value.trim().toLowerCase())
                .filter((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))
                .slice(0, 200)
            : [];

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        if (!startsAt || Number.isNaN(startsAt.getTime())) {
            return NextResponse.json({ error: "startsAt must be a valid ISO date" }, { status: 400 });
        }

        const roomId = normalizeRoomId(typeof body.roomId === "string" ? body.roomId : "") || generateRoomId();
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        const now = new Date();

        const doc: CollaborationEventDocument = {
            title,
            roomId,
            hostUserId: hostObjectId,
            startsAt,
            endsAt,
            timezone,
            notes: notes || undefined,
            invitedEmails,
            createdAt: now,
            updatedAt: now,
        };

        const client = await clientPromise;
        const db = client.db();
        const result = await db
            .collection<CollaborationEventDocument>(COLLABORATION_EVENTS_COLLECTION)
            .insertOne(doc);

        const event = collaborationEventToPublic({ ...doc, _id: result.insertedId });
        return NextResponse.json({
            event,
            shareUrl: `${WEB_BASE_URL}/collab/${encodeURIComponent(roomId)}`,
            desktopDeepLink: `pgstudio://collab/join?room=${encodeURIComponent(roomId)}`,
        }, { status: 201 });
    } catch (error) {
        console.error("[/api/collab/events POST]", error);
        return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
    }
}
