import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { NextRequestWithAuth, withAuth } from "next-auth/middleware";

// Allowed origins for CORS (desktop app dev + production Tauri/web)
const CORS_ORIGINS = [
    "http://localhost:3000", // pgStudio desktop dev (Tauri webview)
    "http://127.0.0.1:3000",
    "https://pgstudio-web.vercel.app"
].concat(
    process.env.NEXT_PUBLIC_WEB_APP_URL
        ? [process.env.NEXT_PUBLIC_WEB_APP_URL.replace(/\/$/, "")]
        : []
);

function corsHeaders(origin: string | null): Record<string, string> {
    const allowOrigin =
        origin && CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0];
    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
    };
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
    if (req.nextUrl.pathname.startsWith("/api")) {
        const origin = req.headers.get("origin");
        const headers = corsHeaders(origin ?? null);
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
