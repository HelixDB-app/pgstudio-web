/**
 * POST /api/gemini-logs
 *
 * Authenticated endpoint that receives Gemini API call logs from the desktop app.
 * Returns 202 Accepted immediately — logging is fully asynchronous.
 *
 * Auth: Bearer JWT (desktop token) or NextAuth session cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getToken } from "next-auth/jwt";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { USERS_COLLECTION } from "@/models/User";
import { SUBSCRIPTIONS_COLLECTION } from "@/models/Subscription";
import type { ApiLogDocument, ApiFeatureType, ApiLogStatus } from "@/models/ApiLog";
import { addApiLog } from "@/lib/api-log-queue";
import { mirrorAiModelInvocation } from "@/lib/posthog-mirror";

const LOG = "[gemini-logs]";

interface DesktopTokenPayload {
    sub: string;
    ast?: string;
    [key: string]: unknown;
}

interface LogPayload {
    model: string;
    featureType: ApiFeatureType;
    endpoint: string;
    requestTimestamp: string;
    responseTime: number;
    status: ApiLogStatus;
    tokenUsed?: number;
    promptTokens?: number;
    candidateTokens?: number;
    errorMessage?: string;
    errorCode?: number;
    provider?: string;
    stream?: boolean;
    cached?: boolean;
}

async function resolveAuth(
    req: NextRequest
): Promise<{ userId: string } | null> {
    // 1. NextAuth session cookie
    const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (sessionToken?.id) {
        return { userId: sessionToken.id as string };
    }

    // 2. Bearer JWT (desktop app)
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const payload = jwt.verify(
                authHeader.slice(7),
                process.env.NEXTAUTH_SECRET!
            ) as DesktopTokenPayload;
            if (payload.sub) return { userId: payload.sub };
        } catch {
            return null;
        }
    }

    return null;
}

export async function POST(req: NextRequest) {
    const auth = await resolveAuth(req);
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: LogPayload;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Basic validation
    if (!body.model || !body.featureType || !body.endpoint || !body.status) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (typeof body.responseTime !== "number" || body.responseTime < 0) {
        return NextResponse.json({ error: "Invalid responseTime" }, { status: 400 });
    }

    // Acknowledge immediately — all subsequent work is fire-and-forget
    const response = NextResponse.json({ ok: true }, { status: 202 });

    // Async enrichment + enqueue (non-blocking)
    enrichAndEnqueue(auth.userId, body).catch((err) =>
        console.error(`${LOG} enrichAndEnqueue failed:`, err)
    );

    return response;
}

async function enrichAndEnqueue(userId: string, body: LogPayload): Promise<void> {
    let userEmail: string | undefined;
    let userName: string | undefined;
    let subscriptionType: string | undefined;

    let userObjectId: ObjectId;
    try {
        userObjectId = new ObjectId(userId);
    } catch {
        console.warn(`${LOG} Invalid userId: ${userId}`);
        return;
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const user = await db
            .collection(USERS_COLLECTION)
            .findOne({ _id: userObjectId }, { projection: { email: 1, name: 1 } });

        if (user) {
            userEmail = user.email;
            userName = user.name;
        }

        // Fetch active subscription plan slug
        const sub = await db
            .collection(SUBSCRIPTIONS_COLLECTION)
            .findOne(
                { userId: userObjectId, status: "active" },
                { projection: { planSlug: 1 } }
            );
        subscriptionType = sub?.planSlug ?? "free";
    } catch (err) {
        console.warn(`${LOG} User/sub lookup failed (non-fatal):`, err);
    }

    const now = new Date();
    const logDoc: Omit<ApiLogDocument, "_id"> = {
        userId: userObjectId,
        userEmail,
        userName,
        model: body.model.slice(0, 100),
        featureType: body.featureType,
        endpoint: body.endpoint.slice(0, 100),
        requestTimestamp: body.requestTimestamp ? new Date(body.requestTimestamp) : now,
        responseTime: Math.round(body.responseTime),
        status: body.status,
        tokenUsed: body.tokenUsed,
        promptTokens: body.promptTokens,
        candidateTokens: body.candidateTokens,
        errorMessage: body.errorMessage
            ? body.errorMessage.slice(0, 500)
            : undefined,
        errorCode: body.errorCode,
        subscriptionType,
        createdAt: now,
    };

    addApiLog(logDoc);

    try {
        mirrorAiModelInvocation(userId, {
            model: body.model,
            featureType: body.featureType,
            endpoint: body.endpoint,
            responseTime: body.responseTime,
            status: body.status,
            provider: body.provider,
            stream: body.stream,
            cached: body.cached,
            errorMessage: body.errorMessage,
        });
    } catch (err) {
        console.warn(`${LOG} PostHog mirror failed (non-fatal):`, err);
    }
}
