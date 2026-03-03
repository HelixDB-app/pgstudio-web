import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { RELEASE_NOTES_COLLECTION, releaseNoteToPublic, type ReleaseNoteDocument } from "@/models/ReleaseNote";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "10")));
    const after = searchParams.get("after"); // cursor: publishedAt ISO string

    const filter: Record<string, unknown> = {};
    if (after) {
        filter.publishedAt = { $lt: new Date(after) };
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const docs = await db
            .collection<ReleaseNoteDocument>(RELEASE_NOTES_COLLECTION)
            .find(filter)
            .sort({ pinned: -1, publishedAt: -1 })
            .limit(limit)
            .toArray();

        const notes = docs.map(releaseNoteToPublic);
        const nextCursor = docs.length === limit ? docs[docs.length - 1].publishedAt.toISOString() : null;

        return NextResponse.json({ notes, nextCursor });
    } catch (err) {
        console.error("[release-notes GET]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
