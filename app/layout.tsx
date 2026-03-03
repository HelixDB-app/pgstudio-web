import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CampaignBanner } from "@/components/campaign-banner";
import { SiteHeader } from "@/components/site-header";
import type { CampaignPublic } from "@/models/Campaign";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pgStudio — PostgreSQL Admin Panel",
  description: "High-performance PostgreSQL desktop client powered by Rust and Next.js",
};

const activeCampaign: CampaignPublic | null = {
  id: "launch-2025",
  title: "Launch Offer — pgStudio for macOS",
  description: "Early adopters get lifetime discount on all future upgrades.",
  discountPercentage: 30,
  badgeText: "LAUNCH",
  posterPath: undefined,
  startDate: new Date().toISOString(),
  endDate: new Date().toISOString(),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <div className="min-h-screen bg-black text-zinc-400 font-sans selection:bg-white/20 overflow-hidden">
            <CampaignBanner campaign={activeCampaign} />
            <SiteHeader />
            <div className="pt-16">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

