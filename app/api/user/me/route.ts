import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import type { UserDocument } from "@/models/User";
import { USERS_COLLECTION } from "@/models/User";
import { ObjectId } from "mongodb";

interface DesktopTokenPayload {
    sub: string;
    ast?: string;
    [key: string]: unknown;
}

/**
 * Resolves authenticated user from either:
 *   1. NextAuth session cookie (web)
 *   2. Bearer JWT minted by /api/auth/desktop-token (desktop app)
 * Returns { userId, activeSessionToken } or null.
 */
async function resolveAuth(
    req: NextRequest
): Promise<{ userId: string; activeSessionToken?: string } | null> {
    // 1. NextAuth session cookie
    const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (sessionToken?.id) {
        return {
            userId: sessionToken.id as string,
            activeSessionToken: sessionToken.activeSessionToken as string | undefined,
        };
    }

    // 2. Bearer JWT (desktop app)
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const payload = jwt.verify(
                authHeader.slice(7),
                process.env.NEXTAUTH_SECRET!
            ) as DesktopTokenPayload;
            if (payload.sub) {
                return { userId: payload.sub, activeSessionToken: payload.ast };
            }
        } catch {
            return null;
        }
    }

    return null;
}

export async function GET(req: NextRequest) {
    const auth = await resolveAuth(req);
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const users = db.collection<UserDocument>(USERS_COLLECTION);

        let objectId: ObjectId;
        try {
            objectId = new ObjectId(auth.userId);
        } catch {
            return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
        }

        const user = await users.findOne({ _id: objectId });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Validate single-session: the token's session nonce must match the DB record.
        // Only enforced when both sides have a nonce — desktop tokens without ast skip this.
        if (
            auth.activeSessionToken &&
            user.activeSessionToken &&
            auth.activeSessionToken !== user.activeSessionToken
        ) {
            console.warn(`[/api/user/me] session invalidated for user=${auth.userId}`);
            return NextResponse.json(
                { error: "Session invalidated. Please log in again." },
                { status: 401 }
            );
        }

        const createdAt = user.createdAt != null
            ? (user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt)).toISOString()
            : new Date().toISOString();

        const payload: Record<string, unknown> = {
            id: user._id!.toString(),
            name: user.name ?? "",
            email: user.email ?? "",
            image: user.image ?? null,
            provider: user.provider ?? "email",
            createdAt,
        };

        const dpSecret = process.env.DATA_PLANE_JWT_SECRET?.trim();
        if (dpSecret) {
            const signOpts: jwt.SignOptions = {
                algorithm: "HS256",
                expiresIn: "15m",
            };
            const iss = process.env.DATA_PLANE_JWT_ISSUER?.trim();
            const aud = process.env.DATA_PLANE_JWT_AUDIENCE?.trim();
            if (iss) signOpts.issuer = iss;
            if (aud) signOpts.audience = aud;
            payload.dataPlaneAccessToken = jwt.sign({ sub: auth.userId }, dpSecret, signOpts);
        }

        return NextResponse.json(payload);
    } catch (err) {
        console.error("[/api/user/me GET]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await resolveAuth(req);
    if (!auth) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db();
        const users = db.collection<UserDocument>(USERS_COLLECTION);

        await users.updateOne(
            { _id: new ObjectId(auth.userId) },
            { $set: { name: name.trim(), updatedAt: new Date() } }
        );

        return NextResponse.json({ success: true, name: name.trim() });
    } catch (err) {
        console.error("[/api/user/me PATCH]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
