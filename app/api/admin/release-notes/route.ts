import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-log";
import {
    RELEASE_NOTES_COLLECTION,
    releaseNoteToPublic,
    type ReleaseNoteDocument,
    type ReleaseTag,
} from "@/models/ReleaseNote";

export async function GET(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")));

    try {
        const client = await clientPromise;
        const db = client.db();
        const col = db.collection<ReleaseNoteDocument>(RELEASE_NOTES_COLLECTION);

        const [docs, total] = await Promise.all([
            col
                .find({})
                .sort({ publishedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray(),
            col.countDocuments({}),
        ]);

        return NextResponse.json({ notes: docs.map(releaseNoteToPublic), total, page });
    } catch (err) {
        console.error("[admin/release-notes GET]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    let body: {
        version?: string;
        title?: string;
        summary?: string;
        content?: Record<string, unknown>;
        tags?: ReleaseTag[];
        majorUpdate?: boolean;
        pinned?: boolean;
        publishedAt?: string;
    };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    if (!body.version?.trim()) return NextResponse.json({ error: "version is required" }, { status: 400 });
    if (!body.title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });

    try {
        const client = await clientPromise;
        const db = client.db();
        const now = new Date();

        const doc: ReleaseNoteDocument = {
            version: body.version.trim(),
            title: body.title.trim(),
            summary: body.summary?.trim(),
            content: body.content ?? { type: "doc", content: [] },
            tags: body.tags ?? [],
            majorUpdate: body.majorUpdate ?? false,
            pinned: body.pinned ?? false,
            publishedAt: body.publishedAt ? new Date(body.publishedAt) : now,
            createdAt: now,
            updatedAt: now,
        };

        const result = await db.collection<ReleaseNoteDocument>(RELEASE_NOTES_COLLECTION).insertOne(doc);
        await writeAuditLog("release_note.create", "release_note", result.insertedId.toString(), { version: doc.version });

        return NextResponse.json(releaseNoteToPublic({ ...doc, _id: result.insertedId }));
    } catch (err) {
        console.error("[admin/release-notes POST]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Valid id is required" }, { status: 400 });

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.version) update.version = String(body.version).trim();
    if (body.title) update.title = String(body.title).trim();
    if ("summary" in body) update.summary = body.summary;
    if (body.content) update.content = body.content;
    if (body.tags) update.tags = body.tags;
    if ("majorUpdate" in body) update.majorUpdate = Boolean(body.majorUpdate);
    if ("pinned" in body) update.pinned = Boolean(body.pinned);
    if (body.publishedAt) update.publishedAt = new Date(body.publishedAt as string);

    try {
        const client = await clientPromise;
        const db = client.db();
        const result = await db
            .collection<ReleaseNoteDocument>(RELEASE_NOTES_COLLECTION)
            .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: update }, { returnDocument: "after" });

        if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
        await writeAuditLog("release_note.update", "release_note", id, { fields: Object.keys(update) });

        return NextResponse.json(releaseNoteToPublic(result as ReleaseNoteDocument));
    } catch (err) {
        console.error("[admin/release-notes PATCH]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Valid id is required" }, { status: 400 });

    try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection(RELEASE_NOTES_COLLECTION).deleteOne({ _id: new ObjectId(id) });
        await writeAuditLog("release_note.delete", "release_note", id);

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[admin/release-notes DELETE]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
