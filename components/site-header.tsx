"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { Bug, Database, Download, LifeBuoy, LogOut, User } from "lucide-react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useSession, signOut } from "next-auth/react";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Image from "next/image";

gsap.registerPlugin(ScrollToPlugin);

export function SiteHeader() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    e.preventDefault();

    const scrollToSection = () => {
      gsap.to(window, {
        duration: 1,
        scrollTo: { y: target, offsetY: 64 },
        ease: "power3.inOut",
      });
    };

    if (pathname !== "/") {
      router.push("/");
      setTimeout(scrollToSection, 100);
    } else {
      scrollToSection();
    }
  };

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={cn("fixed top-14 w-full z-50 border-b border-white/5 duration-300 ease-in-out bg-black/50 backdrop-blur-xl", scrollY > 14 ? "top-0" : "top-14")}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-white font-semibold text-lg tracking-tight hover:opacity-90 transition-opacity shrink-0"
          aria-label="pgStudio home"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden">
            <Image
              src="/logo/logo.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </span>
          <span>pgStudio</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
          <a
            href="#speed"
            onClick={(e) => handleScroll(e, "#speed")}
            className="hover:text-white transition-colors"
          >
            Speed
          </a>
          <a
            href="#features"
            onClick={(e) => handleScroll(e, "#features")}
            className="hover:text-white transition-colors"
          >
            Features
          </a>
          <a
            href="#ai"
            onClick={(e) => handleScroll(e, "#ai")}
            className="hover:text-white transition-colors"
          >
            AI
          </a>
          <Link href="/changelog" className="hover:text-white transition-colors">
            Changelog
          </Link>
          <Link href="/support" className="hover:text-white transition-colors">
            Support
          </Link>
          <Link href="/report-bug" className="hover:text-white transition-colors">
            Report a Bug
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {status === "authenticated" && session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:border-white/30 transition-colors">
                  <ProfileAvatar
                    imageUrl={session.user.image}
                    name={session.user.name}
                    size="sm"
                    priority
                  />
                  <div className="flex flex-col items-start">
                    <span className="text-xs text-white leading-tight max-w-[120px] truncate">
                      {session.user.name ?? "Account"}
                    </span>
                    <span className="text-[10px] text-zinc-400 leading-tight max-w-[140px] truncate">
                      {session.user.email}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-3">
                  <ProfileAvatar
                    imageUrl={session.user.image}
                    name={session.user.name}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">
                      {session.user.name ?? "Account"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {session.user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>View profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/support" className="flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4" />
                    <span>Support</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/report-bug" className="flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    <span>Report a bug</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  data-variant="destructive"
                  className="text-red-500 focus:bg-red-500/10 focus:text-red-500"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            ) : status !== "loading" ? (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:border-white/30 transition-colors"
            >
              Log in
            </Link>
          ) : null}

          <button className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>
    </header>
  );
}
