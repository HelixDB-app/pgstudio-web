import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { DEVICE_TOKENS_COLLECTION, type DevicePlatform, type DeviceOS } from "@/models/Notification";
import { authOptions } from "@/lib/auth";

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

export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const platform = (body.platform ?? "desktop") as DevicePlatform;
    const os = (body.os ?? undefined) as DeviceOS | undefined;
    const token = (body.token ?? `desktop-${userId}`) as string;

    if (!["web", "desktop"].includes(platform)) {
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
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

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[register-device]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db();
    await db
        .collection(DEVICE_TOKENS_COLLECTION)
        .deleteOne({ userId: new ObjectId(userId), token });

    return NextResponse.json({ ok: true });
}
