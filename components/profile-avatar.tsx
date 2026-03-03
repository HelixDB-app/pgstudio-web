"use client";

import Image from "next/image";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
  "2xl": 80,
} as const;

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export interface ProfileAvatarProps {
  /** Google or other provider profile image URL */
  imageUrl?: string | null;
  /** Display name for initials fallback */
  name?: string | null;
  size?: keyof typeof SIZE_MAP;
  /** Optional: use explicit pixel size (overrides size) */
  width?: number;
  height?: number;
  className?: string;
  /** Prefer showing image (avoid flash of initials when image loads) */
  priority?: boolean;
}

/**
 * Profile avatar that loads and caches Google (and other) profile images via Next.js Image.
 * Uses referrerPolicy="no-referrer" so Google URLs load reliably; Next.js caches optimized images.
 */
export function ProfileAvatar({
  imageUrl,
  name,
  size = "md",
  width: widthProp,
  height: heightProp,
  className,
  priority = false,
}: ProfileAvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const px = widthProp ?? SIZE_MAP[size];
  const py = heightProp ?? SIZE_MAP[size];
  const initials = getInitials(name);
  const showImage = Boolean(imageUrl && !error);
  const imageSrc = imageUrl ?? "";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center text-muted-foreground select-none",
        className
      )}
      style={{ width: px, height: py }}
    >
      {showImage && imageSrc ? (
        <>
          {!loaded && (
            <span
              className="absolute inset-0 flex items-center justify-center text-xs font-semibold bg-primary/10 text-primary"
              style={{ fontSize: Math.max(10, px * 0.4) }}
            >
              {initials}
            </span>
          )}
          <Image
            src={imageSrc}
            alt={name ? `${name} profile` : "Profile"}
            width={px}
            height={py}
            className={cn(
              "object-cover rounded-full transition-opacity duration-200",
              loaded ? "opacity-100" : "opacity-0"
            )}
            style={{ width: px, height: py }}
            referrerPolicy="no-referrer"
            priority={priority}
            unoptimized={false}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        </>
      ) : (
        <span
          className="font-semibold bg-primary/10 text-primary"
          style={{ fontSize: Math.max(10, px * 0.4) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
