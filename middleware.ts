import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { NextRequestWithAuth, withAuth } from "next-auth/middleware";
import { getCorsHeaders } from "@/lib/cors";

export default function middleware(req: NextRequest, event: NextFetchEvent) {
    if (req.nextUrl.pathname.startsWith("/api")) {
        const origin = req.headers.get("origin");
        const headers = getCorsHeaders(origin ?? null);
        if (req.method === "OPTIONS") {
            return new NextResponse(null, { status: 204, headers });
        }
        const res = NextResponse.next();
        Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
        return res;
    }
    return withAuth(function authMiddleware(_req: NextRequestWithAuth) {
        return NextResponse.next();
    }, { pages: { signIn: "/login" } })(req as any, event);
}

export const config = {
    matcher: ["/api/:path*", "/profile/:path*"],
};
