import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { ensureSupportRequestIndexes } from "@/lib/support-request-db";
import {
    SUPPORT_REQUESTS_COLLECTION,
    type SupportRequestDocument,
} from "@/models/SupportRequest";

export interface SupportRequestListItem {
    id: string;
    name: string;
    email: string;
    topic: string;
    subject: string;
    message: string;
    userId?: string;
    userAgent?: string;
    clientIp?: string;
    createdAt: string;
}

export async function GET(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    await ensureSupportRequestIndexes();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "25")));
    const search = searchParams.get("search")?.trim();

    const filter: Record<string, unknown> = {};
    if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        filter.$or = [
            { name: regex },
            { email: regex },
            { subject: regex },
            { message: regex },
            { topic: regex },
            { userId: regex },
        ];
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const col = db.collection<SupportRequestDocument>(SUPPORT_REQUESTS_COLLECTION);

        const [items, total] = await Promise.all([
            col
                .find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray(),
            col.countDocuments(filter),
        ]);

        const list: SupportRequestListItem[] = items.map((row) => ({
            id: row._id!.toString(),
            name: row.name,
            email: row.email,
            topic: row.topic,
            subject: row.subject,
            message: row.message,
            ...(row.userId ? { userId: row.userId } : {}),
            ...(row.userAgent ? { userAgent: row.userAgent } : {}),
            ...(row.clientIp ? { clientIp: row.clientIp } : {}),
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
        console.error("[admin/support-requests GET]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
