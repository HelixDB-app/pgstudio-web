"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Database, Loader2, CheckCircle2, AlertCircle, Monitor, Tablet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Stage = "loading" | "validating" | "minting" | "redirecting" | "success" | "error" | "fallback";

function CallbackInner() {
    const { status } = useSession();
    const searchParams = useSearchParams();
    const router = useRouter();

    const source = searchParams.get("source");
    const state = searchParams.get("state");
    const returnToRaw = searchParams.get("return_to");
    const isDesktop = source === "desktop";
    const isWebShell = source === "web";

    const [stage, setStage] = useState<Stage>("loading");
    const [error, setError] = useState<string | null>(null);
    const didRun = useRef(false);

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            router.replace("/login");
            return;
        }

        // Web / iPad / Helix browser shell — validate return URL server-side, then navigate
        if (isWebShell) {
            if (didRun.current) return;
            didRun.current = true;

            async function returnToHelix() {
                if (!returnToRaw?.trim()) {
                    setStage("fallback");
                    router.replace("/profile");
                    return;
                }

                setStage("validating");
                try {
                    const res = await fetch("/api/auth/validate-return-url", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url: returnToRaw }),
                    });
                    const data = (await res.json()) as { url: string | null };
                    const safe = data.url;

                    if (!safe) {
                        setStage("fallback");
                        router.replace("/profile");
                        return;
                    }

                    setStage("minting");
                    const tokRes = await fetch("/api/auth/desktop-token", {
                        method: "POST",
                        credentials: "include",
                    });
                    if (!tokRes.ok) {
                        const body = await tokRes.json().catch(() => ({}));
                        throw new Error(
                            (body as { error?: string }).error ?? `Token error (${tokRes.status})`
                        );
                    }
                    const { token } = (await tokRes.json()) as { token: string };

                    setStage("redirecting");
                    await new Promise((r) => setTimeout(r, 350));

                    // Hash is not sent to the Helix server; Helix stores JWT for Authorization: Bearer
                    // (cross-origin session cookies are not available on fetch from localhost:3000).
                    const dest = new URL(safe);
                    dest.hash = `helix_account_jwt=${encodeURIComponent(token)}`;
                    window.location.href = dest.toString();
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not verify redirect");
                    setStage("error");
                }
            }

            void returnToHelix();
            return;
        }

        if (!isDesktop) {
            router.replace("/profile");
            return;
        }

        if (didRun.current) return;
        didRun.current = true;

        async function redirectToDesktop() {
            setStage("minting");
            try {
                const res = await fetch("/api/auth/desktop-token", {
                    method: "POST",
                    credentials: "include",
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error ?? `Server error (${res.status})`);
                }
                const { token } = await res.json();
                setStage("redirecting");

                const params = new URLSearchParams({ token });
                if (state) params.set("state", state);

                const deepLink = `pgstudio://auth/callback?${params.toString()}`;

                await new Promise((r) => setTimeout(r, 400));

                window.location.href = deepLink;
                setStage("success");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
                setStage("error");
            }
        }

        void redirectToDesktop();
    }, [status, isDesktop, isWebShell, returnToRaw, state, router]);

    const stageLabel: Record<Stage, string> = {
        loading: "Verifying your session…",
        validating: "Securing your return link…",
        minting: "Preparing your secure token…",
        redirecting: "Taking you back to pgStudio…",
        success: "You can close this tab.",
        error: "Something went wrong",
        fallback: "Opening your profile…",
    };

    const showWebVisual = isWebShell && stage !== "error";

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
            <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 shadow-sm">
                    <Database className="h-8 w-8 text-primary" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-xl font-semibold tracking-tight">
                        {stage === "success"
                            ? "Signed in"
                            : isWebShell
                              ? "You're signed in"
                              : "Redirecting…"}
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed">{stageLabel[stage]}</p>
                </div>

                {showWebVisual && stage !== "success" && stage !== "fallback" && (
                    <div className="flex w-full max-w-xs items-stretch gap-3 rounded-xl border border-border/60 bg-card/60 p-4 text-left shadow-sm">
                        <div className="flex flex-1 flex-col items-center gap-2 rounded-lg bg-muted/40 py-3">
                            <Monitor className="h-5 w-5 text-primary" aria-hidden />
                            <span className="text-[11px] font-medium text-muted-foreground">Browser</span>
                        </div>
                        <div className="flex items-center text-muted-foreground/50">
                            <ArrowRight className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="flex flex-1 flex-col items-center gap-2 rounded-lg bg-muted/40 py-3">
                            <Tablet className="h-5 w-5 text-primary" aria-hidden />
                            <span className="text-[11px] font-medium text-muted-foreground">iPad</span>
                        </div>
                    </div>
                )}

                {stage === "error" ? (
                    <div className="flex w-full flex-col gap-3">
                        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => router.replace("/profile")}>
                            Go to profile
                        </Button>
                    </div>
                ) : stage === "success" ? (
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" aria-hidden />
                ) : (
                    <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
                )}

                {isDesktop && stage !== "success" && stage !== "error" && (
                    <p className="max-w-xs text-xs text-muted-foreground leading-relaxed">
                        pgStudio will open automatically. If it doesn&apos;t,{" "}
                        <button
                            type="button"
                            className="underline underline-offset-2 hover:text-foreground"
                            onClick={() => router.replace("/profile")}
                        >
                            go to your profile
                        </button>
                        .
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
