import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Plus, Check, Circle, ArrowRight, Upload, Users, Map, Layout, Sparkles, BookOpen } from "lucide-react";
import aetherLogo from "@/assets/aether-logo.png";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Project } from "@/lib/database.types";

// ─── StandaloneProjectCard ────────────────────────────────────────────────────

function StandaloneProjectCard({ project, index, onClick }: { project: Project; index: number; onClick: () => void }) {
  const isAudit = project.product_type === "ux_audit";
  const badge = isAudit ? "UX Audit" : "UX Copywriting";
  const badgeColor = isAudit
    ? "bg-violet-50 text-violet-700 border-violet-200"
    : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="surface-elevated rounded-xl p-5 shadow-soft text-left hover:shadow-elevated transition-shadow group w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor}`}>{badge}</span>
        <span className="text-[11px] text-muted-foreground">{relativeTime(project.updated_at)}</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1 truncate">{project.name}</h3>
      {project.description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{project.description}</p>
      )}
      {project.tags?.[0] && (
        <p className="text-[10px] text-muted-foreground mt-2">{project.tags[0]}</p>
      )}
      <p className="text-[11px] font-semibold text-accent mt-3 flex items-center gap-1">
        View Results <ArrowRight className="h-3 w-3" strokeWidth={2} />
      </p>
    </motion.button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PhaseStatus = "done" | "in-progress" | "pending";

const PHASE_LABELS = ["Intake", "Screens", "Prototype", "Audit", "Copy", "Docs"];

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

function phaseStatuses(current: number): PhaseStatus[] {
  return Array.from({ length: 6 }, (_, i) => {
    if (i + 1 < current) return "done";
    if (i + 1 === current) return "in-progress";
    return "pending";
  });
}

// ─── PhaseIndicator ───────────────────────────────────────────────────────────

function PhaseIndicator({ status, index }: { status: PhaseStatus; index: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-col items-center">
        {index > 0 && (
          <div className={`w-px h-3 -mb-0.5 ${
            status === "done" ? "bg-[hsl(var(--success))]" :
            status === "in-progress" ? "bg-accent" : "bg-border"
          }`} />
        )}
        <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${
          status === "done" ? "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]" :
          status === "in-progress" ? "bg-accent-soft text-accent" :
          "bg-secondary text-muted-foreground"
        }`}>
          {status === "done" ? <Check className="h-3 w-3" strokeWidth={2} /> :
           status === "in-progress" ? <Circle className="h-2.5 w-2.5 fill-current" /> :
           <span>{index + 1}</span>}
        </div>
        {index < 5 && (
          <div className={`w-px h-3 -mt-0.5 ${status === "done" ? "bg-[hsl(var(--success))]" : "bg-border"}`} />
        )}
      </div>
      <span className={`text-[12px] leading-none ${
        status === "done" ? "text-foreground" :
        status === "in-progress" ? "text-accent font-medium" : "text-muted-foreground"
      }`}>
        {PHASE_LABELS[index]}
        {status === "done" && <span className="text-muted-foreground ml-1.5">Done</span>}
        {status === "in-progress" && <span className="text-accent ml-1.5">In Progress</span>}
      </span>
    </div>
  );
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────

function ProjectCard({ project, index, onClick }: { project: Project; index: number; onClick: () => void }) {
  const statuses = phaseStatuses(project.current_phase);
  const completedCount = statuses.filter(s => s === "done").length;
  const progress = Math.round((completedCount / 6) * 100);

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.01, y: -2 }}
      className="surface-elevated rounded-xl p-5 shadow-soft text-left hover:shadow-elevated transition-shadow group w-full"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground truncate pr-2">{project.name}</h3>
        <span className="text-[11px] text-muted-foreground shrink-0">{relativeTime(project.updated_at)}</span>
      </div>

      <div className="space-y-0">
        {statuses.map((status, i) => (
          <PhaseIndicator key={i} status={status} index={i} />
        ))}
      </div>

      <div className="h-1 w-full bg-secondary rounded-full mt-4 overflow-hidden">
        <div className="h-full gradient-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>
    </motion.button>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="surface-elevated rounded-xl p-5 shadow-soft animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3.5 w-32 bg-slate-200 rounded-full" />
        <div className="h-3 w-12 bg-slate-100 rounded-full" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded-full bg-slate-200" />
            <div className="h-3 w-16 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
      <div className="h-1 w-full bg-slate-100 rounded-full mt-4" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { icon: Upload,   label: "Upload"    },
  { icon: Users,    label: "Personas"  },
  { icon: Map,      label: "Journeys"  },
  { icon: Layout,   label: "Screens"   },
  { icon: Sparkles, label: "Prompts"   },
  { icon: BookOpen, label: "Docs"      },
];

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center py-14 px-6 text-center"
    >
      {/* Brand mark */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6"
      >
        <img
          src={aetherLogo}
          alt="Aether"
          className="h-14 w-14 object-contain rounded-2xl"
          style={{ background: "#EEF2FF", padding: "10px" }}
        />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="text-[22px] font-bold text-[#0F172A] tracking-tight mb-2"
      >
        Your workspace is empty
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-[14px] text-[#64748B] leading-relaxed max-w-[360px] mb-10"
      >
        Upload a product requirements doc — Aether builds your full design workflow from scratch.
      </motion.p>

      {/* Pipeline preview */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="flex items-center flex-wrap justify-center gap-1.5 mb-10"
      >
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "#F1F5F9", border: "1px solid #E5E7EB" }}
            >
              <step.icon className="h-3.5 w-3.5" style={{ color: "#6366F1" }} strokeWidth={1.75} />
              <span className="text-[11px] font-medium" style={{ color: "#64748B" }}>{step.label}</span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="h-px w-3 shrink-0" style={{ background: "#E2E8F0" }} />
            )}
          </div>
        ))}
      </motion.div>

      {/* CTA card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <motion.div
          whileHover={{ y: -3, boxShadow: "0 16px 48px rgba(99,102,241,0.12)" }}
          transition={{ duration: 0.2 }}
          onClick={onStart}
          className="bg-white rounded-[20px] p-6 cursor-pointer flex items-center gap-5"
          style={{ border: "1px solid #E5E7EB" }}
        >
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}
          >
            <Plus className="h-5 w-5 text-[#6366F1]" strokeWidth={2.5} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-bold text-[#0F172A]">Start your first project</p>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Upload a PRD and begin your design workflow
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#6366F1]" strokeWidth={2} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border px-4 shrink-0" style={{ background: "#FFFFFF" }}>
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

              {/* Start New Project button — always visible */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.02, y: -1 }}
                onClick={() => navigate("/project/intake")}
                className="surface-elevated rounded-xl px-5 py-4 shadow-soft hover:shadow-elevated transition-shadow flex items-center gap-3 group"
              >
                <div className="h-9 w-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors">
                  <Plus className="h-4 w-4 text-accent" strokeWidth={1.5} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Start New Project</p>
                  <p className="text-[12px] text-muted-foreground">Begin a new 6-phase design workflow</p>
                </div>
              </motion.button>

              {/* Loading */}
              {loading && (
                <section className="space-y-4">
                  <div className="h-4 w-28 bg-slate-200 rounded-full animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {!loading && projects.length === 0 && (
                <EmptyState onStart={() => navigate("/project/intake")} />
              )}

              {/* Projects grid */}
              {!loading && projects.length > 0 && (() => {
                const standaloneTypes = ["ux_audit", "ux_copywriting"];
                const pipelineProjects   = projects.filter(p => !standaloneTypes.includes(p.product_type));
                const standaloneProjects = projects.filter(p => standaloneTypes.includes(p.product_type));

                const handleStandaloneClick = (project: Project) => {
                  if (project.product_type === "ux_audit") {
                    navigate(`/tools/ux-audit?project=${project.id}`);
                  } else {
                    navigate(`/tools/ux-copywriting?project=${project.id}`);
                  }
                };

                return (
                  <>
                    {pipelineProjects.length > 0 && (
                      <section className="space-y-4">
                        <h2 className="text-sm font-medium text-foreground">Projects</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {pipelineProjects.map((project, i) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              index={i}
                              onClick={() => navigate(`/project/${project.id}`)}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {standaloneProjects.length > 0 && (
                      <section className="space-y-4">
                        <h2 className="text-sm font-medium text-foreground">Standalone Audits</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {standaloneProjects.map((project, i) => (
                            <StandaloneProjectCard
                              key={project.id}
                              project={project}
                              index={i}
                              onClick={() => handleStandaloneClick(project)}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                );
              })()}

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Projects;
