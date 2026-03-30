import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Project } from "@/lib/database.types";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { ArrowRight, Plus, Search, PenLine } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHASE_LABELS = ["Design Intake", "Screen Derivation", "Prototype", "UX Audit", "UX Copywriting", "Documentation"];
const PHASE_ROUTE_SUFFIXES = ["/phase/01", "/phase/02", "/phase/03", "/phase/04", "/phase/05", "/phase/06"];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

const CORE_ACTIONS = [
  {
    icon: Search,
    title: "UX Audit",
    desc: "Evaluate usability, detect friction, and improve experience.",
    cta: "Run Audit",
    routeSuffix: "/phase/04",
  },
  {
    icon: PenLine,
    title: "UX Copywriting",
    desc: "Refine microcopy for clarity, tone, and conversions.",
    cta: "Improve Copy",
    routeSuffix: "/phase/05",
  },
];

// ─── Animation helper ─────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(4)
      .then(({ data }) => setProjects(data ?? []));
  }, [user]);

  const currentProject = projects[0] ?? null;
  const recentProjects  = projects.slice(1, 4);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: "#FAFAFA" }}>
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">

          {/* ── Top bar ───────────────────────────────────────────────── */}
          <header
            className="h-12 flex items-center shrink-0 px-6"
            style={{ borderBottom: "1px solid #E5E7EB", background: "#FFFFFF" }}
          >
            <SidebarTrigger className="text-[#94A3B8] hover:text-[#475569] transition-colors" />
          </header>

          {/* ── Main content ──────────────────────────────────────────── */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 py-10 space-y-7">

              {/* 1 ── Context header (no CTA) ────────────────────────── */}
              <motion.div {...fadeUp(0)}>
                <h1 className="text-[22px] font-semibold text-[#0F172A] tracking-tight">
                  Continue building your product system
                </h1>
                <p className="text-[14px] text-[#475569] mt-1 leading-relaxed">
                  Pick up where you left off or start a new structured workflow.
                </p>
              </motion.div>

              {/* 2 ── Start new (PRIMARY) ─────────────────────────────── */}
              <motion.div {...fadeUp(0.06)}>
                <motion.div
                  whileHover={{ y: -2, boxShadow: "0 12px 36px rgba(15,23,42,0.08)" }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-white rounded-[20px] p-7 cursor-pointer"
                  style={{ border: "1px solid #E5E7EB" }}
                  onClick={() => navigate("/project/intake")}
                >
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <p className="text-[18px] font-bold text-[#0F172A] tracking-tight mb-1.5">
                        Start a new product system
                      </p>
                      <p className="text-[13px] text-[#64748B] leading-relaxed">
                        Upload a PRD and Aether builds your full design workflow from scratch.
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(99,102,241,0.28)" }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13.5px] font-semibold text-white shrink-0"
                      style={{ background: "#6366F1", boxShadow: "0 4px 16px rgba(99,102,241,0.2)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#4F46E5")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#6366F1")}
                      onClick={e => { e.stopPropagation(); navigate("/project/intake"); }}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                      Create Project
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>

              {/* 3 ── Current project (SECONDARY) ────────────────────── */}
              {currentProject && (
                <motion.div {...fadeUp(0.1)}>
                  <motion.div
                    whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(15,23,42,0.07)" }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="bg-white rounded-[20px] p-7 cursor-pointer"
                    style={{ border: "1px solid #E5E7EB" }}
                    onClick={() => navigate(`/project/${currentProject.id}`)}
                  >
                    <div className="flex items-start justify-between gap-6">

                      {/* Left */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: "#EEF2FF", color: "#4338CA" }}
                          >
                            Phase {String(currentProject.current_phase ?? 1).padStart(2, "0")}
                          </span>
                          <span className="text-[12px] text-[#94A3B8]">·</span>
                          <span className="text-[12px] text-[#94A3B8]">
                            {PHASE_LABELS[((currentProject.current_phase ?? 1) - 1)] ?? "Design Intake"}
                          </span>
                        </div>

                        <h2 className="text-[18px] font-bold text-[#0F172A] tracking-tight mb-1.5">
                          {currentProject.name}
                        </h2>
                        <p className="text-[13px] text-[#64748B] mb-5">
                          Last updated {relativeTime(currentProject.updated_at)}
                        </p>

                        {/* Progress */}
                        <div className="flex gap-1">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-1 flex-1 rounded-full"
                              style={{
                                background: i + 1 < (currentProject.current_phase ?? 1) ? "#6366F1" :
                                            i + 1 === (currentProject.current_phase ?? 1) ? "#6366F1" : "#E5E7EB",
                                opacity: i + 1 === (currentProject.current_phase ?? 1) ? 0.5 : 1,
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Right CTA */}
                      <div className="flex flex-col items-end gap-2.5 shrink-0 pt-1">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-colors"
                          style={{ border: "1.5px solid #6366F1", color: "#6366F1", background: "transparent" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#EEF2FF"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/project/${currentProject.id}${PHASE_ROUTE_SUFFIXES[(currentProject.current_phase - 1)] ?? "/phase/01"}`);
                          }}
                        >
                          Resume
                          <ArrowRight className="h-4 w-4" strokeWidth={2} />
                        </motion.button>
                        <span className="text-[11px] text-[#94A3B8] text-right leading-snug">
                          Continue from<br />
                          <span className="text-[#64748B] font-medium">
                            {PHASE_LABELS[((currentProject.current_phase ?? 1) - 1)] ?? "Design Intake"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* 4 ── Core actions ────────────────────────────────────── */}
              <motion.div {...fadeUp(0.14)} className="space-y-3">
                <h2 className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]">
                  Start instantly
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CORE_ACTIONS.map((action, i) => (
                    <motion.div
                      key={action.title}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.18 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{
                        y: -3,
                        boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
                        borderColor: "#6366F1",
                        transition: { duration: 0.18 },
                      }}
                      className="group bg-white rounded-2xl p-6 cursor-pointer"
                      style={{ border: "1px solid #E5E7EB" }}
                      onClick={() => currentProject ? navigate(`/project/${currentProject.id}${action.routeSuffix}`) : navigate("/project/intake")}
                    >
                      {/* Icon */}
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}
                      >
                        <action.icon className="h-[18px] w-[18px] text-[#6366F1]" strokeWidth={1.75} />
                      </div>

                      {/* Text */}
                      <h3 className="text-[15px] font-semibold text-[#0F172A] mb-1">{action.title}</h3>
                      <p className="text-[13px] text-[#64748B] leading-relaxed mb-5">{action.desc}</p>

                      {/* CTA */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[13px] font-semibold transition-colors"
                          style={{ color: "#6366F1" }}
                        >
                          {action.cta}
                        </span>
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                          style={{ color: "#6366F1" }}
                          strokeWidth={2}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* 5 ── Recent projects ─────────────────────────────────── */}
              {recentProjects.length > 0 && (
                <motion.div {...fadeUp(0.2)} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-semibold text-[#0F172A]">
                      Recent Projects
                    </h2>
                    <button
                      onClick={() => navigate("/projects")}
                      className="text-[12px] font-medium text-[#6366F1] hover:text-[#4338CA] transition-colors"
                    >
                      View all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {recentProjects.map((project, i) => {
                      const phase = project.current_phase ?? 1;
                      const phaseShort = `Phase ${String(phase).padStart(2, "0")}`;
                      const progress = Math.round(((phase - 1) / 6) * 100);
                      return (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.24 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                          whileHover={{ y: -3, boxShadow: "0 10px 28px rgba(15,23,42,0.08)" }}
                          className="bg-white rounded-2xl overflow-hidden cursor-pointer"
                          style={{ border: "1px solid #E5E7EB" }}
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          {/* Thumbnail */}
                          <div
                            className="w-full flex items-center justify-center"
                            style={{ height: "96px", background: "#F1F5F9" }}
                          >
                            <div
                              className="rounded-lg"
                              style={{ width: "72px", height: "48px", background: "#E2E8F0" }}
                            />
                          </div>

                          {/* Info */}
                          <div className="p-4">
                            <p className="text-[14px] font-semibold text-[#0F172A] truncate mb-2">
                              {project.name}
                            </p>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[12px] text-[#94A3B8]">
                                {relativeTime(project.updated_at)}
                              </span>
                              <span
                                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: "#EEF2FF", color: "#4338CA" }}
                              >
                                {phaseShort}
                              </span>
                            </div>
                            <div className="h-[3px] w-full rounded-full" style={{ background: "#E5E7EB" }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.max(progress, 8)}%`, background: "#6366F1" }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
