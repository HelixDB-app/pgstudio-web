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
} from "lucide-react";
import { usePathname } from "next/navigation";

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
        <BentoFeatures />
        <PerformanceComparisonSection />
        <DataQueryingSection />
        <AISection />
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
          <div className="mockup-inner rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-white/5 bg-[#050505]">
            {/* Window controls */}
            <div className="h-12 bg-[#0a0a0a] border-b border-white/5 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-white/20 hover:bg-red-500 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-white/20 hover:bg-yellow-500 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-white/20 hover:bg-green-500 transition-colors" />
              <div className="mx-auto text-xs text-zinc-500 font-medium flex items-center gap-2">
                <Database className="w-3 h-3" />
                production_db — pgStudio
              </div>
            </div>
            {/* App content mockup */}
            <div className="flex h-[500px]">
              {/* Sidebar */}
              <div className="w-64 border-r border-white/5 bg-[#0a0a0a]/50 p-4 hidden md:block">
                <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-4">Schemas</div>
                <div className="space-y-1">
                  {['public', 'auth', 'analytics'].map((schema, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 p-1.5 rounded transition-colors cursor-pointer">
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                      <Database className="w-3.5 h-3.5 text-zinc-500" />
                      {schema}
                    </div>
                  ))}
                </div>
              </div>
              {/* Main area */}
              <div className="flex-1 flex flex-col">
                {/* Editor */}
                <div className="h-1/2 border-b border-white/5 p-6 font-mono text-sm text-zinc-300 bg-[#050505] relative">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button className="px-3 py-1.5 text-xs bg-white/10 text-white rounded hover:bg-white/20 transition-colors flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Run
                    </button>
                  </div>
                  <div className="text-zinc-500">-- Find active pro users</div>
                  <div className="text-white mt-2">SELECT</div>
                  <div className="pl-4">u.id, u.email, p.plan_name,</div>
                  <div className="pl-4">COUNT(o.id) as total_orders</div>
                  <div className="text-white">FROM</div>
                  <div className="pl-4">users u</div>
                  <div className="text-white">LEFT JOIN</div>
                  <div className="pl-4">subscriptions p ON u.plan_id = p.id</div>
                  <div className="text-white">GROUP BY</div>
                  <div className="pl-4">1, 2, 3</div>
                  <div className="text-white">ORDER BY</div>
                  <div className="pl-4">total_orders DESC;</div>
                </div>
                {/* Results */}
                <div className="h-1/2 bg-[#0a0a0a] p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-medium text-zinc-500">Results (100,000+ rows)</div>
                    <div className="text-xs text-zinc-400 bg-white/5 px-2 py-1 rounded border border-white/5">0.4ms</div>
                  </div>
                  <div className="border border-white/5 rounded-lg bg-[#050505] overflow-hidden">
                    <div className="grid grid-cols-4 border-b border-white/5 bg-white/[0.02] text-xs font-medium text-zinc-500 p-2.5">
                      <div>id</div>
                      <div>email</div>
                      <div>plan_name</div>
                      <div>total_orders</div>
                    </div>
                    {[1,2,3].map(i => (
                      <div key={i} className="grid grid-cols-4 text-sm text-zinc-400 p-2.5 border-b border-white/5 font-mono hover:bg-white/[0.02] transition-colors">
                        <div className="text-zinc-300">{i}042</div>
                        <div>user{i}@example.com</div>
                        <div>Pro</div>
                        <div>{i * 12}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

function SecuritySection() {
  // Integrated into BentoFeatures for a cleaner flow, but keeping a small abstract section if needed.
  return null;
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
          <div className="w-5 h-5 rounded bg-white text-black flex items-center justify-center">
            <Database className="w-3 h-3" />
          </div>
          <span>pgStudio</span>
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

