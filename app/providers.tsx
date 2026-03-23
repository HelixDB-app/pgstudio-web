"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";

import { PosthogLandingProvider } from "@/components/posthog-provider";
import {
    PosthogIdentify,
    PosthogPageView,
} from "@/components/posthog-analytics";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <PosthogLandingProvider>
                <Suspense fallback={null}>
                    <PosthogPageView />
                </Suspense>
                <PosthogIdentify />
                {children}
            </PosthogLandingProvider>
        </SessionProvider>
    );
}
