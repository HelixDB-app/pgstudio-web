import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { CampaignBannerContainer } from "@/components/campaign-banner";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "sonner";

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
            <CampaignBannerContainer variant="header" />
            <SiteHeader />
            <div className="pt-16">{children}</div>
            <Toaster position="top-right" richColors />
          </div>
        </Providers>
      </body>
    </html>
  );
}
