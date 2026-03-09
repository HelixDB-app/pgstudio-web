import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getCorsHeaders } from "@/lib/cors";
import { DEVICE_TOKENS_COLLECTION, type DevicePlatform, type DeviceOS } from "@/models/Notification";
import { authOptions } from "@/lib/auth";

function withCors(res: NextResponse, req: NextRequest): NextResponse {
    const origin = req.headers.get("origin");
    Object.entries(getCorsHeaders(origin ?? null)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
}

async function getUserId(req: NextRequest): Promise<string | null> {
    // Try NextAuth session first
    const session = await getServerSession(authOptions);
    if (session?.user && (session.user as { id?: string }).id) {
        return (session.user as { id: string }).id;
    }

    // Try Bearer JWT (desktop)
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
        try {
            const token = auth.slice(7);
            const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as { sub?: string; id?: string };
            return payload.sub ?? payload.id ?? null;
        } catch {
            return null;
        }
    }

    return null;
}

export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get("origin");
    return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(origin ?? null),
    });
}

export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), req);
    }

    const body = await req.json();
    const platform = (body.platform ?? "desktop") as DevicePlatform;
    const os = (body.os ?? undefined) as DeviceOS | undefined;
    const token = (body.token ?? `desktop-${userId}`) as string;

    if (!["web", "desktop"].includes(platform)) {
        return withCors(NextResponse.json({ error: "Invalid platform" }, { status: 400 }), req);
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const now = new Date();

        await db.collection(DEVICE_TOKENS_COLLECTION).updateOne(
            { userId: new ObjectId(userId), token },
            {
                $set: { platform, os, lastActiveAt: now },
                $setOnInsert: { userId: new ObjectId(userId), token, createdAt: now },
            },
            { upsert: true }
        );

        return withCors(NextResponse.json({ ok: true }), req);
    } catch (err) {
        console.error("[register-device]", err);
        return withCors(NextResponse.json({ error: "Internal error" }, { status: 500 }), req);
    }
}

export async function DELETE(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), req);

    const { token } = await req.json();
    if (!token) return withCors(NextResponse.json({ error: "token required" }, { status: 400 }), req);

    const client = await clientPromise;
    const db = client.db();
    await db
        .collection(DEVICE_TOKENS_COLLECTION)
        .deleteOne({ userId: new ObjectId(userId), token });

    return withCors(NextResponse.json({ ok: true }), req);
}
