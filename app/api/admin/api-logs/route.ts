/**
 * GET /api/admin/api-logs
 *
 * Admin-authenticated analytics endpoint for Gemini API usage.
 *
 * Query params:
 *   page         (default 1)
 *   limit        (default 50, max 200)
 *   userId       filter by user ObjectId
 *   userEmail    partial match on userEmail
 *   model        filter by model id
 *   featureType  filter by feature
 *   status       "success" | "error" | "aborted"
 *   subscription filter by subscriptionType
 *   startDate    ISO date string (inclusive)
 *   endDate      ISO date string (inclusive)
 *   view         "logs" | "stats" | "timeseries" | "users" | "models" (default "logs")
 *   granularity  "day" | "week" | "month" (for timeseries, default "day")
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { requireAdminAuth } from "@/lib/admin-auth";
import { API_LOGS_COLLECTION } from "@/models/ApiLog";

export async function GET(req: NextRequest) {
    const authError = requireAdminAuth(req);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);

    const view = searchParams.get("view") ?? "logs";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const userIdRaw = searchParams.get("userId");
    const userEmail = searchParams.get("userEmail");
    const model = searchParams.get("model");
    const featureType = searchParams.get("featureType");
    const status = searchParams.get("status");
    const subscription = searchParams.get("subscription");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const granularity = searchParams.get("granularity") ?? "day";

    try {
        const client = await clientPromise;
        const col = client.db().collection(API_LOGS_COLLECTION);

        // ── Build match filter ────────────────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const match: Record<string, any> = {};

        if (userIdRaw) {
            try { match.userId = new ObjectId(userIdRaw); } catch { /* invalid id, ignore */ }
        }
        if (userEmail) {
            match.userEmail = { $regex: userEmail, $options: "i" };
        }
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

        // ── View: aggregate summary stats ─────────────────────────────────────
        if (view === "stats") {
            const [result] = await col
                .aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: null,
                            totalCalls: { $sum: 1 },
                            successCalls: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
                            errorCalls: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
                            abortedCalls: { $sum: { $cond: [{ $eq: ["$status", "aborted"] }, 1, 0] } },
                            avgResponseTime: { $avg: "$responseTime" },
                            p95ResponseTime: { $percentile: { input: "$responseTime", p: [0.95], method: "approximate" } },
                            totalTokens: { $sum: { $ifNull: ["$tokenUsed", 0] } },
                            totalPromptTokens: { $sum: { $ifNull: ["$promptTokens", 0] } },
                            totalCandidateTokens: { $sum: { $ifNull: ["$candidateTokens", 0] } },
                            uniqueUsers: { $addToSet: "$userId" },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            totalCalls: 1,
                            successCalls: 1,
                            errorCalls: 1,
                            abortedCalls: 1,
                            avgResponseTime: { $round: ["$avgResponseTime", 0] },
                            p95ResponseTime: { $round: [{ $arrayElemAt: ["$p95ResponseTime", 0] }, 0] },
                            totalTokens: 1,
                            totalPromptTokens: 1,
                            totalCandidateTokens: 1,
                            uniqueUsers: { $size: "$uniqueUsers" },
                            successRate: {
                                $cond: [
                                    { $gt: ["$totalCalls", 0] },
                                    { $multiply: [{ $divide: ["$successCalls", "$totalCalls"] }, 100] },
                                    0,
                                ],
                            },
                        },
                    },
                ])
                .toArray();

            return NextResponse.json({ stats: result ?? null });
        }

        // ── View: time-series ─────────────────────────────────────────────────
        if (view === "timeseries") {
            const fmtMap: Record<string, string> = {
                day: "%Y-%m-%d",
                week: "%Y-%U",
                month: "%Y-%m",
            };
            const fmt = fmtMap[granularity] ?? "%Y-%m-%d";

            const series = await col
                .aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: { $dateToString: { format: fmt, date: "$createdAt" } },
                            calls: { $sum: 1 },
                            successCalls: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
                            errorCalls: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
                            avgResponseTime: { $avg: "$responseTime" },
                            totalTokens: { $sum: { $ifNull: ["$tokenUsed", 0] } },
                        },
                    },
                    { $sort: { _id: 1 } },
                    {
                        $project: {
                            _id: 0,
                            date: "$_id",
                            calls: 1,
                            successCalls: 1,
                            errorCalls: 1,
                            avgResponseTime: { $round: ["$avgResponseTime", 0] },
                            totalTokens: 1,
                        },
                    },
                ])
                .toArray();

            return NextResponse.json({ series });
        }

        // ── View: per-user breakdown ──────────────────────────────────────────
        if (view === "users") {
            const users = await col
                .aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: "$userId",
                            userEmail: { $first: "$userEmail" },
                            userName: { $first: "$userName" },
                            totalCalls: { $sum: 1 },
                            successCalls: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
                            errorCalls: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
                            avgResponseTime: { $avg: "$responseTime" },
                            totalTokens: { $sum: { $ifNull: ["$tokenUsed", 0] } },
                            lastActivity: { $max: "$createdAt" },
                            subscriptionType: { $first: "$subscriptionType" },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            userId: { $toString: "$_id" },
                            userEmail: 1,
                            userName: 1,
                            totalCalls: 1,
                            successCalls: 1,
                            errorCalls: 1,
                            avgResponseTime: { $round: ["$avgResponseTime", 0] },
                            totalTokens: 1,
                            lastActivity: 1,
                            subscriptionType: 1,
                            successRate: {
                                $cond: [
                                    { $gt: ["$totalCalls", 0] },
                                    { $multiply: [{ $divide: ["$successCalls", "$totalCalls"] }, 100] },
                                    0,
                                ],
                            },
                        },
                    },
                    { $sort: { totalCalls: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                ])
                .toArray();

            const total = await col.distinct("userId", match);
            return NextResponse.json({ users, total: total.length, page, pages: Math.ceil(total.length / limit) });
        }

        // ── View: model breakdown ─────────────────────────────────────────────
        if (view === "models") {
            const models = await col
                .aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: "$model",
                            calls: { $sum: 1 },
                            successCalls: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
                            avgResponseTime: { $avg: "$responseTime" },
                            totalTokens: { $sum: { $ifNull: ["$tokenUsed", 0] } },
                        },
                    },
                    { $sort: { calls: -1 } },
                    {
                        $project: {
                            _id: 0,
                            model: "$_id",
                            calls: 1,
                            successCalls: 1,
                            avgResponseTime: { $round: ["$avgResponseTime", 0] },
                            totalTokens: 1,
                        },
                    },
                ])
                .toArray();

            return NextResponse.json({ models });
        }

        // ── View: feature breakdown ───────────────────────────────────────────
        if (view === "features") {
            const features = await col
                .aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: "$featureType",
                            calls: { $sum: 1 },
                            successCalls: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
                            avgResponseTime: { $avg: "$responseTime" },
                            totalTokens: { $sum: { $ifNull: ["$tokenUsed", 0] } },
                        },
                    },
                    { $sort: { calls: -1 } },
                    {
                        $project: {
                            _id: 0,
                            featureType: "$_id",
                            calls: 1,
                            successCalls: 1,
                            avgResponseTime: { $round: ["$avgResponseTime", 0] },
                            totalTokens: 1,
                        },
                    },
                ])
                .toArray();

            return NextResponse.json({ features });
        }

        // ── View: detailed log list (default) ─────────────────────────────────
        const [logs, total] = await Promise.all([
            col
                .aggregate([
                    { $match: match },
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            id: { $toString: "$_id" },
                            userId: { $toString: "$userId" },
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
                            _id: 0,
                        },
                    },
                ])
                .toArray(),
            col.countDocuments(match),
        ]);

        return NextResponse.json({
            logs,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error("[admin/api-logs GET]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
