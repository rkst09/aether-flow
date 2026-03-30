import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/lib/database.types";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import {
  ArrowLeft, ArrowRight, Check, Lock, FileText, Upload, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "done" | "active" | "locked";

interface WorkflowStep {
  number: string;
  title: string;
  description: string;
  status: StepStatus;
  meta: string | null;
  route: string;
}

interface InputFile {
  name: string;
  size: string;
  uploaded: string;
}

interface GeneratedOutput {
  name: string;
  count: number | null;
  status: "ready" | "pending";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const OUTPUT_PHASES = [
  { name: "Personas",          phase: 1 },
  { name: "Journey Maps",      phase: 2 },
  { name: "Design Backlog",    phase: 3 },
  { name: "Screen List",       phase: 4 },
  { name: "Prototype Prompts", phase: 5 },
  { name: "Documentation",     phase: 8 },
];

function buildOutputs(currentPhase: number): GeneratedOutput[] {
  return OUTPUT_PHASES.map(o => ({
    name:   o.name,
    count:  null,
    status: currentPhase > o.phase ? "ready" : "pending",
  }));
}

function buildWorkflowSteps(projectId: string): WorkflowStep[] {
  return [
    {
      number: "01",
      title: "Define user personas",
      description: "Extract and validate key user archetypes from your PRD",
      status: "done",
      meta: "3 personas confirmed",
      route: `/project/${projectId}/phase/01`,
    },
    {
      number: "02",
      title: "Map emotional journeys",
      description: "Visualise how each persona moves through your product",
      status: "done",
      meta: "3 journey maps created",
      route: `/project/${projectId}/phase/01/journey`,
    },
    {
      number: "03",
      title: "Structure design tasks",
      description: "Build a prioritised backlog from personas and journeys",
      status: "done",
      meta: "18 tasks in backlog",
      route: `/project/${projectId}/phase/01/backlog`,
    },
    {
      number: "04",
      title: "Derive product screens",
      description: "Generate a structured screen inventory from the backlog",
      status: "active",
      meta: "12 screens need review",
      route: `/project/${projectId}/phase/02`,
    },
    {
      number: "05",
      title: "Generate builder prompts",
      description: "Create Lovable-ready prompts for each confirmed screen",
      status: "locked",
      meta: null,
      route: `/project/${projectId}/phase/03`,
    },
    {
      number: "06",
      title: "Evaluate usability & friction",
      description: "Run a heuristic audit across screens and user flows",
      status: "locked",
      meta: null,
      route: `/project/${projectId}/phase/04`,
    },
    {
      number: "07",
      title: "Refine microcopy & tone",
      description: "Review and improve all product copy across screens",
      status: "locked",
      meta: null,
      route: `/project/${projectId}/phase/05`,
    },
    {
      number: "08",
      title: "Export BA handoff docs",
      description: "Generate structured documentation ready for your dev team",
      status: "locked",
      meta: null,
      route: `/project/${projectId}/phase/06`,
    },
  ];
}

// ─── Animation helper ─────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
});

// ─── Step dot ─────────────────────────────────────────────────────────────────

function StepDot({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "#ECFDF5", border: "1.5px solid #A7F3D0" }}
      >
        <Check className="h-4 w-4" style={{ color: "#059669" }} strokeWidth={2.5} />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "#EEF2FF", border: "1.5px solid #6366F1" }}
      >
        <div className="h-3 w-3 rounded-full" style={{ background: "#6366F1" }} />
      </div>
    );
  }
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
      style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}
    >
      <Lock className="h-3.5 w-3.5" style={{ color: "#CBD5E1" }} strokeWidth={1.75} />
    </div>
  );
}

// ─── Step row ─────────────────────────────────────────────────────────────────

function StepRow({
  step,
  isLast,
  navigate,
}: {
  step: WorkflowStep;
  isLast: boolean;
  navigate: (to: string) => void;
}) {
  const isClickable = step.status !== "locked";
  const connectorColor = step.status === "done" ? "#D1FAE5" : "#E5E7EB";

  return (
    <div className="flex gap-5">
      {/* Left column: dot + connector line */}
      <div className="flex flex-col items-center shrink-0" style={{ width: "40px" }}>
        <StepDot status={step.status} />
        {!isLast && (
          <div
            className="w-px flex-1"
            style={{ background: connectorColor, minHeight: "28px" }}
          />
        )}
      </div>

      {/* Right column: step content */}
      <motion.div
        whileHover={isClickable ? { x: 3 } : {}}
        transition={{ duration: 0.15, ease: "easeOut" }}
        onClick={isClickable ? () => navigate(step.route) : undefined}
        className={`flex-1 flex items-start justify-between gap-4 group ${
          isClickable ? "cursor-pointer" : "cursor-default"
        }`}
        style={{ paddingTop: "8px", paddingBottom: isLast ? "4px" : "28px" }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium mb-1.5" style={{ color: "#94A3B8" }}>
            {step.number}
          </p>
          <p
            className="text-[15px] font-semibold leading-snug"
            style={{ color: step.status === "locked" ? "#CBD5E1" : "#0F172A" }}
          >
            {step.title}
          </p>
          <p
            className="text-[13px] leading-relaxed mt-1"
            style={{ color: step.status === "locked" ? "#CBD5E1" : "#64748B" }}
          >
            {step.description}
          </p>
          {step.meta && (
            <div className="mt-2.5">
              <span
                className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={
                  step.status === "done"
                    ? { background: "#F0FDF4", color: "#059669" }
                    : { background: "#EEF2FF", color: "#4338CA" }
                }
              >
                {step.meta}
              </span>
            </div>
          )}
        </div>

        {/* Hover CTA */}
        {isClickable && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 pt-0.5">
            <span className="text-[13px] font-medium" style={{ color: "#6366F1" }}>
              Open
            </span>
            <ArrowRight className="h-3.5 w-3.5" style={{ color: "#6366F1" }} strokeWidth={2} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Derive workflow steps from current_phase ────────────────────────────────

function buildSteps(currentPhase: number, workflowSteps: WorkflowStep[]): WorkflowStep[] {
  return workflowSteps.map((s, i) => {
    const phase = i + 1;
    const status: StepStatus =
      phase < currentPhase  ? "done"   :
      phase === currentPhase ? "active" : "locked";
    return { ...s, status };
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProjectDetail = () => {
  const navigate       = useNavigate();
  const { id }         = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setFetchError(error.message);
        } else {
          setProject(data);
        }
        setLoading(false);
      });
  }, [id]);

  const workflowSteps  = id ? buildWorkflowSteps(id) : [];
  const steps          = buildSteps(project?.current_phase ?? 1, workflowSteps);
  const activeStep     = steps.find((s) => s.status === "active");
  const generatedOutputs = buildOutputs(project?.current_phase ?? 1);
  const inputFiles     = project?.prd_filename
    ? [{ name: project.prd_filename, size: "—", uploaded: new Date(project.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) }]
    : [];

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full" style={{ background: "#FAFAFA" }}>
          <AppSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF", border: "1.5px solid #C7D2FE" }}>
                <div className="h-4 w-4 rounded-sm bg-[#6366F1]" />
              </div>
              <div className="h-1 w-20 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
                <div className="h-full rounded-full bg-[#6366F1] animate-pulse" style={{ width: "50%" }} />
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (fetchError || !project) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full" style={{ background: "#FAFAFA" }}>
          <AppSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
              <p className="text-[15px] font-semibold text-[#0F172A]">Could not load project</p>
              <p className="text-[13px] text-[#64748B]">{fetchError || "Project not found."}</p>
              <button
                onClick={() => navigate("/projects")}
                className="text-[13px] font-medium text-[#6366F1] hover:text-[#4338CA] transition-colors mt-2"
              >
                ← Back to projects
              </button>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

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

              {/* 1 ── Project Header ──────────────────────────────────── */}
              <motion.div {...fadeUp(0)}>
                {/* Back nav */}
                <button
                  onClick={() => navigate("/projects")}
                  className="flex items-center gap-1.5 mb-5 transition-colors"
                  style={{ color: "#94A3B8" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#475569")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#94A3B8")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  <span className="text-[13px] font-medium">All projects</span>
                </button>

                {/* Name + resume */}
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <h1 className="text-[28px] font-bold text-[#0F172A] tracking-tight leading-tight">
                      {project?.name}
                    </h1>
                    <p className="text-[13px] text-[#94A3B8] mt-1">
                      Last updated {project ? relativeTime(project.updated_at) : "—"}
                    </p>
                  </div>

                  {activeStep && (
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(99,102,241,0.24)" }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(activeStep.route)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white shrink-0"
                      style={{ background: "#6366F1", boxShadow: "0 4px 16px rgba(99,102,241,0.2)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#4F46E5")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#6366F1")}
                    >
                      Resume
                      <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </motion.button>
                  )}
                </div>
              </motion.div>

              {/* 2 ── Project Overview ────────────────────────────────── */}
              <motion.div {...fadeUp(0.05)}>
                <div
                  className="bg-white rounded-[20px] p-7"
                  style={{ border: "1px solid #E5E7EB" }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3"
                    style={{ color: "#94A3B8" }}>
                    Project context
                  </p>
                  <p className="text-[14px] leading-relaxed" style={{ color: "#475569" }}>
                    {project?.description || "No description provided."}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {[project?.domain, project?.product_type, project?.market]
                      .filter(Boolean)
                      .map(tag => (
                      <span
                        key={tag}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                        style={{ background: "#F1F5F9", color: "#64748B" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* 3 ── Assets ──────────────────────────────────────────── */}
              <motion.div {...fadeUp(0.09)} className="space-y-3">
                <h2 className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]">
                  Project assets
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Input files */}
                  <div className="bg-white rounded-[20px] p-6" style={{ border: "1px solid #E5E7EB" }}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}
                      >
                        <Upload className="h-[15px] w-[15px]" style={{ color: "#6366F1" }} strokeWidth={1.75} />
                      </div>
                      <p className="text-[14px] font-semibold" style={{ color: "#0F172A" }}>
                        Input files
                      </p>
                    </div>
                    <p className="text-[12px] mb-5" style={{ color: "#94A3B8" }}>
                      Documents and assets provided by you
                    </p>

                    {inputFiles.length === 0 && (
                      <p className="text-[13px]" style={{ color: "#94A3B8" }}>No files uploaded yet.</p>
                    )}
                    <div className="space-y-2.5">
                      {inputFiles.map(file => (
                        <div
                          key={file.name}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: "#F8FAFC", border: "1px solid #F1F5F9" }}
                        >
                          <FileText
                            className="h-4 w-4 shrink-0"
                            style={{ color: "#6366F1" }}
                            strokeWidth={1.75}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate" style={{ color: "#0F172A" }}>
                              {file.name}
                            </p>
                            <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                              {file.size} · {file.uploaded}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generated outputs */}
                  <div className="bg-white rounded-[20px] p-6" style={{ border: "1px solid #E5E7EB" }}>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}
                      >
                        <Zap className="h-[15px] w-[15px]" style={{ color: "#6366F1" }} strokeWidth={1.75} />
                      </div>
                      <p className="text-[14px] font-semibold" style={{ color: "#0F172A" }}>
                        Generated outputs
                      </p>
                    </div>
                    <p className="text-[12px] mb-5" style={{ color: "#94A3B8" }}>
                      Artifacts created by Aether across phases
                    </p>

                    <div className="space-y-3">
                      {generatedOutputs.map(output => (
                        <div key={output.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{
                                background: output.status === "ready" ? "#10B981" : "#E2E8F0",
                              }}
                            />
                            <span
                              className="text-[13px]"
                              style={{
                                color: output.status === "ready" ? "#0F172A" : "#94A3B8",
                                fontWeight: output.status === "ready" ? 500 : 400,
                              }}
                            >
                              {output.name}
                            </span>
                          </div>

                          {output.count !== null ? (
                            <span
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: "#ECFDF5", color: "#059669" }}
                            >
                              {output.count}
                            </span>
                          ) : (
                            <span className="text-[11px]" style={{ color: "#CBD5E1" }}>—</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>

              {/* 4 ── Workflow ─────────────────────────────────────────── */}
              <motion.div {...fadeUp(0.12)} className="space-y-3">
                <div>
                  <h2 className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]">
                    Workflow
                  </h2>
                  <p className="text-[12px] text-[#94A3B8] mt-0.5">
                    Structured progression from idea to system
                  </p>
                </div>

                <div
                  className="bg-white rounded-[20px] px-7 pt-7 pb-4"
                  style={{ border: "1px solid #E5E7EB" }}
                >
                  {steps.map((step, i) => (
                    <StepRow
                      key={step.number}
                      step={step}
                      isLast={i === steps.length - 1}
                      navigate={navigate}
                    />
                  ))}
                </div>
              </motion.div>

              {/* 5 ── Action Guidance ─────────────────────────────────── */}
              {activeStep && (
                <motion.div {...fadeUp(0.15)}>
                  <motion.div
                    whileHover={{ y: -2, boxShadow: "0 12px 36px rgba(99,102,241,0.09)" }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onClick={() => navigate(activeStep.route)}
                    className="bg-white rounded-[20px] p-7 cursor-pointer"
                    style={{ border: "1px solid #E5E7EB" }}
                  >
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2"
                          style={{ color: "#94A3B8" }}
                        >
                          Next step
                        </p>
                        <p className="text-[18px] font-bold tracking-tight" style={{ color: "#0F172A" }}>
                          Continue from {activeStep.title}
                        </p>
                        <p className="text-[13px] mt-1" style={{ color: "#64748B" }}>
                          {activeStep.description}
                        </p>
                      </div>

                      <motion.div
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-semibold text-white shrink-0"
                        style={{ background: "#6366F1", boxShadow: "0 4px 16px rgba(99,102,241,0.2)" }}
                        whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(99,102,241,0.28)" }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" strokeWidth={2} />
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProjectDetail;
