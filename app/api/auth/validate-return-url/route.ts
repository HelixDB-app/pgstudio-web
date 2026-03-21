import { NextRequest, NextResponse } from "next/server";
import { sanitizeReturnUrl } from "@/lib/trusted-return-url";
import { getCorsHeaders } from "@/lib/cors";

/**
 * POST { "url": "https://..." } → { "url": "<sanitized>" | null }
 * Used by /auth/callback before window.location to prevent open redirects.
 */
export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get("origin");
    return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) });
}

export async function POST(req: NextRequest) {
    const origin = req.headers.get("origin");
    const cors = getCorsHeaders(origin);

    try {
        const body = (await req.json()) as { url?: unknown };
        const candidate = typeof body.url === "string" ? body.url : "";
        const safe = sanitizeReturnUrl(candidate || null);
        const res = NextResponse.json({ url: safe });
        Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
        return res;
    } catch {
        const res = NextResponse.json({ url: null }, { status: 400 });
        Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
        return res;
    }
}
