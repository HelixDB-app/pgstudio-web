import type { NextResponse } from "next/server";
import { getTrustedBrowserOrigins } from "@/lib/trusted-return-url";

/** Allowed request origins for CORS (Helix web / desktop API clients). */
export function getCorsAllowedOrigins(): string[] {
    return getTrustedBrowserOrigins();
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
    const allowed = getCorsAllowedOrigins();
    const base: Record<string, string> = {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
    };

    if (origin && allowed.includes(origin)) {
        return {
            ...base,
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        };
    }

    // Non-browser or unknown origin: avoid reflecting arbitrary Origin
    return {
        ...base,
        "Access-Control-Allow-Origin": "*",
    };
}

/** Merge CORS headers into a NextResponse. */
export function withCors<T extends NextResponse>(res: T, origin: string | null): T {
    Object.entries(getCorsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
}

/** @deprecated use getCorsAllowedOrigins */
export const CORS_ORIGINS: string[] = getTrustedBrowserOrigins();
