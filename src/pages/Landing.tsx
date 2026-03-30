import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Upload, Users, Map, Layout, Code2, FileText,
  ArrowRight, Sparkles, Search, PenLine, FileCheck,
} from "lucide-react";
import aetherJourney   from "@/assets/aether-journey.png";
import aetherPrototype from "@/assets/aether-prototype.png";
import aetherAudit     from "@/assets/aether-audit.png";

// ─── Data ─────────────────────────────────────────────────────────────────────

const PIPELINE = [
  { icon: Upload,   label: "Upload"    },
  { icon: Users,    label: "Personas"  },
  { icon: Map,      label: "Journeys"  },
  { icon: Layout,   label: "Screens"   },
  { icon: Code2,    label: "Prototype" },
  { icon: FileText, label: "Docs"      },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Upload PRD",           desc: "Drop your product requirements document and Aether handles the rest." },
  { n: "02", title: "Generate Personas",    desc: "AI identifies key user archetypes with goals, pain points, and confidence scores." },
  { n: "03", title: "Map Journeys",         desc: "Emotional journey maps per persona — stages, touchpoints, and friction." },
  { n: "04", title: "Derive Screens",       desc: "Every screen your product needs, derived directly from personas and flows." },
  { n: "05", title: "Generate Prototype",   desc: "Lovable-ready prompts for every screen, grouped by persona." },
  { n: "06", title: "Export Documentation", desc: "Fully annotated BA handoff — rules, edge cases, and dependencies." },
];

const OUTPUTS = [
  { icon: Sparkles,  title: "Prototype Prompts",  desc: "Persona-specific, builder-ready prompts" },
  { icon: Search,    title: "UX Audit Reports",   desc: "Heuristic analysis with actionable fixes" },
  { icon: PenLine,   title: "Copy Improvements",  desc: "Tone-matched microcopy suggestions" },
  { icon: FileCheck, title: "BA-Ready Documents", desc: "Exportable specs and flow documentation" },
];

// ─── Noise texture data URI ───────────────────────────────────────────────────

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`;

// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.11, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function FadeIn({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── ScreenFrame ─────────────────────────────────────────────────────────────

function ScreenFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-[20px] border border-[#E4E4E7] overflow-hidden bg-white">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#F1F5F9] bg-[#F8FAFC]">
        <div className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
      </div>
      <img src={src} alt={alt} className="w-full block" />
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();

  // Cursor-follow glow
  const heroRef = useRef<HTMLElement>(null);
  const [glow, setGlow] = useState({ x: "50%", y: "40%" });
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlow({
      x: ((e.clientX - rect.left) / rect.width * 100).toFixed(2) + "%",
      y: ((e.clientY - rect.top)  / rect.height * 100).toFixed(2) + "%",
    });
  }, []);

  // Scroll parallax on hero text
  const { scrollY } = useScroll();
  const heroTextY = useTransform(scrollY, [0, 500], [0, -55]);
  const heroOpacity = useTransform(scrollY, [0, 380], [1, 0]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A] antialiased">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-[#FAFAFA]/90 backdrop-blur-md border-b border-[#E4E4E7]">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-[56px] px-5 sm:px-8">
          <span className="text-[15px] font-semibold tracking-tight text-[#0F172A]">Aether</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-1.5 text-[13.5px] text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9] transition-all"
            >
              Log in
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/signup")}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13.5px] font-semibold rounded-lg transition-colors"
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative overflow-hidden pt-[130px] sm:pt-[160px] pb-0 px-5 sm:px-8"
      >
        {/* Background stack */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Base radial glow — centered, always present */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.09) 0%, transparent 70%)",
            }}
          />
          {/* Cursor-follow glow */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(700px circle at ${glow.x} ${glow.y}, rgba(99,102,241,0.055), transparent 55%)`,
              transition: "background 0.65s ease",
            }}
          />
          {/* Grain / noise texture */}
          <div
            className="absolute inset-0 opacity-[0.028]"
            style={{ backgroundImage: NOISE_SVG, backgroundRepeat: "repeat" }}
          />
        </div>

        {/* Hero text — parallax on scroll */}
        <motion.div
          style={{ y: heroTextY, opacity: heroOpacity }}
          className="relative max-w-[860px] mx-auto text-center"
        >
          {/* Eyebrow label */}
          <motion.div
            initial="hidden" animate="visible" custom={0} variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E7] bg-white px-4 py-1.5 mb-8"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#6366F1] animate-pulse" />
            <span className="text-[12px] font-medium text-[#64748B] tracking-wide">
              AI-powered design intelligence
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial="hidden" animate="visible" custom={1} variants={fadeUp}
            className="text-[42px] sm:text-[58px] lg:text-[68px] font-bold leading-[1.07] tracking-[-0.03em]"
          >
            <span className="block text-[#0F172A]">Design complete products</span>
            <span className="block text-[#334155]">not just screens</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial="hidden" animate="visible" custom={2} variants={fadeUp}
            className="mt-7 text-[17px] sm:text-[19px] text-[#475569] max-w-[580px] mx-auto leading-[1.72]"
          >
            Aether transforms your PRD into personas, flows, screens,
            prototypes, and developer-ready documentation — automatically.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial="hidden" animate="visible" custom={3} variants={fadeUp}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 16px 40px rgba(99,102,241,0.32)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/signup")}
              className="inline-flex items-center gap-2 px-7 py-[13px] bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[14.5px] font-semibold rounded-xl transition-colors shadow-[0_10px_30px_rgba(99,102,241,0.25)]"
            >
              Get Started <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "#F1F5F9" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex items-center gap-2 px-7 py-[13px] border border-[#E4E4E7] bg-white text-[#0F172A] text-[14.5px] font-medium rounded-xl transition-all"
            >
              See how it works
            </motion.button>
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial="hidden" animate="visible" custom={4} variants={fadeUp}
            className="mt-7 text-[13px] text-[#94A3B8] tracking-wide"
          >
            Built for designers, product teams, and builders
          </motion.p>
        </motion.div>

        {/* Floating product screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-5xl mx-auto mt-16 mb-[-48px] z-10"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              filter: "drop-shadow(0 32px 80px rgba(0,0,0,0.10)) drop-shadow(0 8px 24px rgba(99,102,241,0.08))",
            }}
          >
            <ScreenFrame src={aetherJourney} alt="Aether journey mapping interface" />
          </motion.div>
        </motion.div>

      </section>

      {/* ── Spacer to absorb overlap ──────────────────────────────────────── */}
      <div className="h-16 bg-[#FAFAFA]" />

      {/* ── Pipeline ─────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 border-t border-[#E4E4E7] bg-white">
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
              The Pipeline
            </p>
          </FadeIn>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PIPELINE.map((step, i) => (
              <FadeIn key={step.label} delay={i * 0.06} className="flex items-center gap-2">
                <motion.div
                  whileHover={{ y: -3, borderColor: "#C7D2FE", backgroundColor: "#EEF2FF", transition: { duration: 0.15 } }}
                  className="flex flex-col items-center gap-2.5 px-5 py-4 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] min-w-[88px] cursor-default transition-colors"
                >
                  <step.icon className="h-5 w-5 text-[#6366F1]" strokeWidth={1.5} />
                  <span className="text-[12px] font-medium text-[#0F172A]">{step.label}</span>
                </motion.div>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-[#CBD5E1] flex-shrink-0" strokeWidth={1.5} />
                )}
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-24 px-5 sm:px-8 border-t border-[#E4E4E7] bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <h2 className="text-[26px] sm:text-[32px] font-bold text-[#0F172A] tracking-[-0.02em]">
              How it works
            </h2>
            <p className="mt-2.5 text-[15px] text-[#64748B]">
              From document to design system in six steps
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: "easeOut" }}
                whileHover={{ y: -4, boxShadow: "0 10px 28px rgba(15,23,42,0.07)", transition: { duration: 0.18 } }}
                className="p-6 rounded-2xl border border-[#E4E4E7] bg-white cursor-default transition-shadow"
              >
                <span className="text-[12px] font-bold text-[#6366F1] tracking-wide">{step.n}</span>
                <h3 className="mt-3 text-[15px] font-semibold text-[#0F172A] leading-snug">{step.title}</h3>
                <p className="mt-1.5 text-[13px] text-[#64748B] leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tangible Outputs ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-5 sm:px-8 border-t border-[#E4E4E7] bg-white">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <h2 className="text-[26px] sm:text-[32px] font-bold text-[#0F172A] tracking-[-0.02em]">
              Tangible outputs
            </h2>
            <p className="mt-2.5 text-[15px] text-[#64748B]">
              Everything your team needs, generated automatically
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {OUTPUTS.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                whileHover={{ y: -3, boxShadow: "0 10px 28px rgba(15,23,42,0.07)", transition: { duration: 0.18 } }}
                className="flex items-start gap-4 p-6 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-white transition-all cursor-default"
              >
                <div className="p-2.5 rounded-xl bg-white border border-[#E4E4E7] flex-shrink-0">
                  <item.icon className="h-5 w-5 text-[#6366F1]" strokeWidth={1.5} />
                </div>
                <div className="pt-0.5">
                  <h3 className="text-[14px] font-semibold text-[#0F172A]">{item.title}</h3>
                  <p className="mt-1 text-[13px] text-[#64748B] leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FadeIn delay={0}>
              <ScreenFrame src={aetherPrototype} alt="Prototype prompts interface" />
            </FadeIn>
            <FadeIn delay={0.1}>
              <ScreenFrame src={aetherAudit} alt="UX audit interface" />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Differentiator ───────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-5 sm:px-8 border-t border-[#E4E4E7] bg-[#FAFAFA]">
        <FadeIn className="max-w-2xl mx-auto text-center space-y-3">
          <p className="text-[18px] sm:text-[22px] text-[#94A3B8] font-medium leading-snug">
            Most tools help you design screens.
          </p>
          <p className="text-[22px] sm:text-[30px] font-bold text-[#0F172A] leading-snug tracking-[-0.02em]">
            Aether helps you design the entire product system.
          </p>
        </FadeIn>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-5 sm:px-8 border-t border-[#E4E4E7] bg-white">
        <div className="max-w-xl mx-auto text-center">
          <FadeIn>
            <h2 className="text-[24px] sm:text-[32px] font-bold text-[#0F172A] tracking-[-0.02em] mb-3">
              Start building your product system
            </h2>
            <p className="text-[15px] text-[#64748B] mb-9">
              From idea to design system — in minutes, not months.
            </p>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 16px 40px rgba(99,102,241,0.28)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/signup")}
              className="inline-flex items-center gap-2 px-8 py-[14px] bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[14.5px] font-semibold rounded-xl transition-colors shadow-[0_10px_30px_rgba(99,102,241,0.22)]"
            >
              Get Started <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </motion.button>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="py-8 px-5 sm:px-8 border-t border-[#E4E4E7] bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-[#0F172A]">Aether</span>
          <span className="text-[12px] text-[#94A3B8]">© 2026 Aether · Design Intelligence Pipeline</span>
          <div className="flex gap-6">
            {["Product", "Docs", "GitHub"].map(link => (
              <a key={link} href="#" className="text-[13px] text-[#94A3B8] hover:text-[#64748B] transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
