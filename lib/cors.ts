import type { NextResponse } from "next/server";

/** Allowed request origins for CORS (desktop + web). */
export const CORS_ORIGINS: string[] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
].concat(
    process.env.NEXT_PUBLIC_WEB_APP_URL
        ? [process.env.NEXT_PUBLIC_WEB_APP_URL.replace(/\/$/, "")]
        : []
);

export function getCorsHeaders(origin: string | null): Record<string, string> {
    const allowOrigin =
        origin && CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0];
    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
    };
}

/** Merge CORS headers into a NextResponse. */
export function withCors<T extends NextResponse>(
    res: T,
    origin: string | null
): T {
    Object.entries(getCorsHeaders(origin)).forEach(([k, v]) =>
        res.headers.set(k, v)
    );
    return res;
}
