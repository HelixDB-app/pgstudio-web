'use client';
import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Sparkles, ArrowRight, CheckCircle2, Wrench, Bug } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const RELEASES = [
  {
    version: "v2.0.4",
    date: "October 24, 2023",
    badge: "Latest",
    title: "Schema Designer AI & Performance Boosts",
    image: "https://picsum.photos/seed/pgstudio1/1200/600?blur=2",
    description: "This release introduces the highly anticipated Schema Designer AI, allowing you to generate complete database schemas from natural language descriptions. We've also significantly improved the performance of the virtualized data grid.",
    features: [
      "Schema Designer AI: Generate tables, columns, and foreign keys from text.",
      "Data Grid: 40% faster rendering for result sets over 100k rows.",
      "SQL Editor: Added inline error hints for syntax mistakes."
    ],
    fixes: [
      "Fixed an issue where the connection pool would occasionally drop.",
      "Resolved a UI glitch in the dark mode toggle."
    ]
  },
  {
    version: "v2.0.0",
    date: "September 12, 2023",
    badge: "Major",
    title: "The Native macOS Rewrite",
    image: "https://picsum.photos/seed/pgstudio2/1200/600?blur=2",
    description: "We've completely rewritten pgStudio from the ground up using Rust and Tauri. This means no more Electron bloat, instant startup times, and a native macOS feel.",
    features: [
      "Rust Core: Memory usage reduced by 80%.",
      "Zero-Trust Security: All credentials are now encrypted on-device using the Secure Enclave.",
      "Command Palette: Hit ⌘K to access any action instantly."
    ],
    fixes: []
  },
  {
    version: "v1.4.2",
    date: "August 05, 2023",
    badge: "",
    title: "Query Plan Visualizer",
    image: "https://picsum.photos/seed/pgstudio3/1200/600?blur=2",
    description: "Understanding slow queries is now easier than ever. The new Query Plan Visualizer takes EXPLAIN ANALYZE output and turns it into an interactive node graph.",
    features: [
      "Visual EXPLAIN: See exactly where your query is spending time.",
      "Index Recommendations: Get AI-powered suggestions for missing indexes."
    ],
    fixes: [
      "Fixed a crash when exporting large CSV files."
    ]
  }
];

export default function Changelog() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Hero animation
    gsap.from(".changelog-hero", {
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.15,
      ease: "power3.out",
      delay: 0.1
    });

    // Release items animation
    const releases = gsap.utils.toArray(".release-item");
    releases.forEach((release: any) => {
      gsap.from(release, {
        scrollTrigger: {
          trigger: release,
          start: "top 85%",
        },
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out"
      });
    });

    // Image parallax
    const images = gsap.utils.toArray(".release-image");
    images.forEach((img: any) => {
      gsap.fromTo(img, 
        { scale: 1.05 },
        {
          scrollTrigger: {
            trigger: img,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
          scale: 1,
          ease: "none"
        }
      );
    });

  }, { scope: container });

  return (
    <div ref={container} className="pt-32 pb-24 min-h-screen">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-24">
        <div className="changelog-hero inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-zinc-300 text-xs font-medium mb-8 border border-white/10 backdrop-blur-sm">
          <Sparkles className="w-3 h-3" />
          <span>Updates & Improvements</span>
        </div>
        <h1 className="changelog-hero text-5xl md:text-7xl font-medium text-white tracking-tighter mb-6">
          Release Notes
        </h1>
        <p className="changelog-hero text-xl text-zinc-500 font-light">
          Everything new in pgStudio. We ship fast and often.
        </p>
      </div>

      {/* Timeline */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="space-y-32">
          {RELEASES.map((release, idx) => (
            <div key={idx} className="release-item relative flex flex-col md:flex-row gap-8 md:gap-16">
              
              {/* Left Column: Meta */}
              <div className="md:w-1/4 shrink-0 md:sticky top-32 h-fit">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-medium text-white">{release.version}</h2>
                  {release.badge && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-white/10 text-white border border-white/10">
                      {release.badge}
                    </span>
                  )}
                </div>
                <div className="text-zinc-500 font-mono text-sm">{release.date}</div>
              </div>

              {/* Right Column: Content */}
              <div className="md:w-3/4">
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] mb-8 aspect-video relative">
                  <img 
                    src={release.image} 
                    alt={release.title} 
                    className="release-image w-full h-full object-cover opacity-80"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent opacity-60" />
                </div>

                <h3 className="text-3xl font-medium text-white mb-6 tracking-tight">{release.title}</h3>
                <p className="text-lg text-zinc-400 font-light leading-relaxed mb-10">
                  {release.description}
                </p>

                {release.features.length > 0 && (
                  <div className="mb-8">
                    <h4 className="flex items-center gap-2 text-white font-medium mb-4">
                      <Sparkles className="w-4 h-4 text-zinc-400" />
                      New Features
                    </h4>
                    <ul className="space-y-3">
                      {release.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-3 text-zinc-400 font-light">
                          <CheckCircle2 className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {release.fixes.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 text-white font-medium mb-4">
                      <Wrench className="w-4 h-4 text-zinc-400" />
                      Bug Fixes
                    </h4>
                    <ul className="space-y-3">
                      {release.fixes.map((fix, i) => (
                        <li key={i} className="flex items-start gap-3 text-zinc-400 font-light">
                          <Bug className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
