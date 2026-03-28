import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-black py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 text-white font-semibold tracking-tight">
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
        </div>
        <div className="text-sm text-zinc-600 font-light">
          © {new Date().getFullYear()} pgStudio. All rights reserved.
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm text-zinc-500 font-light">
          <Link href="/legal/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/legal/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link href="/support" className="hover:text-white transition-colors">
            Support
          </Link>
          <a href="mailto:support@pgstudio.app" className="hover:text-white transition-colors">
            Email
          </a>
          <a href="#" className="hover:text-white transition-colors">Twitter</a>
          <a href="#" className="hover:text-white transition-colors">GitHub</a>
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
        </div>
      </div>
    </footer>
  );
}
