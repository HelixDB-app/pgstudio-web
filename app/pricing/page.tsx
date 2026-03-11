"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
    Check, Zap, Database, ChevronRight, Loader2, Star,
    MessageSquare, Calendar, X, ArrowLeft, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PlanPublic } from "@/models/Plan";
import type { CampaignPublic } from "@/models/Campaign";

function formatPrice(cents: number, currency: string) {
    if (cents === 0) return "Free";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: 0,
    }).format(cents / 100);
}

function discordLabel(access: string) {
    if (access === "2days") return "2-Day Discord Access";
    if (access === "4days") return "4-Day Discord Access";
    return null;
}

function CampaignBanner({ campaign }: { campaign: CampaignPublic }) {
    const [visible, setVisible] = useState(true);
    if (!visible) return null;
    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {campaign.posterPath ? (
                        <img
                            src={campaign.posterPath}
                            alt={campaign.title}
                            className="h-12 w-12 rounded-lg object-cover border border-primary/20 shrink-0"
                        />
                    ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 shrink-0">
                            <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{campaign.title}</p>
                            {campaign.badgeText && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
                                    {campaign.badgeText}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{campaign.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {campaign.discountPercentage > 0 && (
                        <div className="text-center">
                            <p className="text-2xl font-bold text-primary">{campaign.discountPercentage}%</p>
                            <p className="text-xs text-muted-foreground">OFF</p>
                        </div>
                    )}
                    <button
                        onClick={() => setVisible(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function PlanCard({
    plan,
    onSubscribe,
    loadingPlanId,
    campaign,
}: {
    plan: PlanPublic;
    onSubscribe: (planId: string) => void;
    loadingPlanId: string | null;
    campaign: CampaignPublic | null;
}) {
    const isFree = plan.price === 0;
    const isLoading = loadingPlanId === plan.id;
    const discountedPrice = campaign && campaign.discountPercentage > 0 && !isFree
        ? Math.round(plan.price * (1 - campaign.discountPercentage / 100))
        : null;

    return (
        <Card className={`relative flex flex-col border-border/50 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 ${plan.isFeatured ? "border-primary/50 ring-1 ring-primary/30 bg-gradient-to-b from-primary/5 to-card" : ""}`}>
            {plan.isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="flex items-center gap-1 px-3 shadow-lg">
                        <Star className="h-3 w-3" />
                        {plan.promoTag || "Most Popular"}
                    </Badge>
                </div>
            )}
            {!plan.isFeatured && plan.promoTag && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary" className="px-3 shadow-sm">{plan.promoTag}</Badge>
                </div>
            )}
            <CardHeader className="pb-4 pt-7">
                <div className="space-y-1">
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <div className="flex items-baseline gap-2">
                        {discountedPrice !== null ? (
                            <>
                                <span className="text-3xl font-extrabold text-primary">
                                    {formatPrice(discountedPrice, plan.currency)}
                                </span>
                                <span className="text-sm text-muted-foreground line-through">
                                    {formatPrice(plan.price, plan.currency)}
                                </span>
                            </>
                        ) : (
                            <span className={`text-3xl font-extrabold ${isFree ? "" : "text-primary"}`}>
                                {formatPrice(plan.price, plan.currency)}
                            </span>
                        )}
                        {!isFree && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {plan.durationDays}d
                            </div>
                        )}
                    </div>
                    {plan.discount && !discountedPrice && (
                        <p className="text-xs text-primary font-medium">{plan.discount}% discount applied</p>
                    )}
                </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 pt-4 space-y-3">
                <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                        </li>
                    ))}
                </ul>
                {discordLabel(plan.discordAccess) && (
                    <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        {discordLabel(plan.discordAccess)}
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-2 pb-5">
                {isFree ? (
                    <Button variant="outline" className="w-full" asChild>
                        <Link href="/login">
                            Get Started Free
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                    </Button>
                ) : (
                    <Button
                        className={`w-full ${plan.isFeatured ? "bg-primary hover:bg-primary/90" : ""}`}
                        onClick={() => onSubscribe(plan.id)}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Subscribe Now
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

export default function PricingPage() {
    const { data: session, status } = useSession();
    const [plans, setPlans] = useState<PlanPublic[]>([]);
    const [campaign, setCampaign] = useState<CampaignPublic | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            fetch("/api/plans").then((r) => r.json()),
            fetch("/api/campaigns/active").then((r) => r.json()),
        ]).then(([plansData, campaignData]) => {
            setPlans(Array.isArray(plansData) ? plansData : []);
            setCampaign(campaignData);
        }).finally(() => setLoading(false));
    }, []);

    async function handleSubscribe(planId: string) {
        if (status !== "authenticated") {
            window.location.href = `/login?callbackUrl=/pricing`;
            return;
        }
        setLoadingPlanId(planId);
        setCheckoutError(null);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId }),
            });
            const data = await res.json();
            if (res.ok && data.url) {
                window.location.href = data.url;
            } else {
                setCheckoutError(data.error || "Failed to start checkout");
            }
        } catch {
            setCheckoutError("Network error. Please try again.");
        } finally {
            setLoadingPlanId(null);
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="mx-auto max-w-6xl px-4 py-16">
                {/* Hero */}
                <div className="text-center mb-14">
                    <Badge variant="outline" className="mb-4 gap-1.5 px-3 py-1 text-xs">
                        <Zap className="h-3 w-3 text-primary" />
                        Flexible Plans
                    </Badge>
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                        Start free, upgrade when you need more. All plans include core PostgreSQL management features.
                    </p>
                </div>

                {/* Campaign Banner */}
                {campaign && <CampaignBanner campaign={campaign} />}

                {/* Error */}
                {checkoutError && (
                    <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                        <X className="h-4 w-4 shrink-0" />
                        {checkoutError}
                    </div>
                )}

                {/* Plans Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : plans.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>No plans available yet. Check back soon.</p>
                    </div>
                ) : (
                    <div className={`grid gap-6 ${plans.length <= 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" : plans.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
                        {plans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                onSubscribe={handleSubscribe}
                                loadingPlanId={loadingPlanId}
                                campaign={campaign}
                            />
                        ))}
                    </div>
                )}

                {/* FAQ / Notes */}
                <div className="mt-16 text-center space-y-3">
                    <Separator className="mb-8" />
                    <p className="text-sm text-muted-foreground">
                        All payments are processed securely via{" "}
                        <span className="text-foreground font-medium">Stripe</span>.
                        Subscriptions are one-time purchases valid for the specified number of days.
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                        Questions? Contact us at{" "}
                        <a href="mailto:support@pgstudio.app" className="text-primary hover:underline">
                            support@pgstudio.app
                        </a>
                    </p>
                </div>
            </main>
        </div>
    );
}
