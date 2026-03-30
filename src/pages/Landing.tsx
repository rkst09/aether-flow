import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import {
  Upload, Users, Map, Layout, Code2, FileText,
  ArrowRight, Sparkles, Search, PenLine, FileCheck,
  ChevronRight,
} from "lucide-react";
import aetherJourney   from "@/assets/aether-journey.png";
import aetherPrototype from "@/assets/aether-prototype.png";
import aetherAudit     from "@/assets/aether-audit.png";
import aetherLogo      from "@/assets/aether-logo.png";

// ─── Data ─────────────────────────────────────────────────────────────────────

const PIPELINE = [
  { icon: Upload,   label: "Upload",    n: "01" },
  { icon: Users,    label: "Personas",  n: "02" },
  { icon: Map,      label: "Journeys",  n: "03" },
  { icon: Layout,   label: "Screens",   n: "04" },
  { icon: Code2,    label: "Prototype", n: "05" },
  { icon: FileText, label: "Docs",      n: "06" },
];

const FEATURES = [
  {
    icon: Users,
    title: "AI-Generated Personas",
    desc: "Extract precise user archetypes from your PRD — complete with goals, pain points, and confidence scores.",
  },
  {
    icon: Map,
    title: "Emotional Journey Maps",
    desc: "Per-persona journey maps showing every stage, touchpoint, emotion, and friction point in the experience.",
  },
  {
    icon: Layout,
    title: "Complete Screen Lists",
    desc: "Every screen your product requires, mapped to personas with entry points, exit points, and component hints.",
  },
  {
    icon: Code2,
    title: "Prototype Prompts",
    desc: "Lovable-ready builder prompts for every screen, grouped by persona and ready to paste directly.",
  },
  {
    icon: Search,
    title: "UX Audit Reports",
    desc: "Heuristic evaluation of flows — friction, accessibility gaps, missing states, and priority-rated fixes.",
  },
  {
    icon: FileText,
    title: "BA Handoff Docs",
    desc: "Fully annotated documentation with interaction logic, edge cases, and validation rules — export as .docx.",
  },
];

const STATS = [
  { value: "6",    label: "Pipeline phases" },
  { value: "10×",  label: "Faster than manual" },
  { value: "100%", label: "Designer-controlled" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScreenFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-[18px] border border-[#E2E8F0] overflow-hidden bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#F1F5F9] bg-[#F8FAFC]">
        <div className="h-2 w-2 rounded-full bg-[#FDA4AF]" />
        <div className="h-2 w-2 rounded-full bg-[#FCD34D]" />
        <div className="h-2 w-2 rounded-full bg-[#6EE7B7]" />
        <div className="ml-auto h-4 w-28 rounded-full bg-[#E2E8F0]" />
      </div>
      <img src={src} alt={alt} className="w-full block" />
    </div>
  );
}

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-32px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();

  // Cursor follow glow
  const heroRef = useRef<HTMLElement>(null);
  const [glowPos, setGlowPos] = useState({ x: "50%", y: "40%" });
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setGlowPos({
      x: ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + "%",
      y: ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + "%",
    });
  }, []);

  // Scroll parallax
  const { scrollY } = useScroll();
  const rawY       = useTransform(scrollY, [0, 600], [0, -70]);
  const heroY      = useSpring(rawY, { stiffness: 80, damping: 20 });
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A] antialiased overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-14 flex items-center border-b border-[#E4E4E7] bg-[#FAFAFA]/90 backdrop-blur-md">
        <div className="w-full max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={aetherLogo} alt="Aether" className="h-6 w-6 object-contain" />
            <span className="text-[14.5px] font-bold tracking-[-0.01em] text-[#0F172A]">
              Aether
            </span>
          </a>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-1.5 text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-all"
            >
              Log in
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/signup")}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-[13px] font-semibold rounded-lg transition-colors"
            >
              Get started
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative min-h-[100svh] flex flex-col items-center justify-center pt-14 pb-0 overflow-hidden"
      >
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
          {/* Radial mask to fade grid at edges */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 30%, #FAFAFA 80%)",
            }}
          />
          {/* Top glow */}
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 65%)",
            }}
          />
          {/* Cursor glow */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(600px circle at ${glowPos.x} ${glowPos.y}, rgba(99,102,241,0.06), transparent 50%)`,
            }}
            transition={{ type: "tween", duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Content */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center text-center px-5 sm:px-8 max-w-[860px] mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-3.5 py-1 mt-10 mb-8"
          >
            <Sparkles className="h-3 w-3 text-[#6366F1]" strokeWidth={2} />
            <span className="text-[11.5px] font-semibold text-[#6366F1] tracking-wide">
              AI-powered design intelligence
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-[30px] sm:text-[38px] lg:text-[46px] font-bold leading-[1.15] tracking-[-0.03em] text-[#0F172A]"
          >
            Everything your product needs,
            <br />
            designed before you <span className="text-[#6366F1]">start designing.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 text-[16px] sm:text-[18px] text-[#475569] leading-[1.75] max-w-[540px]"
          >
            Upload your product requirements doc. Aether generates personas,
            journey maps, screens, prototype prompts, and developer-ready documentation — automatically.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 12px 36px rgba(99,102,241,0.3)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/signup")}
              className="flex items-center gap-2 px-7 py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[14px] font-semibold rounded-xl transition-colors shadow-[0_8px_24px_rgba(99,102,241,0.24)]"
            >
              Start for free
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "#F1F5F9" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-2 px-7 py-3.5 bg-white border border-[#E4E4E7] text-[#0F172A] text-[14px] font-medium rounded-xl transition-all hover:border-[#CBD5E1]"
            >
              See what it builds
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.42 }}
            className="mt-12 flex items-center gap-8 sm:gap-12"
          >
            {STATS.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-[22px] font-bold text-[#0F172A] tracking-tight">{s.value}</span>
                <span className="text-[11.5px] text-[#94A3B8] font-medium">{s.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Hero screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-5xl mx-auto mt-16 px-5 sm:px-8 mb-[-64px]"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.10)) drop-shadow(0 8px 20px rgba(99,102,241,0.06))",
            }}
          >
            <ScreenFrame src={aetherJourney} alt="Aether journey mapping" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Overlap spacer ─────────────────────────────────────────────────── */}
      <div className="h-24 bg-white" />

      {/* ── Pipeline strip ─────────────────────────────────────────────────── */}
      <section className="py-14 px-5 sm:px-8 bg-white border-y border-[#F1F5F9]">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">
              The Pipeline
            </p>
          </FadeUp>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {PIPELINE.map((step, i) => (
              <FadeUp key={step.label} delay={i * 0.055}>
                <motion.div
                  whileHover={{ y: -4, borderColor: "#C7D2FE", backgroundColor: "#EEF2FF", transition: { duration: 0.15 } }}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] cursor-default transition-colors"
                >
                  <div className="h-9 w-9 rounded-xl bg-white border border-[#E4E4E7] flex items-center justify-center">
                    <step.icon className="h-4 w-4 text-[#6366F1]" strokeWidth={1.75} />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[#CBD5E1] tracking-widest">{step.n}</p>
                    <p className="text-[12px] font-semibold text-[#0F172A]">{step.label}</p>
                  </div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 px-5 sm:px-8 bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="max-w-lg mb-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6366F1] mb-3">
              What it builds
            </p>
            <h2 className="text-[28px] sm:text-[36px] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.15]">
              A complete design system,
              <br />
              not just outputs.
            </h2>
            <p className="mt-4 text-[15px] text-[#64748B] leading-relaxed">
              Aether doesn't generate isolated artefacts. It builds a connected
              system — each phase informed by the last.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.055}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(15,23,42,0.07)", transition: { duration: 0.18 } }}
                  className="p-5 rounded-2xl border border-[#E4E4E7] bg-white cursor-default h-full"
                >
                  <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center mb-4">
                    <f.icon className="h-4 w-4 text-[#6366F1]" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-[14px] font-semibold text-[#0F172A] leading-snug mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-[13px] text-[#64748B] leading-relaxed">{f.desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Screenshot pair ────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-5 sm:px-8 bg-white border-t border-[#F1F5F9]">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center max-w-xl mx-auto mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6366F1] mb-3">
              Live in the tool
            </p>
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] tracking-[-0.025em]">
              Built for real design work
            </h2>
            <p className="mt-3 text-[15px] text-[#64748B] leading-relaxed">
              Every screen, every prompt, every annotation — reviewed and confirmed by you.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FadeUp delay={0}>
              <ScreenFrame src={aetherPrototype} alt="Prototype prompts" />
            </FadeUp>
            <FadeUp delay={0.1}>
              <ScreenFrame src={aetherAudit} alt="UX audit report" />
            </FadeUp>
          </div>

          <FadeUp delay={0.15} className="mt-5">
            <div className="rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] p-6 flex flex-col sm:flex-row items-center gap-5 sm:gap-8 text-center sm:text-left">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-[#6366F1]" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#0F172A] mb-1">
                  BA-Ready Handoff Document
                </p>
                <p className="text-[13px] text-[#64748B]">
                  Phase 06 exports a fully annotated Word document — screen annotations,
                  interaction logic, edge cases, and validation rules — ready for your engineering team.
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E4E4E7] bg-white text-[12.5px] font-medium text-[#64748B]">
                <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                Export .docx
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Pull quote ─────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-5 sm:px-8 bg-[#0F172A]">
        <div className="max-w-3xl mx-auto text-center">
          <FadeUp>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#6366F1] mb-6">
              The difference
            </p>
            <blockquote className="text-[24px] sm:text-[34px] font-bold text-white leading-[1.25] tracking-[-0.02em]">
              Most tools help you design screens.
              <br />
              <span className="text-[#818CF8]">
                Aether helps you design the entire product.
              </span>
            </blockquote>
          </FadeUp>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-5 sm:px-8 bg-[#FAFAFA] border-t border-[#F1F5F9]">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center max-w-xl mx-auto mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6366F1] mb-3">
              How it works
            </p>
            <h2 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] tracking-[-0.025em]">
              From document to system in 6 steps
            </h2>
          </FadeUp>

          <div className="relative">
            <div className="space-y-4">
              {PIPELINE.map((step, i) => (
                <FadeUp key={step.label} delay={i * 0.065}>
                  <motion.div
                    whileHover={{ x: 4, transition: { duration: 0.18 } }}
                    className="flex items-start gap-5 p-5 rounded-2xl border border-[#E4E4E7] bg-white cursor-default"
                  >
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center">
                      <span className="text-[11px] font-bold text-[#6366F1]">{step.n}</span>
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[14px] font-semibold text-[#0F172A]">{step.label}</p>
                      <p className="text-[13px] text-[#64748B] mt-0.5 leading-relaxed">
                        {[
                          "Drop your PRD and Aether extracts every relevant signal automatically.",
                          "AI identifies user archetypes with goals, pain points, and confidence scores.",
                          "Emotional journey maps per persona — stages, touchpoints, and friction points.",
                          "Every screen your product needs, mapped to personas with component hints.",
                          "Lovable-ready prompts for every screen, grouped by persona. Copy and build.",
                          "Fully annotated BA handoff — interaction logic, edge cases, and validation rules.",
                        ][i]}
                      </p>
                    </div>
                  </motion.div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-5 sm:px-8 bg-white border-t border-[#F1F5F9]">
        <div className="max-w-2xl mx-auto">
          <FadeUp>
            <div
              className="relative rounded-3xl overflow-hidden p-10 sm:p-14 text-center"
              style={{
                background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #F0F9FF 100%)",
                border: "1px solid #C7D2FE",
              }}
            >
              {/* Glow blob */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full blur-3xl opacity-40 pointer-events-none"
                style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.4) 0%, transparent 70%)" }}
              />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white border border-[#C7D2FE] shadow-sm mx-auto mb-7">
                  <img src={aetherLogo} alt="Aether" className="h-8 w-8 object-contain" />
                </div>

                <h2 className="text-[26px] sm:text-[34px] font-bold text-[#0F172A] tracking-[-0.025em] leading-[1.2] mb-4">
                  Start building your
                  <br />
                  product system today
                </h2>
                <p className="text-[15px] text-[#64748B] leading-relaxed mb-9 max-w-md mx-auto">
                  From PRD to design system — personas, flows, screens, prototypes, and docs —
                  in minutes, not months.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: "0 16px 40px rgba(99,102,241,0.32)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate("/signup")}
                    className="flex items-center gap-2 px-8 py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[14px] font-semibold rounded-xl transition-colors shadow-[0_8px_24px_rgba(99,102,241,0.3)]"
                  >
                    Get started for free
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </motion.button>
                  <button
                    onClick={() => navigate("/login")}
                    className="text-[13.5px] text-[#64748B] hover:text-[#0F172A] transition-colors font-medium"
                  >
                    Already have an account? Log in
                  </button>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-5 sm:px-8 border-t border-[#F1F5F9] bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={aetherLogo} alt="Aether" className="h-5 w-5 object-contain" />
            <span className="text-[13.5px] font-bold text-[#0F172A]">Aether</span>
          </div>
          <span className="text-[11.5px] text-[#94A3B8]">
            © 2026 Aether · Design Intelligence Pipeline
          </span>
          <div className="flex gap-5">
            {["Product", "Docs", "GitHub"].map(link => (
              <a
                key={link}
                href="#"
                className="text-[12.5px] text-[#94A3B8] hover:text-[#64748B] transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
