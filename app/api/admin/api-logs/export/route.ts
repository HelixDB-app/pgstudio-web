/**
 * GET /api/admin/api-logs/export
 *
 * Admin-authenticated CSV export for Gemini API usage logs.
 * Accepts the same filter query params as /api/admin/api-logs.
 * Streams up to 50,000 rows as a CSV file.
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { API_LOGS_COLLECTION } from "@/models/ApiLog";

const MAX_EXPORT_ROWS = 50_000;

function escCsv(val: unknown): string {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);

    const userIdRaw = searchParams.get("userId");
    const userEmail = searchParams.get("userEmail");
    const model = searchParams.get("model");
    const featureType = searchParams.get("featureType");
    const status = searchParams.get("status");
    const subscription = searchParams.get("subscription");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match: Record<string, any> = {};

    if (userIdRaw) {
        try { match.userId = new ObjectId(userIdRaw); } catch { /* skip */ }
    }
    if (userEmail) match.userEmail = { $regex: userEmail, $options: "i" };
    if (model) match.model = model;
    if (featureType) match.featureType = featureType;
    if (status) match.status = status;
    if (subscription) match.subscriptionType = subscription;

    if (startDate || endDate) {
        match.createdAt = {};
        if (startDate) match.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            match.createdAt.$lte = end;
        }
    }

    try {
        const client = await clientPromise;
        const col = client.db().collection(API_LOGS_COLLECTION);

        const cursor = col
            .find(match, {
                projection: {
                    _id: 1,
                    userId: 1,
                    userEmail: 1,
                    userName: 1,
                    model: 1,
                    featureType: 1,
                    endpoint: 1,
                    requestTimestamp: 1,
                    responseTime: 1,
                    status: 1,
                    tokenUsed: 1,
                    promptTokens: 1,
                    candidateTokens: 1,
                    errorMessage: 1,
                    errorCode: 1,
                    subscriptionType: 1,
                    createdAt: 1,
                },
            })
            .sort({ createdAt: -1 })
            .limit(MAX_EXPORT_ROWS);

        const rows: string[] = [];
        const headers = [
            "id", "userId", "userEmail", "userName",
            "model", "featureType", "endpoint",
            "requestTimestamp", "responseTime_ms", "status",
            "tokenUsed", "promptTokens", "candidateTokens",
            "errorCode", "errorMessage", "subscriptionType", "createdAt",
        ];
        rows.push(headers.join(","));

        for await (const doc of cursor) {
            rows.push([
                escCsv(doc._id?.toString()),
                escCsv(doc.userId?.toString()),
                escCsv(doc.userEmail),
                escCsv(doc.userName),
                escCsv(doc.model),
                escCsv(doc.featureType),
                escCsv(doc.endpoint),
                escCsv(doc.requestTimestamp instanceof Date
                    ? doc.requestTimestamp.toISOString()
                    : doc.requestTimestamp),
                escCsv(doc.responseTime),
                escCsv(doc.status),
                escCsv(doc.tokenUsed),
                escCsv(doc.promptTokens),
                escCsv(doc.candidateTokens),
                escCsv(doc.errorCode),
                escCsv(doc.errorMessage),
                escCsv(doc.subscriptionType),
                escCsv(doc.createdAt instanceof Date
                    ? doc.createdAt.toISOString()
                    : doc.createdAt),
            ].join(","));
        }

        const csv = rows.join("\n");
        const filename = `gemini-logs-${new Date().toISOString().split("T")[0]}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        console.error("[admin/api-logs/export GET]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
