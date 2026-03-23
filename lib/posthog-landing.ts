/**
 * PostHog for pgstudio-web (marketing site): pageviews, heatmaps, user identification.
 * Server-only mirror stays in posthog-mirror.ts (API logs).
 */

import posthog from "posthog-js";

let ready = false;

export function isPosthogLandingConfigured(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim());
}

export function isPosthogLandingReady(): boolean {
    return ready;
}

/** Idempotent client init — heatmaps + SPA pageviews (no automatic pageview). */
export function initPosthogLanding(): void {
    if (typeof window === "undefined" || ready) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
    if (!key) return;
    if (
        process.env.NODE_ENV === "development" &&
        process.env.NEXT_PUBLIC_POSTHOG_ENABLE_DEV !== "true"
    ) {
        return;
    }

    posthog.init(key, {
        api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
        capture_pageview: false,
        capture_pageleave: true,
        capture_heatmaps: true,
        disable_session_recording: true,
        persistence: "localStorage",
        person_profiles: "identified_only",
        autocapture: true,
        logs: {
            captureConsoleLogs: false,
        },
    });

    posthog.register({
        site_section: "pgstudio_web_marketing",
    });

    ready = true;
}

export { posthog };
