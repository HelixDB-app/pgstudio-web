import { ObjectId } from "mongodb";

export const RELEASE_NOTES_COLLECTION = "release_notes";

export type ReleaseTag = "feature" | "bugfix" | "improvement" | "security" | "breaking";

export interface ReleaseNoteDocument {
    _id?: ObjectId;
    version: string;
    title: string;
    summary?: string;
    content: Record<string, unknown>;
    tags: ReleaseTag[];
    majorUpdate: boolean;
    pinned: boolean;
    publishedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ReleaseNotePublic {
    id: string;
    version: string;
    title: string;
    summary?: string;
    content: Record<string, unknown>;
    tags: ReleaseTag[];
    majorUpdate: boolean;
    pinned: boolean;
    publishedAt: string;
    createdAt: string;
}

export function releaseNoteToPublic(doc: ReleaseNoteDocument): ReleaseNotePublic {
    return {
        id: doc._id!.toString(),
        version: doc.version,
        title: doc.title,
        summary: doc.summary,
        content: doc.content,
        tags: doc.tags,
        majorUpdate: doc.majorUpdate,
        pinned: doc.pinned,
        publishedAt: doc.publishedAt.toISOString(),
        createdAt: doc.createdAt.toISOString(),
    };
}
