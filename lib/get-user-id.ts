/**
 * Resolves the authenticated user ID from either:
 * 1. NextAuth session cookie (web app)
 * 2. Bearer JWT minted by /api/auth/desktop-token (desktop app)
 */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import jwt from "jsonwebtoken";

interface DesktopTokenPayload {
    sub: string;
    ast?: string;
    [key: string]: unknown;
}

export async function getUserId(req: NextRequest): Promise<string | null> {
    // 1. Try NextAuth session cookie first
    const sessionToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (sessionToken?.id) {
        return sessionToken.id as string;
    }

    // 2. Fall back to Bearer JWT from desktop app
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const bearerToken = authHeader.slice(7);
        try {
            const payload = jwt.verify(bearerToken, process.env.NEXTAUTH_SECRET!) as DesktopTokenPayload;
            if (payload.sub) return payload.sub;
        } catch {
            return null;
        }
    }

    return null;
}
