/**
 * Allowed post-login redirects for Helix / pgStudio web shell (localhost, iPad Safari, deployed UI).
 * Server-only env: AUTH_TRUSTED_RETURN_ORIGINS (comma-separated URLs or origins).
 * Client-visible duplicate for UI hints: NEXT_PUBLIC_TRUSTED_RETURN_ORIGINS (optional).
 */

function parseOriginList(raw: string | undefined): string[] {
    if (!raw?.trim()) return [];
    const out: string[] = [];
    for (const part of raw.split(",")) {
        const s = part.trim();
        if (!s) continue;
        try {
            const u = new URL(s.includes("://") ? s : `https://${s}`);
            out.push(u.origin);
        } catch {
            /* skip invalid */
        }
    }
    return out;
}

/** Origins allowed for CORS + return URL validation (server). */
export function getTrustedBrowserOrigins(): string[] {
    const set = new Set<string>([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]);
    for (const o of parseOriginList(process.env.AUTH_TRUSTED_RETURN_ORIGINS)) {
        set.add(o);
    }
    const legacy = process.env.NEXT_PUBLIC_WEB_APP_URL?.replace(/\/$/, "");
    if (legacy) set.add(legacy);
    return [...set];
}

function isLocalDevHostname(hostname: string): boolean {
    return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Validate an absolute URL for safe external redirect (open-redirect safe).
 * In development, any http port on localhost / 127.0.0.1 is allowed.
 */
export function sanitizeReturnUrl(raw: string | null | undefined): string | null {
    if (!raw?.trim()) return null;
    let u: URL;
    try {
        u = new URL(raw.trim());
    } catch {
        return null;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.username || u.password) return null;

    const origin = u.origin;
    const trusted = getTrustedBrowserOrigins();

    if (trusted.includes(origin)) {
        return u.toString();
    }

    if (process.env.NODE_ENV === "development" && isLocalDevHostname(u.hostname)) {
        return u.toString();
    }

    return null;
}
