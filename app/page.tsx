"use client";
import React, { useRef, useEffect } from "react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";
import {
  Database,
  Zap,
  Terminal,
  LayoutGrid,
  Sparkles,
  Shield,
  Cpu,
  Search,
  Code,
  Activity,
  Network,
  FileText,
  MessageSquare,
  Lock,
  Download,
  ChevronRight,
  Command,
  Table,
  Eye,
  History,
  ArrowRight,
  Code2,
  BarChart3,
  Layout,
  UsersRound,
  Video,
  Monitor,
  GitBranch,
  GitPullRequest,
  GitCommit,
  Map,
  Edit3,
  Server
} from "lucide-react";
import { usePathname } from "next/navigation";
import { CollaborationLaunchpad } from "@/components/collaboration-launchpad";
import Image from "next/image";
import Link from "next/link";

const features = [
  {
    icon: Database,
    title: "Multi-Connection",
    desc: "Connect to multiple PostgreSQL databases simultaneously with a clean tabbed interface.",
  },
  {
    icon: Code2,
    title: "SQL Editor",
    desc: "Full-featured Monaco-powered SQL editor with syntax highlighting, autocomplete, and history.",
  },
  {
    icon: BarChart3,
    title: "Query Analytics",
    desc: "pg_stat_statements integration with visual dashboards, query history, and performance insights.",
  },
  {
    icon: Shield,
    title: "Sandbox Mode",
    desc: "Preview destructive SQL in a transaction before committing — no accidental data loss.",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    desc: "Gemini-powered SQL chat, schema docs, seed data generation, and query optimisation.",
  },
  {
    icon: Layout,
    title: "Schema Designer",
    desc: "Visual ER diagram editor with AI-assisted schema generation and SQL export.",
  },
  {
    icon: GitBranch,
    title: "Version Control",
    desc: "Built-in Git client to version your queries, manage branches, and create pull requests.",
  },
  {
    icon: Table,
    title: "Data Canvas",
    desc: "Infinite scroll data table with inline editing, JSON viewing, and map visualization.",
  },
];


gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

function Home() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Hero text stagger
    gsap.from(".hero-elem", {
      y: 40,
      opacity: 0,
      duration: 1.2,
      stagger: 0.15,
      ease: "power4.out",
      delay: 0.1
    });

    // Mockup animation
    gsap.from(".hero-mockup", {
      y: 80,
      opacity: 0,
      duration: 1.5,
      ease: "power3.out",
      delay: 0.6
    });

    // Scroll reveal elements
    const revealElements = gsap.utils.toArray(".reveal");
    revealElements.forEach((elem: any) => {
      gsap.from(elem, {
        scrollTrigger: {
          trigger: elem,
          start: "top 85%",
        },
        y: 40,
        opacity: 0,
        duration: 1,
        ease: "power3.out"
      });
    });

    // Bento box stagger
    gsap.from(".bento-item", {
      scrollTrigger: {
        trigger: ".bento-grid",
        start: "top 80%",
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out"
    });

    // Feature cards stagger
    gsap.from(".feature-card", {
      scrollTrigger: {
        trigger: ".features-grid",
        start: "top 80%",
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out"
    });

    // AI Bento stagger
    gsap.from(".ai-bento-item", {
      scrollTrigger: {
        trigger: ".ai-bento-grid",
        start: "top 80%",
      },
      scale: 0.95,
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out"
    });

    // Scale in icons
    const icons = gsap.utils.toArray(".icon-scale");
    icons.forEach((icon: any) => {
      gsap.from(icon, {
        scrollTrigger: {
          trigger: icon,
          start: "top 90%",
        },
        scale: 0,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(1.5)"
      });
    });

    // Live Team Collaboration pills stagger
    gsap.from(".collab-pill", {
      scrollTrigger: {
        trigger: ".collab-section",
        start: "top 80%",
      },
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.06,
      ease: "power3.out"
    });

    // Schema cards stagger
    gsap.from(".schema-card", {
      scrollTrigger: {
        trigger: ".schema-sql-section",
        start: "top 60%",
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out"
    });

    // Schema Designer & SQL Editor section pills stagger
    gsap.from(".schema-feature-pill", {
      scrollTrigger: {
        trigger: ".schema-sql-section",
        start: "top 80%",
      },
      y: 20,
      opacity: 0,
      duration: 0.6,
      stagger: 0.06,
      ease: "power3.out"
    });

    // Git section
    gsap.from(".git-card", {
      scrollTrigger: {
        trigger: ".git-section",
        start: "top 80%",
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out"
    });

    // Canvas section
    gsap.from(".canvas-reveal", {
      scrollTrigger: {
        trigger: ".canvas-section",
        start: "top 80%",
      },
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: "power3.out"
    });

    // Parallax on mockup
    gsap.fromTo(".mockup-inner",
      {
        y: 50,
        rotateX: 10,
        transformPerspective: 1200,
      },
      {
        scrollTrigger: {
          trigger: ".hero-mockup",
          start: "top bottom",
          end: "bottom top",
          scrub: 1.5,
        },
        y: -150,
        rotateX: -5,
        ease: "none"
      }
    );

  }, { scope: container });

  return (
    <div ref={container}>
      <main>
        <Hero />
        <SchemaDesignerSQLSection />
        <CollaborationLaunchpad />
        <LiveTeamCollaborationSection />
        <BentoFeatures />
        <PerformanceComparisonSection />
        <DataQueryingSection />
        <DataCanvasSection />
        <AISection />
        <GitIntegrationSection />
        <SecuritySection />
        <ClosingCTA />
      </main>
    </div>
  );
}

function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <ScrollToTop />
      <Home />
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="relative pt-40 pb-20">
      {/* Subtle glowing background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-black to-black -z-10" />

      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="hero-elem inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-zinc-300 text-xs font-medium mb-8 border border-white/10 backdrop-blur-sm">
          <Sparkles className="w-3 h-3" />
          <span>Introducing Schema Designer AI</span>
        </div>

        <h1 className="hero-elem text-6xl md:text-8xl font-medium text-white tracking-tighter mb-6 leading-[1.1]">
          The database IDE <br className="hidden md:block" />
          <span className="text-zinc-500">you deserve.</span>
        </h1>

        <p className="hero-elem text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Native macOS app. Rust-powered speed. AI-enhanced workflow. <br className="hidden md:block" />
          A serious alternative to bloated Electron tools.
        </p>

        <div className="hero-elem flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="bg-white text-black px-8 py-4 rounded-full text-base font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center">
            <Download className="w-5 h-5" />
            Download for macOS
          </button>
          <button className="px-8 py-4 rounded-full text-base font-medium text-white border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center">
            Explore Features
          </button>
        </div>

        <p className="hero-elem mt-6 text-xs text-zinc-600 font-mono">v2.0.4 • Apple Silicon Optimized</p>

        {/* Mockup */}
        <div className="hero-mockup mt-24 relative mx-auto max-w-5xl text-left perspective-1000">
          <Image src="/images/hero.png" alt="pgStudio" width={1000} height={1000} className="w-full h-full rounded-3xl object-contain" />
        </div>
      </div>
    </section>
  );
}

const schemaSQLFeatures = [
  { label: "Visual Schema Designer", primary: true },
  { label: "VS Code–style file explorer", primary: false },
  { label: "Advanced SQL Query Editor", primary: false },
  { label: "Run queries instantly", primary: false },
  { label: "AI-powered auto-complete", primary: false },
  { label: "Notion-style docs alongside SQL", primary: false },
  { label: "AI Explain for queries & schema", primary: false },
  { label: "Query history and saved scripts", primary: false },
  { label: "Performance insights and query explain", primary: false },
  { label: "Export and collaboration tools", primary: false },
];

function SchemaDesignerSQLSection() {
  return (
    <section id="schema-sql" className="schema-sql-section py-32 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="reveal text-center mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-white text-xs font-medium mb-6 border border-white/10 backdrop-blur-sm">
            <Layout className="w-3 h-3" />
            <span>The Ultimate Database Desktop App</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white tracking-tight mb-6">
            Design schemas and run SQL, <br className="hidden md:block" />
            <span className="text-zinc-500">beautifully integrated.</span>
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto font-light leading-relaxed">
            Experience a native desktop environment where your visual database structures, powerful SQL pipelines, and rich documentation live in perfect harmony.
          </p>
        </div>

        <div className="reveal relative mx-auto max-w-5xl mb-24 perspective-1000">
          <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.5)] group">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-50 z-10 pointer-events-none" />
            <Image
              src="/images/schema-editor.png"
              alt="pgStudio Native Desktop App Interface"
              width={1400}
              height={900}
              className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="schema-card bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-white/10 transition-colors">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-medium text-white mb-4">Schema Designer</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
              Visually map out database structures with an intuitive drag-and-drop designer. Manage schemas, tables, and relationships effortlessly.
            </p>
            <ul className="space-y-3 text-sm text-zinc-500 font-light">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> VS Code-style file explorer</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> Instant visual modeling</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> Seamless table management</li>
            </ul>
          </div>

          <div className="schema-card bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-white/10 transition-colors">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-medium text-white mb-4">Smart SQL Editor</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
              Write queries faster in a modern editor equipped with syntax highlighting, robust autocompletion, and integrated AI assistance.
            </p>
            <ul className="space-y-3 text-sm text-zinc-500 font-light">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> AI-powered auto-complete</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> Built-in performance insights</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> Historical query tracking</li>
            </ul>
          </div>

          <div className="schema-card bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-white/10 transition-colors">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-medium text-white mb-4">Rich Documentation</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
              Maintain Notion-style rich text documents right alongside your SQL files to document architecture and share complex logic.
            </p>
            <ul className="space-y-3 text-sm text-zinc-500 font-light">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> Block-based Markdown editor</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> Inline AI Explain function</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> Unified workspace view</li>
            </ul>
          </div>
        </div>

        <div className="reveal flex flex-wrap gap-3 justify-center">
          {schemaSQLFeatures.map((f, i) => (
            <span
              key={i}
              className={`schema-feature-pill inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${f.primary
                ? "border-white/20 bg-white/10 text-white font-medium"
                : "border-white/5 bg-white/[0.02] text-zinc-400 hover:text-white hover:border-white/20"
                }`}
            >
              {f.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const liveCollabFeatures = [
  { icon: UsersRound, label: "Real-time collaboration", primary: true },
  { icon: Code2, label: "Cursors & presence", primary: false },
  { icon: Video, label: "Voice & camera", primary: false },
  { icon: Monitor, label: "Screen sharing", primary: false },
  { icon: MessageSquare, label: "In-room chat", primary: false },
  { icon: Terminal, label: "Live query results", primary: false },
  { icon: Lock, label: "View / edit / delete permissions", primary: false },
];

function LiveTeamCollaborationSection() {
  return (
    <section id="live-collaboration" className="collab-section py-32 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-white/[0.02] blur-[100px] rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: code editor mockup with presence */}
          <div className="reveal order-2 md:order-1">
            <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-gradient-to-br from-pink-500/5 to-amber-500/5">
              <div className="absolute top-4 right-4 z-10 flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-cyan-500/80 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-semibold text-black">
                  D
                </div>
                <div className="w-8 h-8 rounded-full bg-violet-500/80 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-semibold text-black">
                  L
                </div>
              </div>
              <div className="bg-[#050505] border-b border-white/5 px-3 py-2 font-mono text-[10px] text-zinc-500">
                query.sql
              </div>
              <div className="p-4 font-mono text-sm leading-relaxed">
                <div className="flex">
                  <span className="w-6 shrink-0 select-none text-zinc-600">1</span>
                  <span><span className="text-white">select</span></span>
                </div>
                <div className="flex">
                  <span className="w-6 shrink-0 select-none text-zinc-600">2</span>
                  <span><span className="pl-4 text-amber-400/90">date_trunc</span><span className="text-zinc-400">(</span><span className="text-teal-400/90">&apos;week&apos;</span><span className="text-zinc-400">, orderdate)</span></span>
                </div>
                <div className="flex">
                  <span className="w-6 shrink-0 select-none text-zinc-600">3</span>
                  <span><span className="pl-4 text-amber-400/90">count</span><span className="text-zinc-400">(1)</span></span>
                </div>
                <div className="flex">
                  <span className="w-6 shrink-0 select-none text-zinc-600">4</span>
                  <span><span className="text-white">from</span><span className="text-zinc-400"> orders</span></span>
                </div>
                <div className="flex">
                  <span className="w-6 shrink-0 select-none text-zinc-600">5</span>
                  <span>
                    <span className="text-white">where</span><span className="text-zinc-400"> orderdate </span><span className="text-white">between</span><span className="text-teal-400/90"> &apos;2010-</span>
                    <span className="ml-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-black bg-violet-400/90 border border-violet-300/50">Dave</span>
                  </span>
                </div>
                <div className="flex">
                  <span className="w-6 shrink-0 select-none text-zinc-600">6</span>
                  <span><span className="text-white">group by</span><span className="text-zinc-400"> 1</span></span>
                </div>
                <div className="flex">
                  <span className="w-6 shrink-0 select-none text-zinc-600">7</span>
                  <span>
                    <span className="text-white">order by</span><span className="text-zinc-400"> </span>
                    <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-black bg-cyan-400/90 border border-cyan-300/50">Linda</span>
                  </span>
                </div>
                <div className="flex">
                  <span className="w-6 shrink-0 select-none text-zinc-600">8</span>
                  <span><span className="text-white">limit</span><span className="text-zinc-400"> 5</span></span>
                </div>
              </div>
              <div className="border-t border-white/5 px-4 py-3 text-xs text-zinc-500 font-sans font-light">
                Peer review code, collaborate live, and cut down on back-and-forths to deliver accurate insights fast.
              </div>
            </div>
          </div>

          {/* Right: headline + feature pills */}
          <div className="reveal order-1 md:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-white text-xs font-medium mb-6 border border-white/10">
              <UsersRound className="w-3 h-3" />
              <span>Live Team Collaboration</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6">
              Reduce collaboration overhead.
            </h2>
            <p className="text-xl text-zinc-500 font-light mb-10 max-w-xl">
              Create a shared SQL workspace to boost productivity and foster a collaborative data culture. Edit together in real time, share your camera and screen, chat with teammates, and see query results live—all inside the desktop app.
            </p>
            <div className="collab-pills flex flex-wrap gap-3">
              {liveCollabFeatures.map((f, i) => {
                const Icon = f.icon;
                return (
                  <span
                    key={i}
                    className={`collab-pill inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${f.primary
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-white/10 bg-white/5 text-zinc-300"
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {f.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BentoFeatures() {
  return (
    <section id="speed" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="reveal text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6">Engineered for speed.</h2>
          <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-light">
            Leave bloated, slow database tools behind. pgStudio is built with a Rust core to deliver uncompromised performance.
          </p>
        </div>

        <div className="bento-grid grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Large Card */}
          <div className="bento-item md:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="icon-scale w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-8 border border-white/5">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-2xl font-medium text-white mb-4">Rust-Powered Core</h3>
            <p className="text-zinc-400 leading-relaxed max-w-md">
              Powered by Tauri and Rust. Experience native speed, minimal memory footprint, no JVM, and zero GC pauses. 10× faster startup than Electron-based tools.
            </p>
          </div>

          {/* Small Card 1 */}
          <div className="bento-item bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="icon-scale w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-8 border border-white/5">
              <Table className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-medium text-white mb-3">Infinite Scroll</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Virtualized result tables render only visible rows. Smooth scrolling and low memory, even with 100k+ rows.
            </p>
          </div>

          {/* Small Card 2 */}
          <div className="bento-item bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="icon-scale w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-8 border border-white/5">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-medium text-white mb-3">Native macOS</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              A true Developer Tool built for macOS, not a sluggish web wrapper. Feels right at home on your Mac.
            </p>
          </div>

          {/* Large Card 2 */}
          <div className="bento-item md:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 md:p-12 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <div className="icon-scale w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-8 border border-white/5">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-medium text-white mb-4">Zero-Trust Security</h3>
                <p className="text-zinc-400 leading-relaxed">
                  Your credentials never leave your machine. Stored encrypted on-device. Direct database connections only—no cloud relays, no telemetry.
                </p>
              </div>
              <div className="w-full md:w-1/2 bg-[#050505] border border-white/5 rounded-xl p-6 font-mono text-sm text-zinc-500">
                <div className="flex justify-between border-b border-white/5 pb-3 mb-3">
                  <span>Host</span>
                  <span className="text-white">localhost</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-3 mb-3">
                  <span>Port</span>
                  <span className="text-white">5432</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-3 mb-3">
                  <span>Database</span>
                  <span className="text-white">production_db</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span>Password</span>
                  <span className="text-white flex items-center gap-2">
                    ••••••••••••
                    <Lock className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PerformanceComparisonSection() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(".perf-reveal", {
      scrollTrigger: {
        trigger: container.current,
        start: "top 80%",
      },
      y: 40,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: "power3.out"
    });

    const bars = gsap.utils.toArray(".perf-bar");
    bars.forEach((bar: any) => {
      const targetWidth = bar.getAttribute("data-width");
      gsap.fromTo(bar,
        { width: "0%" },
        {
          scrollTrigger: {
            trigger: container.current,
            start: "top 75%",
          },
          width: targetWidth,
          duration: 1.5,
          ease: "power4.out",
          delay: 0.2
        }
      );
    });

    gsap.from(".perf-value", {
      scrollTrigger: {
        trigger: container.current,
        start: "top 75%",
      },
      opacity: 0,
      x: -20,
      duration: 1,
      stagger: 0.2,
      delay: 0.6,
      ease: "power3.out"
    });
  }, { scope: container });

  const data = [
    { name: "Java-based Clients (e.g. DataGrip, DBeaver)", value: "850 MB", width: "85%", color: "bg-zinc-800" },
    { name: "Electron-based Clients (e.g. pgAdmin, TablePlus Web)", value: "520 MB", width: "52%", color: "bg-zinc-800" },
    { name: "pgStudio (Native Rust)", value: "45 MB", width: "10%", color: "bg-white", isHighlight: true },
  ];

  return (
    <section className="py-32 border-t border-white/5 relative overflow-hidden" ref={container}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-white/[0.02] blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="perf-reveal text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-white text-xs font-medium mb-6 border border-white/10">
            <Zap className="w-3 h-3" />
            <span>Unmatched Performance</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6">
            Leave the bloat behind.
          </h2>
          <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-light">
            Built from the ground up in Rust. No JVM overhead. No Chromium instances.
            Just raw, unadulterated performance that respects your machine's resources.
          </p>
        </div>

        <div className="perf-reveal max-w-4xl mx-auto bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 md:p-12 relative">
          <h3 className="text-xl font-medium text-white mb-10 flex items-center gap-2">
            <Activity className="w-5 h-5 text-zinc-400" />
            Idle Memory Usage Comparison
          </h3>

          <div className="space-y-8">
            {data.map((item, i) => (
              <div key={i} className="relative">
                <div className="flex justify-between text-sm mb-3">
                  <span className={`font-medium ${item.isHighlight ? 'text-white' : 'text-zinc-400'}`}>
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-8 bg-[#050505] rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`perf-bar h-full rounded-full ${item.color} ${item.isHighlight ? 'shadow-[0_0_15px_rgba(255,255,255,0.3)]' : ''}`}
                      data-width={item.width}
                    />
                  </div>
                  <span className={`perf-value w-16 text-right text-sm font-mono font-medium ${item.isHighlight ? 'text-white' : 'text-zinc-500'}`}>
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-white/5 pt-10">
            <div>
              <div className="text-4xl font-medium text-white mb-2">150<span className="text-xl text-zinc-500">ms</span></div>
              <div className="text-sm text-zinc-500 font-light">Cold startup time</div>
            </div>
            <div>
              <div className="text-4xl font-medium text-white mb-2">&lt;1<span className="text-xl text-zinc-500">ms</span></div>
              <div className="text-sm text-zinc-500 font-light">UI interaction latency</div>
            </div>
            <div>
              <div className="text-4xl font-medium text-white mb-2">0<span className="text-xl text-zinc-500"></span></div>
              <div className="text-sm text-zinc-500 font-light">Garbage collection pauses</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DataQueryingSection() {
  const features = [
    {
      icon: <Terminal className="w-5 h-5" />,
      title: "Smart SQL Editor",
      desc: "Monaco-based editor with syntax highlighting, autocomplete, and inline error hints. Write and run queries without leaving the app."
    },
    {
      icon: <Network className="w-5 h-5" />,
      title: "Schema Topology",
      desc: "Visual dependency graph of tables and foreign keys. Navigate directly from diagram to table."
    },
    {
      icon: <Activity className="w-5 h-5" />,
      title: "Session Monitor",
      desc: "Track active queries, connections, blocking queries, and long-running queries in real-time."
    },
    {
      icon: <Eye className="w-5 h-5" />,
      title: "Query Plan Viewer",
      desc: "Visualize EXPLAIN ANALYZE output. Understand execution plans, node types, and costs easily."
    },
    {
      icon: <Command className="w-5 h-5" />,
      title: "Command Palette",
      desc: "Hit ⌘K to access the command palette. Fully configurable keyboard shortcuts for all main actions."
    },
    {
      icon: <History className="w-5 h-5" />,
      title: "Query History",
      desc: "Track past queries and performance metrics (pg_stat_statements style) to identify bottlenecks."
    }
  ];

  return (
    <section id="features" className="py-32 border-t border-white/5 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="reveal text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6">Everything you need.</h2>
          <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-light">
            Deep visibility into your database structure and performance. Manage everything visually or via SQL.
          </p>
        </div>

        <div className="features-grid grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {features.map((f, i) => (
            <div key={i} className="feature-card flex flex-col gap-4">
              <div className="icon-scale w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 text-white">
                {f.icon}
              </div>
              <div>
                <h4 className="text-lg font-medium text-white mb-2">{f.title}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed font-light">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AISection() {
  return (
    <section id="ai" className="py-32 border-t border-white/5 relative overflow-hidden">
      {/* Subtle AI Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[600px] bg-white/[0.03] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="reveal mb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-white text-xs font-medium mb-6 border border-white/10">
            <Sparkles className="w-3 h-3" />
            <span>AI Powered</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6">AI that knows PostgreSQL.</h2>
          <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-light">
            Supercharge your workflow with a context-aware AI assistant. Generate queries, design schemas, and debug errors faster than ever.
          </p>
        </div>

        <div className="ai-bento-grid grid lg:grid-cols-3 gap-4">
          <div className="ai-bento-item lg:col-span-2 rounded-3xl border border-white/5 bg-[#0a0a0a] p-8 md:p-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="icon-scale w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-medium text-white">AI SQL Assistant</h3>
            </div>
            <p className="text-zinc-400 mb-8 font-light leading-relaxed max-w-xl">
              Conversational AI with full database context. Generate and refine SQL from natural language, paste schema info, and get ready-to-run queries with a one-click "Insert into editor".
            </p>
            <div className="bg-[#050505] rounded-2xl p-6 border border-white/5 font-mono text-sm">
              <div className="text-zinc-500 mb-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white">U</div>
                Find users who haven't ordered in 6 months but have a Pro plan
              </div>
              <div className="pl-8 border-l border-white/10">
                <div className="text-white">SELECT</div>
                <div className="pl-4 text-zinc-400">u.id, u.email</div>
                <div className="text-white">FROM</div>
                <div className="pl-4 text-zinc-400">users u</div>
                <div className="text-white">JOIN</div>
                <div className="pl-4 text-zinc-400">subscriptions s ON u.plan_id = s.id</div>
                <div className="text-white">WHERE</div>
                <div className="pl-4 text-zinc-400">s.name = 'Pro' AND u.last_order_date &lt; NOW() - INTERVAL '6 months';</div>
                <div className="mt-6 flex justify-start">
                  <button className="text-xs bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors font-sans font-medium">
                    Insert into editor
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="ai-bento-item flex-1 rounded-3xl border border-white/5 bg-[#0a0a0a] p-8">
              <div className="icon-scale w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/5 mb-6">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-medium text-white mb-3">40+ Curated Templates</h3>
              <p className="text-sm text-zinc-400 font-light leading-relaxed">
                One-click prompts for Queries, Performance, Schema, Data Quality, Security, and Analytics.
              </p>
            </div>

            <div className="ai-bento-item flex-1 rounded-3xl border border-white/5 bg-[#0a0a0a] p-8">
              <div className="icon-scale w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white border border-white/5 mb-6">
                <Code className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-medium text-white mb-3">Schema Designer AI</h3>
              <p className="text-sm text-zinc-400 font-light leading-relaxed">
                Describe your app and generate a full schema with tables, columns, FKs, and optimization suggestions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GitIntegrationSection() {
  return (
    <section id="git" className="git-section py-32 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[500px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="reveal text-center mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-white text-xs font-medium mb-6 border border-white/10 backdrop-blur-sm">
            <GitBranch className="w-3 h-3" />
            <span>Database Version Control</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white tracking-tight mb-6">
            Review and version your <br className="hidden md:block" />
            <span className="text-zinc-500">SQL like real code.</span>
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto font-light leading-relaxed">
            Treat your queries and schemas as source code. Commit changes, switch branches, diff queries, and create GitHub Pull Requests directly from pgStudio.
          </p>
        </div>

        <div className="reveal relative mx-auto max-w-5xl mb-24 perspective-1000">
          <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.5)] group flex flex-col">
            <div className="bg-[#0a0a0a] border-b border-white/5 px-4 py-3 flex justify-between items-center">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
                <div className="w-3 h-3 rounded-full bg-zinc-800" />
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-white/5 px-3 py-1.5 rounded-md">
                <GitBranch className="w-3 h-3" />
                <span>feature/new-analytics</span>
              </div>
              <button className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 text-xs rounded-md font-medium flex items-center gap-1.5 hover:bg-green-500/20 transition-colors">
                <GitCommit className="w-3 h-3" />
                Commit (2)
              </button>
            </div>

            <div className="flex">
              {/* Left Side: File Tree */}
              <div className="w-64 border-r border-white/5 bg-[#080808] p-4 hidden md:block">
                <div className="text-xs font-semibold text-zinc-500 mb-4 uppercase tracking-wider">Changed Files</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-zinc-300 bg-white/5 px-2 py-1.5 rounded focus:outline-none">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="truncate">update_users.sql</span>
                    <span className="ml-auto text-[10px] text-amber-400">M</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 px-2 py-1.5 rounded hover:bg-white/[0.02] cursor-pointer">
                    <FileText className="w-4 h-4 text-zinc-600" />
                    <span className="truncate">analytics_view.sql</span>
                    <span className="ml-auto text-[10px] text-green-400">A</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Diff Viewer */}
              <div className="flex-1 font-mono text-sm leading-relaxed overflow-hidden">
                <div className="flex bg-[#0a0a0a] border-b border-white/5 p-2 px-4 text-xs text-zinc-500 font-sans font-medium">
                  Comparing <code className="bg-white/5 px-1.5 rounded mx-1 pb-[1px]">main</code> with <code className="bg-white/5 px-1.5 rounded mx-1 pb-[1px]">feature/new-analytics</code>
                </div>

                {/* Diff Lines */}
                <div className="flex">
                  <div className="w-10 shrink-0 select-none text-zinc-600 text-right pr-2 bg-[#050505] border-r border-white/5 pt-2 pb-1">1</div>
                  <div className="w-10 shrink-0 select-none text-zinc-600 text-right pr-2 bg-[#050505] border-r border-white/5 pt-2 pb-1">1</div>
                  <div className="flex-1 pl-4 pt-2 pb-1 bg-transparent">
                    <span className="text-white">SELECT</span>
                  </div>
                </div>

                <div className="flex">
                  <div className="w-10 shrink-0 select-none text-zinc-600 text-right pr-2 bg-[#050505] border-r border-white/5 py-1">2</div>
                  <div className="w-10 shrink-0 select-none text-zinc-600 text-right pr-2 bg-[#050505] border-r border-white/5 py-1">2</div>
                  <div className="flex-1 pl-4 py-1 bg-transparent">
                    <span className="text-zinc-400">  u.id, u.email,</span>
                  </div>
                </div>

                {/* Removed Line */}
                <div className="flex bg-red-500/[0.08]">
                  <div className="w-10 shrink-0 select-none text-red-500/50 text-right pr-2 bg-red-500/[0.04] border-r border-white/5 py-1">3</div>
                  <div className="w-10 shrink-0 select-none text-zinc-700 text-right pr-2 bg-red-500/[0.02] border-r border-white/5 py-1"></div>
                  <div className="flex-1 pl-4 py-1 relative">
                    <div className="absolute left-1 top-1.5 w-1.5 h-1.5 bg-red-500/50 rounded-full" />
                    <span className="text-zinc-500 line-through">  u.created_at</span>
                  </div>
                </div>

                {/* Added Lines */}
                <div className="flex bg-green-500/[0.08]">
                  <div className="w-10 shrink-0 select-none text-zinc-700 text-right pr-2 bg-green-500/[0.04] border-r border-white/5 py-1"></div>
                  <div className="w-10 shrink-0 select-none text-green-500/50 text-right pr-2 bg-green-500/[0.02] border-r border-white/5 py-1">3</div>
                  <div className="flex-1 pl-4 py-1 relative">
                    <div className="absolute left-1 top-1.5 w-1.5 h-1.5 bg-green-500/50 rounded-full" />
                    <span className="text-green-400">  date_trunc('month', u.created_at) as signup_month,</span>
                  </div>
                </div>
                <div className="flex bg-green-500/[0.08]">
                  <div className="w-10 shrink-0 select-none text-zinc-700 text-right pr-2 bg-green-500/[0.04] border-r border-white/5 py-1"></div>
                  <div className="w-10 shrink-0 select-none text-green-500/50 text-right pr-2 bg-green-500/[0.02] border-r border-white/5 py-1">4</div>
                  <div className="flex-1 pl-4 py-1 relative">
                    <div className="absolute left-1 top-1.5 w-1.5 h-1.5 bg-green-500/50 rounded-full" />
                    <span className="text-green-400">  COUNT(o.id) as total_orders</span>
                  </div>
                </div>

                <div className="flex">
                  <div className="w-10 shrink-0 select-none text-zinc-600 text-right pr-2 bg-[#050505] border-r border-white/5 py-1">4</div>
                  <div className="w-10 shrink-0 select-none text-zinc-600 text-right pr-2 bg-[#050505] border-r border-white/5 py-1">5</div>
                  <div className="flex-1 pl-4 py-1 bg-transparent">
                    <span className="text-white">FROM</span><span className="text-zinc-400"> users u</span>
                  </div>
                </div>

                <div className="flex">
                  <div className="w-10 shrink-0 select-none text-zinc-600 text-right pr-2 bg-[#050505] border-r border-white/5 py-1">5</div>
                  <div className="w-10 shrink-0 select-none text-zinc-600 text-right pr-2 bg-[#050505] border-r border-white/5 py-1">6</div>
                  <div className="flex-1 pl-4 py-1 bg-transparent">
                    <span className="text-white">LEFT JOIN</span><span className="text-zinc-400"> orders o </span><span className="text-white">ON</span><span className="text-zinc-400"> u.id = o.user_id</span>
                  </div>
                </div>

                {/* Added Lines again... */}
                <div className="flex bg-green-500/[0.08]">
                  <div className="w-10 shrink-0 select-none text-zinc-700 text-right pr-2 bg-green-500/[0.04] border-r border-white/5 py-1"></div>
                  <div className="w-10 shrink-0 select-none text-green-500/50 text-right pr-2 bg-green-500/[0.02] border-r border-white/5 py-1">7</div>
                  <div className="flex-1 pl-4 py-1 relative">
                    <div className="absolute left-1 top-1.5 w-1.5 h-1.5 bg-green-500/50 rounded-full" />
                    <span className="text-green-400">GROUP BY 1, 2, 3</span>
                  </div>
                </div>

                <div className="flex border-b border-transparent"> {/* Avoid bottom gap color issues */}
                  <div className="w-10 shrink-0 select-none text-zinc-600 text-right pr-2 bg-[#050505] border-r border-white/5 pb-4 pt-1 rounded-bl-3xl">6</div>
                  <div className="w-10 shrink-0 select-none text-zinc-600 text-right pr-2 bg-[#050505] border-r border-white/5 pb-4 pt-1">8</div>
                  <div className="flex-1 pl-4 pb-4 pt-1 bg-transparent">
                    <span className="text-white">ORDER BY</span><span className="text-zinc-400"> signup_month DESC;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="git-card bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-white/10 transition-colors">
              <GitCommit className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-medium text-white mb-4">Branch Management</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
              Create, switch, and merge Git branches for your SQL workspace without opening a terminal. Keep experimental queries separate from production scripts.
            </p>
          </div>

          <div className="git-card bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-white/10 transition-colors">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-medium text-white mb-4">Workspace Diff Viewer</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
              See exactly what changed in your SQL files before committing. A VS Code-style side-by-side diff viewer highlights every single addition and deletion.
            </p>
          </div>

          <div className="git-card bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group-hover:bg-white/10 transition-colors">
              <GitPullRequest className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-medium text-white mb-4">GitHub PR Integration</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-light">
              Once your SQL changes are ready, create a GitHub Pull Request with AI-generated titles and descriptions right from within the IDE.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DataCanvasSection() {
  return (
    <section id="data-canvas" className="canvas-section py-32 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="canvas-reveal order-2 md:order-1">
            {/* Visual Representation of Canvas */}
            <div className="relative rounded-3xl border border-white/10 overflow-hidden bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <div className="bg-[#0a0a0a] border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <Table className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">users_table</span>
                <div className="ml-auto flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                </div>
              </div>
              <div className="p-1 border-b border-white/5">
                <div className="grid grid-cols-4 gap-1 p-2 bg-white/5 text-xs text-zinc-500 font-medium rounded-t border-b border-white/5">
                  <div>id</div>
                  <div>name</div>
                  <div>role</div>
                  <div>last_login</div>
                </div>
                <div className="grid grid-cols-4 gap-1 p-2 text-xs text-zinc-300 border-b border-white/5">
                  <div className="text-zinc-500">1</div>
                  <div className="text-white border border-white/20 bg-white/10 rounded px-1 -mx-1 -my-0.5">Alice Admin</div>
                  <div>admin</div>
                  <div>2026-03-01</div>
                </div>
                <div className="grid grid-cols-4 gap-1 p-2 text-xs text-zinc-300 border-b border-white/5">
                  <div className="text-zinc-500">2</div>
                  <div>Bob User</div>
                  <div>user</div>
                  <div>2026-03-10</div>
                </div>
                <div className="grid grid-cols-4 gap-1 p-2 text-xs text-zinc-300 border-b border-white/5">
                  <div className="text-zinc-500">3</div>
                  <div>Charlie Guest</div>
                  <div>guest</div>
                  <div>2026-03-05</div>
                </div>
              </div>
              <div className="bg-[#050505] p-3 text-[10px] text-zinc-500 font-mono flex justify-between">
                <span>1 pending change. <span className="text-blue-400">Review (⌘S)</span></span>
                <span>Viewing 1-50 of 1.2M rows</span>
              </div>
            </div>
          </div>

          <div className="canvas-reveal order-1 md:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-white text-xs font-medium mb-6 border border-white/10">
              <LayoutGrid className="w-3 h-3" />
              <span>Data Canvas</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6">
              Interact with your data, visually.
            </h2>
            <p className="text-xl text-zinc-500 font-light mb-10 max-w-xl">
              Ditch the clunky pagination. The Data Canvas introduces infinite virtualized scrolling through millions of rows, inline spreadsheet-like editing, and geography visualizers.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                  <Edit3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">Inline Editing</h4>
                  <p className="text-zinc-400 text-sm font-light">Double click any cell to edit it. Changes are batched and reviewed in a SQL sandbox before committing to the database.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                  <Map className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">Leaflet Map Visualizer</h4>
                  <p className="text-zinc-400 text-sm font-light">Geometry and geography columns are instantly visualized on a beautiful Leaflet map for spatial data exploration.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  return (
    <section id="security" className="py-32 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[400px] bg-white/[0.02] blur-[100px] rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="reveal text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-white text-xs font-medium mb-6 border border-white/10">
            <Lock className="w-3 h-3" />
            <span>Zero-Trust Architecture</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-6">
            Your data never leaves <br className="hidden md:block" />
            <span className="text-zinc-500">your machine.</span>
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto font-light leading-relaxed">
            Unlike cloud-based IDEs, pgStudio makes direct TCP connections to your PostgreSQL instances. No proxies, no data relays, no telemetry.
          </p>
        </div>

        <div className="reveal grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 text-center group hover:border-white/10 transition-colors">
            <Server className="w-8 h-8 text-zinc-400 mx-auto mb-4 group-hover:text-white transition-colors" />
            <h4 className="text-white font-medium mb-2">Direct Connection</h4>
            <p className="text-xs text-zinc-500 font-light">Client directly connects to the DB via standard postgres protocols. Completely offline capable.</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 text-center group hover:border-white/10 transition-colors">
            <Lock className="w-8 h-8 text-zinc-400 mx-auto mb-4 group-hover:text-white transition-colors" />
            <h4 className="text-white font-medium mb-2">Encrypted Credentials</h4>
            <p className="text-xs text-zinc-500 font-light">Passwords and certificates are securely encrypted and stored natively in your macOS Keychain.</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 text-center group hover:border-white/10 transition-colors">
            <Shield className="w-8 h-8 text-zinc-400 mx-auto mb-4 group-hover:text-white transition-colors" />
            <h4 className="text-white font-medium mb-2">Sandbox Transactions</h4>
            <p className="text-xs text-zinc-500 font-light">Run UPDATE/DELETE queries without fear. Destructive actions are wrapped in transactions by default.</p>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 text-center group hover:border-white/10 transition-colors">
            <Activity className="w-8 h-8 text-zinc-400 mx-auto mb-4 group-hover:text-white transition-colors" />
            <h4 className="text-white font-medium mb-2">No Tracking</h4>
            <p className="text-xs text-zinc-500 font-light">Zero analytics, trackers, or product analytics. What happens in pgStudio, stays in pgStudio.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="py-40 border-t border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/[0.03] via-black to-black" />
      <div className="reveal max-w-4xl mx-auto px-6 text-center relative">
        <h2 className="text-5xl md:text-6xl font-medium text-white tracking-tighter mb-8">
          Ready for native speed?
        </h2>
        <p className="text-xl text-zinc-500 mb-12 font-light max-w-2xl mx-auto">
          Stop waiting for Electron apps to load. Experience the native performance and AI power of pgStudio today.
        </p>
        <button className="bg-white text-black px-10 py-5 rounded-full text-lg font-medium hover:bg-zinc-200 transition-colors inline-flex items-center gap-2">
          Download for macOS
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="mt-8 text-sm text-zinc-600 font-mono">Free trial available. No credit card required.</p>
      </div>
    </section>
  );
}

function Footer() {
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
        <div className="flex gap-8 text-sm text-zinc-500 font-light">
          <a href="#" className="hover:text-white transition-colors">Twitter</a>
          <a href="#" className="hover:text-white transition-colors">GitHub</a>
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
        </div>
      </div>
    </footer>
  );
}
