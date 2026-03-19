import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[60vh] overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to home
        </Link>
        <div className="prose prose-invert prose-zinc max-w-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-white [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-zinc-200 [&_h2]:mt-8 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-zinc-300 [&_h3]:mt-6 [&_p]:text-zinc-400 [&_p]:text-sm [&_p]:leading-relaxed [&_ul]:text-zinc-400 [&_ul]:text-sm [&_li]:my-1">
          {children}
        </div>
      </div>
    </div>
  );
}
