import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { ensureBetaFeedbackIndexes } from "@/lib/beta-feedback-db";
import {
    BETA_FEEDBACK_COLLECTION,
    type BetaFeedbackDocument,
} from "@/models/BetaFeedback";

export interface BetaFeedbackListItem {
    id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    message: string;
    category: string;
    contactEmail?: string;
    appVersion?: string;
    platform?: string;
    createdAt: string;
}

export async function GET(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    await ensureBetaFeedbackIndexes();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "25")));
    const search = searchParams.get("search")?.trim();

    const filter: Record<string, unknown> = {};
    if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [
            { message: regex },
            { contactEmail: regex },
            { userEmail: regex },
            { userName: regex },
            { userId: regex },
        ];
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const col = db.collection<BetaFeedbackDocument>(BETA_FEEDBACK_COLLECTION);

        const [items, total] = await Promise.all([
            col
                .find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray(),
            col.countDocuments(filter),
        ]);

        const list: BetaFeedbackListItem[] = items.map((row) => ({
            id: row._id!.toString(),
            userId: row.userId,
            userName: row.userName,
            userEmail: row.userEmail,
            message: row.message,
            category: row.category,
            contactEmail: row.contactEmail,
            appVersion: row.appVersion,
            platform: row.platform,
            createdAt:
                row.createdAt instanceof Date
                    ? row.createdAt.toISOString()
                    : String(row.createdAt ?? ""),
        }));

        return NextResponse.json({
            list,
            total,
            page,
            pages: Math.ceil(total / limit) || 1,
        });
    } catch (err) {
        console.error("[admin/feedback GET]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
