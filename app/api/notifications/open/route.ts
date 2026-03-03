import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { NOTIFICATION_DELIVERIES_COLLECTION } from "@/models/Notification";
import { authOptions } from "@/lib/auth";

async function getUserId(req: NextRequest): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (session?.user && (session.user as { id?: string }).id) {
        return (session.user as { id: string }).id;
    }
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
        try {
            const token = auth.slice(7);
            const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as { sub?: string; id?: string };
            return payload.sub ?? payload.id ?? null;
        } catch { return null; }
    }
    return null;
}

export async function POST(req: NextRequest) {
    const userId = await getUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { notificationId } = await req.json();
    if (!notificationId) return NextResponse.json({ error: "notificationId required" }, { status: 400 });

    try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection(NOTIFICATION_DELIVERIES_COLLECTION).updateMany(
            { notificationId: new ObjectId(notificationId), userId: new ObjectId(userId) },
            { $set: { openedAt: new Date() } }
        );
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
