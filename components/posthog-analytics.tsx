"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import {
    initPosthogLanding,
    isPosthogLandingConfigured,
    isPosthogLandingReady,
    posthog,
} from "@/lib/posthog-landing";

/**
 * SPA pageviews + query string, for funnels and visit counts on App Router.
 */
export function PosthogPageView() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastUrl = useRef<string | null>(null);

    useEffect(() => {
        if (!isPosthogLandingConfigured()) return;
        initPosthogLanding();
        if (!isPosthogLandingReady()) return;

        const search = searchParams.toString();
        const url = `${window.location.origin}${pathname}${search ? `?${search}` : ""}`;
        if (lastUrl.current === url) return;
        lastUrl.current = url;

        posthog.capture("$pageview", {
            $current_url: url,
            path: pathname,
        });
    }, [pathname, searchParams]);

    return null;
}

/**
 * Links anonymous heatmaps/pageviews to logged-in users when session exists.
 */
export function PosthogIdentify() {
    const { data: session, status } = useSession();
    const prevId = useRef<string | null>(null);

    useEffect(() => {
        if (!isPosthogLandingConfigured()) return;
        initPosthogLanding();
        if (!isPosthogLandingReady()) return;

        if (status === "loading") return;

        const user = session?.user as
            | { id?: string; email?: string | null; name?: string | null }
            | undefined;

        if (!user?.id) {
            if (prevId.current) {
                posthog.reset();
                prevId.current = null;
            }
            return;
        }

        if (prevId.current === user.id) return;
        prevId.current = user.id;

        posthog.identify(user.id, {
            email: user.email ?? undefined,
            name: user.name ?? undefined,
        });
    }, [session, status]);

    return null;
}
