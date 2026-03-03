"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    CheckCircle2, Loader2, Calendar, MessageSquare,
    Crown, ArrowRight, Database, Sparkles, AlertCircle, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { SubscriptionPublic } from "@/models/Subscription";

function discordLabel(access: string) {
    if (access === "2days") return "2-Day Discord Access";
    if (access === "4days") return "4-Day Discord Access";
    return null;
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 8;

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get("session_id");

    const [phase, setPhase] = useState<"confirming" | "success" | "timeout" | "error">("confirming");
    const [subscription, setSubscription] = useState<SubscriptionPublic | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const pollCount = useRef(0);

    const confirmPayment = useCallback(async (): Promise<boolean> => {
        if (!sessionId) return false;
        const res = await fetch("/api/payment/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.subscription) {
            setSubscription(data.subscription);
            setPhase("success");
            return true;
        }

        if (res.status === 400 && data.code === "payment_pending") {
            return false; // caller may poll
        }

        setErrorMessage(data.error || "Something went wrong. Please try again.");
        setPhase("error");
        return false;
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) {
            router.replace("/pricing");
            return;
        }

        let cancelled = false;
        let pollTimer: ReturnType<typeof setInterval> | null = null;

        (async () => {
            const done = await confirmPayment();
            if (cancelled || done) return;

            pollCount.current = 0;
            pollTimer = setInterval(async () => {
                if (cancelled) return;
                pollCount.current += 1;
                try {
                    const res = await fetch("/api/subscription/status");
                    if (res.ok) {
                        const d = await res.json();
                        if (d.subscription?.status === "active") {
                            setSubscription(d.subscription);
                            setPhase("success");
                            if (pollTimer) clearInterval(pollTimer);
                            return;
                        }
                    }
                } catch { /* ignore */ }
                if (pollCount.current >= MAX_POLLS) {
                    setPhase("timeout");
                    if (pollTimer) clearInterval(pollTimer);
                }
            }, POLL_INTERVAL_MS);
        })();

        return () => {
            cancelled = true;
            if (pollTimer) clearInterval(pollTimer);
        };
    }, [sessionId, router, confirmPayment]);

    const handleRetry = async () => {
        setPhase("confirming");
        setErrorMessage(null);
        setIsRetrying(true);
        const done = await confirmPayment();
        setIsRetrying(false);
        if (!done) {
            setPhase("error");
            setErrorMessage("Still couldn't confirm. Check your profile or contact support.");
        }
    };

    if (phase === "confirming") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
                <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                        <Database className="h-10 w-10 text-primary" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-background bg-card p-1.5">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                </div>
                <div className="text-center space-y-1">
                    <h2 className="text-xl font-semibold">Confirming your payment</h2>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Verifying with Stripe and activating your subscription. This usually takes a few seconds.
                    </p>
                </div>
                <div className="flex gap-1.5" aria-hidden>
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse"
                            style={{ animationDelay: `${i * 120}ms` }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (phase === "timeout") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
                <div className="rounded-full border border-amber-500/30 bg-amber-500/10 p-4">
                    <AlertCircle className="h-10 w-10 text-amber-500" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Taking longer than usual</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Your payment was successful. Your subscription may still be activating — check your profile in a moment, or contact us if it doesn’t update.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button asChild>
                        <Link href="/profile">Go to Profile</Link>
                    </Button>
                    <Button variant="outline" onClick={handleRetry} disabled={isRetrying}>
                        {isRetrying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Check again
                    </Button>
                </div>
                <a href="mailto:support@pgstudio.app" className="text-xs text-muted-foreground hover:text-primary">
                    support@pgstudio.app
                </a>
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
                <div className="rounded-full border border-destructive/30 bg-destructive/10 p-4">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Couldn’t confirm payment</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        {errorMessage}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleRetry} disabled={isRetrying}>
                        {isRetrying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Retry
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/profile">Go to Profile</Link>
                    </Button>
                </div>
                <a href="mailto:support@pgstudio.app" className="text-xs text-muted-foreground hover:text-primary">
                    Contact support
                </a>
            </div>
        );
    }

    if (phase !== "success" || !subscription) return null;

    const expiryDate = new Date(subscription.endDate).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });
    const discord = discordLabel(subscription.discordAccess);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-primary/10 mb-4">
                        <CheckCircle2 className="h-10 w-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Payment successful</h1>
                    <p className="text-muted-foreground text-sm">
                        Your subscription is active. Welcome to {subscription.planName}!
                    </p>
                </div>

                <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-card">
                    <CardContent className="pt-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Plan</span>
                            <Badge className="flex items-center gap-1">
                                <Crown className="h-3 w-3" />
                                {subscription.planName}
                            </Badge>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                Expires
                            </span>
                            <span className="font-medium">{expiryDate}</span>
                        </div>
                        {discord && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Discord
                                </span>
                                <span className="font-medium text-primary">{discord}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Amount paid</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: subscription.paymentCurrency.toUpperCase(),
                                }).format(subscription.paymentAmount / 100)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-2">
                    <Button className="w-full gap-2" asChild>
                        <Link href="/profile">
                            View my profile
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Button variant="ghost" className="w-full text-muted-foreground" asChild>
                        <Link href="/">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Back to home
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

function PaymentSuccessFallback() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
            <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                    <Database className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 rounded-full border-2 border-background bg-card p-1.5">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
            </div>
            <div className="text-center space-y-1">
                <h2 className="text-xl font-semibold">Loading…</h2>
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<PaymentSuccessFallback />}>
            <PaymentSuccessContent />
        </Suspense>
    );
}
