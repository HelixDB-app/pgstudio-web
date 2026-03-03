/**
 * Serverless-friendly inline processor.
 * When Redis/BullMQ is not available, the admin notification send API
 * can POST to this endpoint to process a chunk synchronously.
 * In production, prefer the BullMQ worker.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { processNotificationChunk } from "@/lib/notification-processor";
import type { NotificationJobData } from "@/lib/queue";

export async function POST(req: NextRequest) {
    const authErr = requireAdminAuth(req);
    if (authErr) return authErr;

    let body: NotificationJobData;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    try {
        await processNotificationChunk(body);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[admin/notifications/process]", err);
        return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
}
