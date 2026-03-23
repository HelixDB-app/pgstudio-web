"use client";

import { useEffect } from "react";
import { PostHogProvider } from "posthog-js/react";

import { initPosthogLanding, posthog } from "@/lib/posthog-landing";

export function PosthogLandingProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    useEffect(() => {
        initPosthogLanding();
    }, []);

    return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
