import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "pgstudio_admin";
const EXPIRY_SECONDS = 8 * 60 * 60; // 8 hours

interface AdminPayload {
    role: "admin";
    iat?: number;
    exp?: number;
}

export function isAdminEnabled(): boolean {
    return process.env.ADMIN_ENABLED === "true";
}

export function signAdminToken(): string {
    return jwt.sign({ role: "admin" }, process.env.NEXTAUTH_SECRET!, {
        expiresIn: EXPIRY_SECONDS,
    });
}

export function verifyAdminToken(token: string): AdminPayload | null {
    try {
        const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as AdminPayload;
        if (payload.role !== "admin") return null;
        return payload;
    } catch {
        return null;
    }
}

/** Read admin token from request cookies. */
export function getAdminTokenFromRequest(req: NextRequest): string | null {
    return req.cookies.get(ADMIN_COOKIE)?.value ?? null;
}

/** Verify admin is authenticated from a request. Returns 401 response if not. */
export function requireAdminAuth(req: NextRequest): NextResponse | null {
    if (!isAdminEnabled()) {
        return NextResponse.json({ error: "Admin panel is disabled" }, { status: 403 });
    }
    const token = getAdminTokenFromRequest(req);
    if (!token || !verifyAdminToken(token)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
}

/** Create a Set-Cookie header value for the admin session. */
export function buildAdminCookie(token: string): string {
    const maxAge = EXPIRY_SECONDS;
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return `${ADMIN_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

/** Create a cookie that clears the admin session. */
export function buildAdminClearCookie(): string {
    return `${ADMIN_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

/** Server-side check using next/headers (for page components). */
export async function isAdminAuthenticated(): Promise<boolean> {
    if (!isAdminEnabled()) return false;
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE)?.value;
    if (!token) return false;
    return verifyAdminToken(token) !== null;
}
