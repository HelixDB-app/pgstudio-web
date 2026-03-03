"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import type { CampaignPublic } from "@/models/Campaign";

interface CampaignBannerProps {
  campaign: CampaignPublic | null;
}

export function CampaignBanner({ campaign }: CampaignBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!campaign || dismissed) {
    return null;
  }

  return (
    <div className="relative overflow-hidden border-b border-primary/20 bg-gradient-to-r from-primary/15 via-primary/8 to-transparent">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          {campaign.posterPath ? (
            <img
              src={campaign.posterPath}
              alt={campaign.title}
              className="h-8 w-8 rounded-md object-cover border border-primary/20 shrink-0"
            />
          ) : (
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {campaign.badgeText && (
              <Badge className="text-[10px] px-1.5 py-0">{campaign.badgeText}</Badge>
            )}
            <span className="text-sm font-medium">{campaign.title}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              — {campaign.description}
            </span>
            {campaign.discountPercentage > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-primary border-primary/30"
              >
                {campaign.discountPercentage}% OFF
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
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

