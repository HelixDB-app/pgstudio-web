import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import type { UserDocument } from "@/models/User";
import { USERS_COLLECTION } from "@/models/User";
import { ObjectId } from "mongodb";

const FORTY_DAYS_SECONDS = 40 * 24 * 60 * 60;

/**
 * POST /api/auth/desktop-token
 * Called by the auth/callback page (after successful NextAuth sign-in) to mint
 * a long-lived JWT for the desktop app to store in the OS keychain.
 * The request must carry the NextAuth session cookie.
 */
export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();
        const users = db.collection<UserDocument>(USERS_COLLECTION);
        const user = await users.findOne({ _id: new ObjectId(token.id as string) });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Mint a desktop JWT that embeds the activeSessionToken for server-side validation
        const desktopToken = jwt.sign(
            {
                sub: user._id!.toString(),
                name: user.name,
                email: user.email,
                image: user.image ?? null,
                provider: user.provider,
                ast: user.activeSessionToken, // activeSessionToken
            },
            process.env.NEXTAUTH_SECRET!,
            { expiresIn: FORTY_DAYS_SECONDS }
        );

        return NextResponse.json({ token: desktopToken });
    } catch (err) {
        console.error("[/api/auth/desktop-token]", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
