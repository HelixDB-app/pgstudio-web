"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Database, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Stage = "loading" | "minting" | "redirecting" | "success" | "error";

function CallbackInner() {
    const { status } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();

    const source = searchParams.get("source");
    const state = searchParams.get("state");
    const isDesktop = source === "desktop";

    const [stage, setStage] = useState<Stage>("loading");
    const [error, setError] = useState<string | null>(null);
    // Guard against double-execution (React StrictMode / hot reload)
    const didRun = useRef(false);

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            router.replace("/login");
            return;
        }

        if (!isDesktop) {
            // Web flow — just redirect to profile
            router.replace("/profile");
            return;
        }

        // Desktop flow — mint a desktop JWT and open the deep link.
        // Guard prevents this running twice in React StrictMode.
        if (didRun.current) return;
        didRun.current = true;

        async function redirectToDesktop() {
            setStage("minting");
            try {
                const res = await fetch("/api/auth/desktop-token", { method: "POST" });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error ?? `Server error (${res.status})`);
                }
                const { token } = await res.json();
                setStage("redirecting");

                const params = new URLSearchParams({ token });
                if (state) params.set("state", state);

                const deepLink = `pgstudio://auth/callback?${params.toString()}`;

                // Brief delay so the user sees the "redirecting" stage
                await new Promise((r) => setTimeout(r, 400));

                window.location.href = deepLink;
                setStage("success");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
                setStage("error");
            }
        }

        redirectToDesktop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, isDesktop]);

    const stageLabel: Record<Stage, string> = {
        loading: "Verifying your session…",
        minting: "Preparing your secure token…",
        redirecting: "Launching pgStudio desktop…",
        success: "You can close this tab.",
        error: "Something went wrong",
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
            <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                    <Database className="h-7 w-7 text-primary" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-xl font-semibold">
                        {stage === "success" ? "Signed In Successfully" : "Redirecting…"}
                    </h1>
                    <p className="text-sm text-muted-foreground">{stageLabel[stage]}</p>
                </div>

                {stage === "error" ? (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                ) : stage === "success" ? (
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                ) : (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                )}

                {isDesktop && stage !== "success" && stage !== "error" && (
                    <p className="max-w-xs text-xs text-muted-foreground">
                        pgStudio will open automatically. If it doesn&apos;t,{" "}
                        <button
                            className="underline underline-offset-2 hover:text-foreground"
                            onClick={() => router.replace("/profile")}
                        >
                            go to your profile
                        </button>{" "}
                        instead.
                    </p>
                )}
            </div>
        </div>
    );
}

export default function CallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <CallbackInner />
        </Suspense>
    );
}
