"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Timer, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CampaignPublic } from "@/models/Campaign";
import { useCountdown } from "@/lib/use-countdown";

interface CampaignBannerProps {
  campaign: CampaignPublic | null;
  eligible?: boolean | null;
  variant?: "header" | "pricing";
}

export function CampaignBanner({ campaign, eligible, variant = "header" }: CampaignBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const countdown = useCountdown(campaign?.endDate);

  const timeLabel = useMemo(() => {
    if (!campaign || countdown.expired) return "Ending soon";
    const pad = (v: number) => String(v).padStart(2, "0");
    if (countdown.days > 0) {
      return `${countdown.days}d ${pad(countdown.hours)}h ${pad(countdown.minutes)}m`;
    }
    return `${pad(countdown.hours)}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`;
  }, [campaign, countdown]);

  if (!campaign || dismissed || eligible === false || countdown.expired) {
    return null;
  }

  const isPricing = variant === "pricing";
  const borderClass = isPricing ? "border border-primary/20 rounded-2xl" : "border-b border-primary/20";

  return (
    <div
      className={`relative overflow-hidden ${borderClass} bg-gradient-to-r from-primary/15 via-primary/10 to-transparent`}
    >
      <div className={`${isPricing ? "px-6 py-5" : "mx-auto max-w-6xl px-4 py-3"} flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          {campaign.posterPath ? (
            <img
              src={campaign.posterPath}
              alt={campaign.title}
              className={`${isPricing ? "h-12 w-12" : "h-8 w-8"} rounded-md object-cover border border-primary/20 shrink-0`}
            />
          ) : (
            <div className={`${isPricing ? "h-12 w-12" : "h-8 w-8"} rounded-md bg-primary/15 flex items-center justify-center shrink-0`}>
              <Sparkles className={`${isPricing ? "h-6 w-6" : "h-4 w-4"} text-primary`} />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              {campaign.badgeText && (
                <Badge className="text-[10px] px-1.5 py-0">{campaign.badgeText}</Badge>
              )}
              {campaign.firstTimeOnly && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                  First-time only
                </Badge>
              )}
              <span className={`${isPricing ? "text-base" : "text-sm"} font-semibold`}>{campaign.title}</span>
              {campaign.discountPercentage > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 text-primary border-primary/30"
                >
                  {campaign.discountPercentage}% OFF
                </Badge>
              )}
            </div>
            <span className={`${isPricing ? "text-sm" : "text-xs"} text-muted-foreground`}>
              {campaign.description}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Timer className="h-3 w-3" />
              Ends in <span className="font-mono text-foreground">{timeLabel}</span>
              {campaign.couponCode && (
                <span className="ml-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  Use code {campaign.couponCode}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant={isPricing ? "default" : "outline"} className="h-7 text-xs" asChild>
            <Link href="/pricing">View Offer</Link>
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss promotion"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CampaignBannerContainer({ variant = "header" }: { variant?: "header" | "pricing" }) {
  const [campaign, setCampaign] = useState<CampaignPublic | null>(null);
  const [eligible, setEligible] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/campaigns/active")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data && typeof data === "object" && "campaign" in data) {
          setCampaign(data.campaign ?? null);
          setEligible(typeof data.eligible === "boolean" ? data.eligible : null);
        } else {
          setCampaign(data ?? null);
          setEligible(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCampaign(null);
          setEligible(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <CampaignBanner campaign={campaign} eligible={eligible} variant={variant} />;
}
