import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check, ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
  ArrowRight, ArrowLeft, Plus, Trash2, Copy,
  AlertTriangle, Lightbulb, Pencil, X, Lock,
  Download, FileText, Layers, LayoutGrid,
  Share2, HelpCircle, CheckCircle2, Users,
  Minus, GitBranch, BookOpen, Dot,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Priority = "High" | "Medium" | "Low";
type Effort   = "High" | "Medium" | "Low";
type ImpactType = "Retention" | "Conversion" | "Experience" | "Performance";

interface BacklogItem {
  id: string;
  featureName: string;
  problemStatement: string;
  personaIds: string[];
  journeyStage: string;
  opportunityDirection: string;
  priority: Priority;
  effort: Effort;
  impact: ImpactType[];
  dependencies: string[];
  edgeCases: string[];
  warning?: string;
}

interface BacklogModule {
  id: string;
  name: string;
  description: string;
  color: string;
  dotClass: string;
  items: BacklogItem[];
}

interface FlowStep {
  label: string;
  type: "entry" | "action" | "decision" | "outcome";
}

interface UserFlow {
  id: string;
  name: string;
  persona: string;
  steps: FlowStep[];
}

interface IANode {
  id: string;
  label: string;
  tag?: string;
  children?: IANode[];
}

interface OpenQuestion {
  id: string;
  question: string;
  context: string;
  priority: Priority;
  resolved: boolean;
}

// ─── Context personas ───────────────────────────────────────────────────────────

const CTX_PERSONAS = [
  { id: "1", name: "Sarah Chen",   tag: "Primary",   initials: "SC", cls: "gradient-accent text-white",    painPoints: ["No daily summary view", "Unclear task ownership", "Manual status updates"], opportunity: "Add a daily digest + ownership layer" },
  { id: "2", name: "Alex Rivera",  tag: "Primary",   initials: "AR", cls: "bg-violet-500 text-white",       painPoints: ["No prompt versioning", "Scattered review feedback", "Manual dev annotations"], opportunity: "Consolidated feedback inbox + auto-annotation" },
  { id: "3", name: "Jordan Patel", tag: "Secondary", initials: "JP", cls: "bg-teal-500 text-white",         painPoints: ["No executive summary", "No auto progress digest", "No goal alignment view"], opportunity: "Executive layer + automated reporting" },
  { id: "4", name: "Morgan Kim",   tag: "Edge",      initials: "MK", cls: "bg-amber-500 text-white",        painPoints: ["Forced account creation", "No simplified reviewer view", "No feedback receipt"], opportunity: "Guest reviewer mode + client-friendly UI" },
];

// ─── Mock Backlog Data ──────────────────────────────────────────────────────────

const INITIAL_MODULES: BacklogModule[] = [
  {
    id: "m1", name: "Onboarding System",
    description: "First-time user experience, project setup, and team activation.",
    color: "border-l-accent", dotClass: "bg-accent",
    items: [
      {
        id: "i1-1", featureName: "Self-Serve Trial with Sample Project",
        problemStatement: "New users cannot evaluate product fit without scheduling a demo, creating friction and reducing trial conversion.",
        personaIds: ["Sarah Chen", "Alex Rivera"],
        journeyStage: "Discovery",
        opportunityDirection: "Provide an instant self-serve trial pre-loaded with a sample design project so users can experience core value in under 3 minutes.",
        priority: "High", effort: "Medium", impact: ["Conversion", "Retention"],
        dependencies: ["Authentication System", "Sample Data Layer"],
        edgeCases: ["Trial expires mid-session", "User tries to save without creating account"],
      },
      {
        id: "i1-2", featureName: "Guided First-Project Onboarding Flow",
        problemStatement: "New users land on a blank state with no direction, causing confusion and early abandonment.",
        personaIds: ["Sarah Chen"],
        journeyStage: "Onboarding",
        opportunityDirection: "Introduce a 4-step onboarding checklist (Upload PRD → Review Personas → Confirm Journey → View Backlog) with visual progress tracking.",
        priority: "High", effort: "Low", impact: ["Retention", "Experience"],
        dependencies: ["PRD Upload Module"],
        edgeCases: ["User skips steps", "PRD upload fails during onboarding"],
        warning: "Missing edge case: PRD too short to generate meaningful output",
      },
      {
        id: "i1-3", featureName: "Team Invitation & Role Assignment",
        problemStatement: "Sarah cannot easily bring her design team into a project, limiting collaboration and adoption.",
        personaIds: ["Sarah Chen"],
        journeyStage: "Onboarding",
        opportunityDirection: "Add a multi-member invitation flow with role selection (Admin / Designer / Reviewer) and an invite tracking panel.",
        priority: "Medium", effort: "Medium", impact: ["Retention", "Conversion"],
        dependencies: ["Authentication System", "Role-based Access Control"],
        edgeCases: ["Invite link expires", "User already has account with different role"],
      },
    ],
  },
  {
    id: "m2", name: "Project Intelligence Engine",
    description: "AI-powered phases from persona extraction through backlog derivation.",
    color: "border-l-violet-500", dotClass: "bg-violet-500",
    items: [
      {
        id: "i2-1", featureName: "AI Persona Extraction & Studio",
        problemStatement: "Designers spend hours manually building personas from PRD documents — a repetitive, error-prone process that delays UX work.",
        personaIds: ["Sarah Chen", "Alex Rivera"],
        journeyStage: "Daily Workflow",
        opportunityDirection: "Auto-extract confirmed personas from PRD with confidence scoring, inline editing, merge suggestions, and status tracking.",
        priority: "High", effort: "High", impact: ["Experience", "Retention"],
        dependencies: ["Claude API via n8n", "PRD Upload Module", "Supabase personas table"],
        edgeCases: ["PRD mentions no explicit users", "AI extracts >8 personas (suggest grouping)"],
      },
      {
        id: "i2-2", featureName: "Journey Map Generation Interface",
        problemStatement: "Journey mapping is time-consuming and often skipped, leading to design decisions made without behavioral context.",
        personaIds: ["Sarah Chen", "Alex Rivera", "Jordan Patel"],
        journeyStage: "Daily Workflow",
        opportunityDirection: "Generate stage-based journey maps per persona with emotional scoring, pain points, system gaps, and prioritised opportunities — all inline-editable.",
        priority: "High", effort: "High", impact: ["Experience", "Retention"],
        dependencies: ["Persona Extraction", "Claude API via n8n"],
        edgeCases: ["Persona has no behavioral data", "Journey generates >8 stages"],
      },
      {
        id: "i2-3", featureName: "Design Backlog Derivation System",
        problemStatement: "Teams lack a structured bridge between UX insights and design execution, leading to misaligned or untracked design work.",
        personaIds: ["Sarah Chen", "Alex Rivera"],
        journeyStage: "Daily Workflow",
        opportunityDirection: "Derive a modular, prioritised design backlog from personas and journey data — with full traceability (persona → journey → problem → feature).",
        priority: "High", effort: "High", impact: ["Experience", "Conversion"],
        dependencies: ["Journey Map Module", "Claude API via n8n"],
        edgeCases: ["No journey data confirmed yet", "All items generated as Low priority"],
      },
      {
        id: "i2-4", featureName: "PRD Confidence & Clarity Scoring",
        problemStatement: "Users upload PRDs of varying quality — poor documents produce weak AI outputs, causing confusion and rework.",
        personaIds: ["Sarah Chen"],
        journeyStage: "Discovery",
        opportunityDirection: "Analyse uploaded PRD and surface a Clarity Score (0–100%) with specific improvement hints before AI processing begins.",
        priority: "Medium", effort: "Medium", impact: ["Experience", "Retention"],
        dependencies: ["Claude API via n8n", "PRD Upload Module"],
        edgeCases: ["PRD is image-only (no extractable text)", "PRD is in a language other than English"],
      },
    ],
  },
  {
    id: "m3", name: "Collaboration & Review",
    description: "Team feedback, ownership, and design review workflows.",
    color: "border-l-teal-500", dotClass: "bg-teal-500",
    items: [
      {
        id: "i3-1", featureName: "Inline Commenting on AI Outputs",
        problemStatement: "Sarah and Alex cannot comment directly on personas, journeys, or backlog items — feedback is scattered across Slack and email.",
        personaIds: ["Sarah Chen", "Alex Rivera"],
        journeyStage: "Team Collaboration",
        opportunityDirection: "Enable threaded inline comments on any AI output card or field, with resolution tracking and notification controls.",
        priority: "High", effort: "High", impact: ["Retention", "Experience"],
        dependencies: ["User Authentication", "Real-time DB (Supabase)"],
        edgeCases: ["Comment on deleted item", "User tagged who has no access"],
        warning: "Real-time sync requires Supabase Realtime — confirm availability before sprint",
      },
      {
        id: "i3-2", featureName: "Phase Ownership Assignment",
        problemStatement: "No one knows who is responsible for completing or reviewing each phase step, leading to delays and unclear accountability.",
        personaIds: ["Sarah Chen"],
        journeyStage: "Team Collaboration",
        opportunityDirection: "Allow per-phase-step ownership assignment with automatic notification when a step is completed or blocked.",
        priority: "High", effort: "Medium", impact: ["Retention", "Performance"],
        dependencies: ["Team Invitation System", "Phase State Machine"],
        edgeCases: ["Assigned user leaves team", "Multiple owners on same step"],
      },
      {
        id: "i3-3", featureName: "Consolidated Feedback Inbox",
        problemStatement: "Alex receives design feedback from multiple channels simultaneously — there is no single place to see, categorise, and address all review feedback.",
        personaIds: ["Alex Rivera"],
        journeyStage: "Review Cycle",
        opportunityDirection: "Create a centralised feedback inbox linked to prototype screens, allowing category filtering (Blocker / Suggestion / Question) and resolution tracking.",
        priority: "Medium", effort: "High", impact: ["Experience", "Retention"],
        dependencies: ["Inline Commenting", "Phase 03 Prototype Module"],
        edgeCases: ["Feedback received after prototype confirmed", "Duplicate feedback from multiple reviewers"],
      },
    ],
  },
  {
    id: "m4", name: "Reporting & Export",
    description: "BA handoff documents, executive summaries, and stakeholder outputs.",
    color: "border-l-amber-500", dotClass: "bg-amber-500",
    items: [
      {
        id: "i4-1", featureName: "BA Handoff Document Generation",
        problemStatement: "Phase 6 must produce a developer-ready, structured document — manually creating this takes designers 4–8 hours per project.",
        personaIds: ["Sarah Chen", "Alex Rivera"],
        journeyStage: "Sign-off & Reporting",
        opportunityDirection: "Auto-generate a structured .docx BA handoff document containing screen annotations, interaction logic, edge cases, validation rules, and navigation flows.",
        priority: "High", effort: "High", impact: ["Conversion", "Retention"],
        dependencies: ["Claude API via n8n", "Phase 06 Docs Module", "docx library"],
        edgeCases: ["Missing screen annotations", "Prototype not confirmed before Phase 6"],
      },
      {
        id: "i4-2", featureName: "Branded Export Customisation",
        problemStatement: "Jordan needs exports that look professional and on-brand for executive stakeholder review — plain exports undermine credibility.",
        personaIds: ["Jordan Patel"],
        journeyStage: "Sign-off & Reporting",
        opportunityDirection: "Allow users to upload company logo, set accent colour, and choose export template before generating stakeholder-facing documents.",
        priority: "Medium", effort: "Medium", impact: ["Conversion", "Experience"],
        dependencies: ["BA Handoff Module", "Asset Upload System"],
        edgeCases: ["Invalid logo format uploaded", "Custom colour doesn't meet contrast requirements"],
      },
      {
        id: "i4-3", featureName: "Executive Summary Layer",
        problemStatement: "Jordan has no high-level summary view — every review requires reading full-length detailed outputs that aren't designed for his context.",
        personaIds: ["Jordan Patel"],
        journeyStage: "Milestone Review",
        opportunityDirection: "Auto-generate a 1-page executive summary per phase output showing key decisions, risk flags, and recommended next steps.",
        priority: "Medium", effort: "Medium", impact: ["Retention", "Experience"],
        dependencies: ["Phase output data structure", "Claude API via n8n"],
        edgeCases: ["Phase has no confirmed outputs yet", "Summary conflicts with detailed view"],
      },
    ],
  },
  {
    id: "m5", name: "External Access",
    description: "Lightweight guest review and client-facing output experience.",
    color: "border-l-orange-400", dotClass: "bg-orange-400",
    items: [
      {
        id: "i5-1", featureName: "Guest Reviewer Mode",
        problemStatement: "Morgan must create a full account to review designs — a significant friction point for an occasional external reviewer.",
        personaIds: ["Morgan Kim"],
        journeyStage: "Platform Access",
        opportunityDirection: "Create a token-based guest access mode that allows external reviewers to view, comment, and approve designs without creating an account.",
        priority: "High", effort: "High", impact: ["Conversion", "Experience"],
        dependencies: ["Authentication System", "Comment System", "Token Expiry Management"],
        edgeCases: ["Token expired before review complete", "Reviewer tries to access other projects via token"],
        warning: "Security review required — token-based auth must be scoped to specific project and phase",
      },
      {
        id: "i5-2", featureName: "Client Review Simplified View",
        problemStatement: "Morgan is confused by internal terminology and full design context — she only needs to see what needs her decision.",
        personaIds: ["Morgan Kim"],
        journeyStage: "Reviewing Designs",
        opportunityDirection: "Create a stripped-back review interface showing only review-relevant screens, plain-language decision summaries, and a clear approve/reject action.",
        priority: "Medium", effort: "Medium", impact: ["Experience", "Conversion"],
        dependencies: ["Guest Reviewer Mode", "Phase output data"],
        edgeCases: ["No screens ready for review", "Reviewer rejects without leaving a comment"],
      },
    ],
  },
];

// ─── User Flows ─────────────────────────────────────────────────────────────────

const USER_FLOWS: UserFlow[] = [
  {
    id: "f1", name: "New User First-Project Flow", persona: "Sarah Chen",
    steps: [
      { label: "Signs up / Trial", type: "entry" },
      { label: "Uploads PRD", type: "action" },
      { label: "AI processes document", type: "action" },
      { label: "Reviews personas", type: "action" },
      { label: "Confirms personas", type: "decision" },
      { label: "Reviews journey maps", type: "action" },
      { label: "Confirms journey", type: "decision" },
      { label: "Reviews design backlog", type: "action" },
      { label: "Proceeds to Screen Derivation", type: "outcome" },
    ],
  },
  {
    id: "f2", name: "AI-Assisted Design Workflow", persona: "Alex Rivera",
    steps: [
      { label: "Opens active project", type: "entry" },
      { label: "Reviews prototype prompts", type: "action" },
      { label: "Builds in Lovable", type: "action" },
      { label: "Flags prompt for re-gen", type: "decision" },
      { label: "Runs UX Audit", type: "action" },
      { label: "Reviews copy suggestions", type: "action" },
      { label: "Exports BA document", type: "outcome" },
    ],
  },
  {
    id: "f3", name: "External Design Review Flow", persona: "Morgan Kim",
    steps: [
      { label: "Receives email invite", type: "entry" },
      { label: "Opens token link", type: "action" },
      { label: "Views review summary", type: "action" },
      { label: "Reviews assigned screens", type: "action" },
      { label: "Leaves comments", type: "decision" },
      { label: "Approves or rejects", type: "decision" },
      { label: "Confirmation sent to team", type: "outcome" },
    ],
  },
];

// ─── Information Architecture ───────────────────────────────────────────────────

const IA_TREE: IANode[] = [
  {
    id: "ia1", label: "Dashboard", tag: "Home",
    children: [
      { id: "ia1-1", label: "Active Projects Overview" },
      { id: "ia1-2", label: "Workflow Progress Stepper" },
      { id: "ia1-3", label: "Quick Tools" },
      { id: "ia1-4", label: "Recent Projects" },
    ],
  },
  {
    id: "ia2", label: "Projects", tag: "Core",
    children: [
      { id: "ia2-1", label: "Project List" },
      {
        id: "ia2-2", label: "Project Detail",
        children: [
          {
            id: "ia2-2a", label: "Phase 01 — Design Intake",
            children: [
              { id: "ia2-2a-1", label: "Persona Identification" },
              { id: "ia2-2a-2", label: "Journey Mapping" },
              { id: "ia2-2a-3", label: "Design Backlog" },
            ],
          },
          { id: "ia2-2b", label: "Phase 02 — Screen Derivation" },
          { id: "ia2-2c", label: "Phase 03 — Prototype Prompts" },
          { id: "ia2-2d", label: "Phase 04 — UX Audit" },
          { id: "ia2-2e", label: "Phase 05 — UX Copywriting" },
          { id: "ia2-2f", label: "Phase 06 — Documentation" },
        ],
      },
    ],
  },
  {
    id: "ia3", label: "Tools", tag: "Standalone",
    children: [
      { id: "ia3-1", label: "UX Audit Tool" },
      { id: "ia3-2", label: "UX Copywriting Tool" },
    ],
  },
  {
    id: "ia4", label: "Files", tag: "System",
    children: [
      { id: "ia4-1", label: "Uploaded Documents" },
      { id: "ia4-2", label: "Generated Outputs" },
    ],
  },
  {
    id: "ia5", label: "Customisation", tag: "Settings",
    children: [
      { id: "ia5-1", label: "Tone Settings" },
      { id: "ia5-2", label: "Persona Defaults" },
      { id: "ia5-3", label: "Export Preferences" },
    ],
  },
  {
    id: "ia6", label: "Authentication", tag: "Auth",
    children: [
      { id: "ia6-1", label: "Login" },
      { id: "ia6-2", label: "Sign Up" },
      { id: "ia6-3", label: "Guest Review Access" },
    ],
  },
];

// ─── Open Questions ─────────────────────────────────────────────────────────────

const INITIAL_QUESTIONS: OpenQuestion[] = [
  { id: "q1", priority: "High",   resolved: false, question: "Should onboarding be skippable for returning users who already know the flow?",           context: "Sarah Chen's journey shows frustration at the repeated onboarding prompt on second login." },
  { id: "q2", priority: "High",   resolved: false, question: "What happens when the uploaded PRD is too short or ambiguous to generate reliable personas?", context: "PRD Clarity Score system needs a minimum threshold — what is the minimum viable input?" },
  { id: "q3", priority: "High",   resolved: false, question: "How should expired guest reviewer tokens be handled — silent error or guided re-invite?",   context: "Morgan Kim's drop-off risk: expired links send users to a confusing error state." },
  { id: "q4", priority: "Medium", resolved: false, question: "Should persona data remain editable after the design backlog has been generated?",           context: "Editing personas post-backlog may create traceability inconsistencies." },
  { id: "q5", priority: "Medium", resolved: false, question: "What is the default dashboard state for a brand new project with no phase data?",             context: "The blank state must guide — not confuse. Should it prompt PRD upload immediately?" },
  { id: "q6", priority: "Medium", resolved: true,  question: "Should the system support multiple PRD uploads per project (versioning)?",                   context: "Decided: Phase 1 will support single PRD only. Versioning deferred to post-MVP." },
  { id: "q7", priority: "Low",    resolved: false, question: "What is the maximum number of personas the system should generate before suggesting grouping?", context: "No upper limit defined — risk of overwhelming the designer with 8+ personas." },
];

// ─── Stage Tracker ─────────────────────────────────────────────────────────────

const STAGES = [
  { short: "Upload" }, { short: "Intake" }, { short: "Screens" },
  { short: "Prototype" }, { short: "Audit" }, { short: "Copy" }, { short: "Docs" },
];

function StageTracker({ current }: { current: number }) {
  return (
    <div className="flex items-center w-full">
      {STAGES.map((s, i) => {
        const isDone = i < current, isActive = i === current, isLast = i === STAGES.length - 1;
        return (
          <div key={s.short} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 transition-all",
                isDone && "gradient-accent text-white",
                isActive && "bg-accent/10 text-accent ring-2 ring-accent/25",
                !isDone && !isActive && "bg-secondary text-muted-foreground/40"
              )}>
                {isDone ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <span>{i + 1}</span>}
              </div>
              <span className={cn("text-[10px] font-medium whitespace-nowrap",
                isActive ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/40"
              )}>{s.short}</span>
            </div>
            {!isLast && (
              <div className="flex-1 h-px mx-1.5 mt-[-18px]">
                <div className={cn("h-full rounded-full transition-colors duration-500", isDone ? "bg-accent/40" : "bg-border")} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sub-step Stepper ───────────────────────────────────────────────────────────

const PHASE1_STEPS = ["Persona Identification", "Journey Mapping", "Design Backlog"];

function SubStepStepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {PHASE1_STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
            i === current ? "bg-accent/10 text-accent" : i < current ? "text-muted-foreground" : "text-muted-foreground/35"
          )}>
            {i < current ? <Check className="h-2.5 w-2.5" strokeWidth={3} />
              : i === current ? <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              : <Lock className="h-2.5 w-2.5" strokeWidth={2} />}
            <span className="hidden sm:inline">{step}</span>
            <span className="sm:hidden">{step.split(" ")[0]}</span>
          </div>
          {i < PHASE1_STEPS.length - 1 && <div className="w-5 h-px bg-border mx-0.5" />}
        </div>
      ))}
    </div>
  );
}

// ─── Inline Editable Text ───────────────────────────────────────────────────────

function EditableText({ value, onChange, className, multiline }: {
  value: string; onChange: (v: string) => void; className?: string; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { onChange(draft.trim() || value); setEditing(false); };

  if (editing) {
    if (multiline) return (
      <textarea autoFocus value={draft} rows={3}
        onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        className={cn("w-full bg-accent/[0.04] border border-accent/20 rounded-lg px-2.5 py-2 text-sm outline-none resize-none focus:border-accent/40 transition-colors", className)} />
    );
    return (
      <input autoFocus value={draft}
        onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        className={cn("bg-accent/[0.04] border border-accent/20 rounded-md px-2 py-0.5 outline-none w-full focus:border-accent/40 transition-colors text-sm", className)} />
    );
  }

  return (
    <span onClick={() => { setDraft(value); setEditing(true); }}
      className={cn("cursor-text group inline-flex items-baseline gap-1 hover:bg-secondary/60 rounded px-1 -mx-1 transition-colors", className)}>
      <span>{value}</span>
      <Pencil className="h-2.5 w-2.5 text-transparent group-hover:text-muted-foreground/35 transition-colors shrink-0 self-center" strokeWidth={1.5} />
    </span>
  );
}

// ─── Editable List ──────────────────────────────────────────────────────────────

function EditableList({ items, onChange, placeholder = "Add…" }: {
  items: string[]; onChange: (i: string[]) => void; placeholder?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const add = () => { if (draft.trim()) onChange([...items, draft.trim()]); setDraft(""); setAdding(false); };

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="group flex items-start gap-1.5">
          <div className="h-1 w-1 rounded-full bg-muted-foreground/40 mt-[7px] shrink-0" />
          <EditableText value={item} onChange={v => { const n = [...items]; n[i] = v; onChange(n); }} className="text-xs text-foreground flex-1" />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="opacity-0 group-hover:opacity-100 h-4 w-4 rounded hover:bg-destructive/10 flex items-center justify-center transition-opacity shrink-0">
            <X className="h-2.5 w-2.5 text-muted-foreground/50" strokeWidth={2} />
          </button>
        </div>
      ))}
      {adding
        ? <div className="pl-2.5">
            <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
              onBlur={add} onKeyDown={e => { if (e.key === "Enter") add(); if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
              placeholder={placeholder}
              className="w-full bg-accent/[0.04] border border-accent/20 rounded-md px-2 py-0.5 text-xs outline-none focus:border-accent/40 transition-colors" />
          </div>
        : <button onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-accent transition-colors pl-2.5">
            <Plus className="h-2.5 w-2.5" strokeWidth={2} /> Add
          </button>
      }
    </div>
  );
}

// ─── Priority / Effort Badge (cycle) ───────────────────────────────────────────

const P_LEVELS: Priority[] = ["High", "Medium", "Low"];
const E_LEVELS: Effort[] = ["High", "Medium", "Low"];
const IMPACT_OPTIONS: ImpactType[] = ["Retention", "Conversion", "Experience", "Performance"];

const P_STYLE: Record<Priority, string> = {
  High:   "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]",
  Medium: "bg-amber-50 text-amber-600",
  Low:    "bg-secondary text-muted-foreground",
};
const E_STYLE: Record<Effort, string> = {
  High:   "bg-destructive/[0.07] text-destructive",
  Medium: "bg-amber-50 text-amber-600",
  Low:    "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]",
};
const I_STYLE: Record<ImpactType, string> = {
  Retention:   "bg-accent/10 text-accent",
  Conversion:  "bg-violet-100 text-violet-700",
  Experience:  "bg-teal-50 text-teal-700",
  Performance: "bg-amber-50 text-amber-600",
};

function CycleBadge({ value, styles, cycle, onChange, prefix }: {
  value: string; styles: Record<string, string>; cycle: string[]; onChange: (v: any) => void; prefix: string;
}) {
  return (
    <button onClick={() => { const i = cycle.indexOf(value); onChange(cycle[(i + 1) % cycle.length]); }}
      title={`${prefix}: click to change`}
      className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-75 transition-opacity", styles[value])}>
      {prefix}: {value}
    </button>
  );
}

// ─── Impact Chips ───────────────────────────────────────────────────────────────

function ImpactChips({ values, onChange }: { values: ImpactType[]; onChange: (v: ImpactType[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {values.map(v => (
        <div key={v} className={cn("flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full", I_STYLE[v])}>
          {v}
          <button onClick={() => onChange(values.filter(x => x !== v))}>
            <X className="h-2 w-2" strokeWidth={2.5} />
          </button>
        </div>
      ))}
      {values.length < IMPACT_OPTIONS.length && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors">
              + Impact
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-xl min-w-[140px]">
            {IMPACT_OPTIONS.filter(o => !values.includes(o)).map(o => (
              <DropdownMenuItem key={o} onClick={() => onChange([...values, o])}
                className={cn("text-xs gap-2 cursor-pointer font-medium", I_STYLE[o].split(" ")[1])}>
                {o}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ─── Context Summary ────────────────────────────────────────────────────────────

function ContextSummary() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/60 bg-background/95 shrink-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-6 py-3 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
            Derived from
          </p>
          <div className="flex items-center gap-1.5">
            {CTX_PERSONAS.map(p => (
              <div key={p.id} className={cn("h-6 w-6 rounded-lg text-[9px] font-bold flex items-center justify-center", p.cls)} title={p.name}>
                {p.initials}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{CTX_PERSONAS.length}</span> personas ·
            <span className="font-medium text-foreground">4</span> journey maps ·
            <span className="font-medium text-foreground">
              {INITIAL_MODULES.reduce((n, m) => n + m.items.reduce((s, i) => s + i.opportunities?.length, 0), 0)} opportunities
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground/50">
          <span className="text-[10px]">{expanded ? "Hide context" : "Show context"}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} /> : <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CTX_PERSONAS.map(p => (
                <div key={p.id} className="surface-elevated rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-7 w-7 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0", p.cls)}>{p.initials}</div>
                    <div>
                      <p className="text-[12px] font-semibold text-foreground leading-none">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{p.tag}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {p.painPoints.map((pt, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <div className="h-1 w-1 rounded-full bg-destructive/60 mt-[6px] shrink-0" />
                        <p className="text-[10px] text-muted-foreground leading-snug">{pt}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-accent/[0.05] border border-accent/10 rounded-lg px-2.5 py-1.5">
                    <p className="text-[10px] text-accent/80 font-medium leading-snug">{p.opportunity}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Backlog Item Card ──────────────────────────────────────────────────────────

function BacklogItemCard({ item, onUpdate, onDelete }: {
  item: BacklogItem;
  onUpdate: (i: BacklogItem) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const u = (patch: Partial<BacklogItem>) => onUpdate({ ...item, ...patch });

  return (
    <motion.div layout className={cn(
      "border border-border/60 rounded-xl overflow-hidden transition-shadow duration-200",
      expanded ? "shadow-elevated" : "shadow-soft hover:shadow-elevated"
    )}>
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0", P_STYLE[item.priority])}>
            {item.priority}
          </span>
          <EditableText
            value={item.featureName}
            onChange={featureName => { u({ featureName }); }}
            className="text-sm font-semibold text-foreground"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Persona chips (collapsed preview) */}
          <div className="hidden sm:flex items-center gap-1">
            {item.personaIds.slice(0, 2).map(name => {
              const p = CTX_PERSONAS.find(c => c.name === name);
              return p ? (
                <div key={name} className={cn("h-5 w-5 rounded-md text-[9px] font-bold flex items-center justify-center", p.cls)} title={name}>
                  {p.initials}
                </div>
              ) : null;
            })}
            {item.personaIds.length > 2 && (
              <span className="text-[9px] text-muted-foreground/60">+{item.personaIds.length - 2}</span>
            )}
          </div>
          {item.warning && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" strokeWidth={1.5} />}
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
            : <ChevronDown className="h-4 w-4 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 px-4 py-4 space-y-5">

              {/* Warning */}
              {item.warning && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100/80 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-[11px] text-amber-700">{item.warning}</p>
                </div>
              )}

              {/* Problem + Opportunity grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">Problem Statement</p>
                  <EditableText value={item.problemStatement} onChange={problemStatement => u({ problemStatement })}
                    className="text-xs text-foreground leading-relaxed" multiline />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">Opportunity Direction</p>
                  <EditableText value={item.opportunityDirection} onChange={opportunityDirection => u({ opportunityDirection })}
                    className="text-xs text-foreground leading-relaxed" multiline />
                </div>
              </div>

              {/* Persona + Journey row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">Persona Mapping</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.personaIds.map(name => {
                      const p = CTX_PERSONAS.find(c => c.name === name);
                      return p ? (
                        <div key={name} className="flex items-center gap-1.5 bg-secondary rounded-lg px-2 py-1">
                          <div className={cn("h-4 w-4 rounded text-[8px] font-bold flex items-center justify-center", p.cls)}>{p.initials}</div>
                          <span className="text-[10px] font-medium text-foreground">{name}</span>
                          <button onClick={() => u({ personaIds: item.personaIds.filter(n => n !== name) })}>
                            <X className="h-2.5 w-2.5 text-muted-foreground/50" strokeWidth={2} />
                          </button>
                        </div>
                      ) : null;
                    })}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-accent transition-colors bg-secondary/50 rounded-lg px-2 py-1">
                          <Plus className="h-2.5 w-2.5" strokeWidth={2} /> Persona
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="rounded-xl">
                        {CTX_PERSONAS.filter(p => !item.personaIds.includes(p.name)).map(p => (
                          <DropdownMenuItem key={p.id} onClick={() => u({ personaIds: [...item.personaIds, p.name] })}
                            className="text-xs gap-2 cursor-pointer">
                            <div className={cn("h-4 w-4 rounded text-[8px] font-bold flex items-center justify-center", p.cls)}>{p.initials}</div>
                            {p.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">Journey Stage</p>
                  <EditableText value={item.journeyStage} onChange={journeyStage => u({ journeyStage })}
                    className="text-xs text-foreground font-medium" />
                </div>
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <CycleBadge value={item.priority} styles={P_STYLE} cycle={P_LEVELS} onChange={priority => u({ priority })} prefix="Priority" />
                <CycleBadge value={item.effort} styles={E_STYLE} cycle={E_LEVELS} onChange={effort => u({ effort })} prefix="Effort" />
                <div className="h-3 w-px bg-border/60" />
                <ImpactChips values={item.impact} onChange={impact => u({ impact })} />
              </div>

              {/* Dependencies + Edge Cases */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-border/40">
                <div className="space-y-1.5 pt-3">
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">Dependencies</p>
                  <EditableList items={item.dependencies} onChange={dependencies => u({ dependencies })} placeholder="Add dependency…" />
                </div>
                <div className="space-y-1.5 pt-3">
                  <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest">Edge Cases</p>
                  <EditableList items={item.edgeCases} onChange={edgeCases => u({ edgeCases })} placeholder="Add edge case…" />
                </div>
              </div>

              {/* Hint */}
              {item.personaIds.length === 0 && (
                <div className="flex items-center gap-2 bg-accent/[0.05] border border-accent/10 rounded-xl px-3 py-2">
                  <Lightbulb className="h-3.5 w-3.5 text-accent/60 shrink-0" strokeWidth={1.5} />
                  <p className="text-[11px] text-accent/70">This item lacks persona mapping — add at least one for traceability.</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                <button onClick={() => setDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{item.featureName}"?</AlertDialogTitle>
            <AlertDialogDescription>This backlog item will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="rounded-xl bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ─── Backlog Module Panel ───────────────────────────────────────────────────────

const MODULE_COLORS: Record<string, string> = {
  "m1": "border-l-accent text-accent bg-accent/[0.06]",
  "m2": "border-l-violet-500 text-violet-600 bg-violet-50",
  "m3": "border-l-teal-500 text-teal-600 bg-teal-50",
  "m4": "border-l-amber-500 text-amber-600 bg-amber-50",
  "m5": "border-l-orange-400 text-orange-600 bg-orange-50",
};

function BacklogModulePanel({ module: mod, onUpdateModule }: {
  module: BacklogModule; onUpdateModule: (m: BacklogModule) => void;
}) {
  const [open, setOpen] = useState(true);
  const colorCls = MODULE_COLORS[mod.id] ?? MODULE_COLORS["m1"];
  const [dotBg] = colorCls.split(" ").filter(c => c.startsWith("bg-") && !c.includes("/"));

  const updateItem = (id: string, patch: BacklogItem) =>
    onUpdateModule({ ...mod, items: mod.items.map(i => i.id === id ? patch : i) });
  const deleteItem = (id: string) =>
    onUpdateModule({ ...mod, items: mod.items.filter(i => i.id !== id) });
  const addItem = () => onUpdateModule({
    ...mod, items: [...mod.items, {
      id: Date.now().toString(),
      featureName: "New Feature",
      problemStatement: "Define the problem this feature solves.",
      personaIds: [], journeyStage: "Define stage",
      opportunityDirection: "Define the solution direction.",
      priority: "Medium", effort: "Medium", impact: ["Experience"],
      dependencies: [], edgeCases: [],
    }],
  });

  const highCount = mod.items.filter(i => i.priority === "High").length;

  return (
    <div className="rounded-2xl border border-border/60 overflow-hidden">
      {/* Module header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-4 border-l-4 transition-colors hover:bg-secondary/20",
          colorCls.split(" ").filter(c => c.startsWith("border-l-")).join(" "),
          open ? "bg-background" : "bg-secondary/10"
        )}
      >
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2.5 flex-wrap">
            <EditableText value={mod.name} onChange={name => onUpdateModule({ ...mod, name })}
              className="text-sm font-bold text-foreground" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {mod.items.length} item{mod.items.length !== 1 ? "s" : ""}
              </span>
              {highCount > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]">
                  {highCount} High
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{mod.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={e => { e.stopPropagation(); addItem(); }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-accent/[0.06]">
            <Plus className="h-3 w-3" strokeWidth={2} /> Add Item
          </button>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
            : <ChevronDown className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />}
        </div>
      </button>

      {/* Items */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="p-4 space-y-2.5">
              {mod.items.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <p className="text-xs text-muted-foreground mb-2">No items in this module yet.</p>
                  <button onClick={addItem}
                    className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors">
                    <Plus className="h-3 w-3" strokeWidth={2} /> Add first item
                  </button>
                </div>
              ) : (
                mod.items.map(item => (
                  <BacklogItemCard key={item.id} item={item}
                    onUpdate={updated => updateItem(item.id, updated)}
                    onDelete={() => deleteItem(item.id)} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Module Map ─────────────────────────────────────────────────────────────────

const MODULE_MAP_NODES = [
  { id: "m1", name: "Onboarding\nSystem",       col: 1, row: 1, colorBg: "bg-accent/10",        colorText: "text-accent",       colorBorder: "border-accent/30",        arrow: "right" },
  { id: "m2", name: "Project Intelligence\nEngine", col: 2, row: 1, colorBg: "bg-violet-50",    colorText: "text-violet-700",   colorBorder: "border-violet-200",      arrow: "right" },
  { id: "m3", name: "Collaboration\n& Review",  col: 3, row: 1, colorBg: "bg-teal-50",           colorText: "text-teal-700",     colorBorder: "border-teal-200",        arrow: "right" },
  { id: "m4", name: "Reporting\n& Export",       col: 4, row: 1, colorBg: "bg-amber-50",         colorText: "text-amber-700",    colorBorder: "border-amber-200",       arrow: "down" },
  { id: "m5", name: "External\nAccess",          col: 4, row: 2, colorBg: "bg-orange-50",        colorText: "text-orange-700",   colorBorder: "border-orange-200",      arrow: null  },
];

const MODULE_DEPS: Record<string, string[]> = {
  m2: ["m1"], m3: ["m2"], m4: ["m3"], m5: ["m1", "m3"],
};

function ModuleMapSection({ modules }: { modules: BacklogModule[] }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">Product Structure</p>
        <p className="text-xs text-muted-foreground">How the five system modules connect and depend on each other.</p>
      </div>

      {/* Visual flow - row 1 */}
      <div className="overflow-x-auto pb-2">
        <div className="flex flex-col gap-4 min-w-[640px]">
          {/* Row 1 */}
          <div className="flex items-center gap-0">
            {MODULE_MAP_NODES.filter(n => n.row === 1).map((node, i, arr) => {
              const mod = modules.find(m => m.id === node.id);
              return (
                <div key={node.id} className="flex items-center">
                  <div className={cn(
                    "flex-1 rounded-2xl border-2 p-4 min-w-[140px] max-w-[180px]",
                    node.colorBg, node.colorBorder
                  )}>
                    <p className={cn("text-xs font-bold leading-snug whitespace-pre-line", node.colorText)}>{node.name}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">{mod?.items.length ?? 0} items</p>
                    <div className="mt-2 h-0.5 w-full rounded-full bg-current opacity-10" />
                    <p className={cn("text-[10px] font-medium mt-1.5", node.colorText)}>
                      {mod?.items.filter(i => i.priority === "High").length ?? 0} High priority
                    </p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex items-center px-2">
                      <div className="h-px w-6 bg-border" />
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 -ml-1" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Down arrow from m4 */}
          <div className="flex items-start gap-0">
            <div className="flex-1" style={{ minWidth: "140px", maxWidth: "180px" }} />
            <div className="px-2 flex-1" style={{ minWidth: "140px", maxWidth: "180px" }} />
            <div className="px-2 flex-1" style={{ minWidth: "140px", maxWidth: "180px" }} />
            <div className="flex flex-col items-center" style={{ minWidth: "140px", maxWidth: "180px" }}>
              <div className="flex flex-col items-center">
                <div className="w-px h-4 bg-border" />
                <ChevronDown className="h-4 w-4 text-muted-foreground/30 -mt-1" strokeWidth={1.5} />
              </div>
              {/* Row 2 - m5 */}
              {MODULE_MAP_NODES.filter(n => n.row === 2).map(node => {
                const mod = modules.find(m => m.id === node.id);
                return (
                  <div key={node.id} className={cn("rounded-2xl border-2 p-4 w-full", node.colorBg, node.colorBorder)}>
                    <p className={cn("text-xs font-bold leading-snug whitespace-pre-line", node.colorText)}>{node.name}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">{mod?.items.length ?? 0} items</p>
                    <div className="mt-2 h-0.5 w-full rounded-full bg-current opacity-10" />
                    <p className={cn("text-[10px] font-medium mt-1.5", node.colorText)}>
                      {mod?.items.filter(i => i.priority === "High").length ?? 0} High priority
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dependency legend */}
      <div className="surface-elevated rounded-2xl p-4 space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Module Dependencies</p>
        {Object.entries(MODULE_DEPS).map(([target, sources]) => {
          const targetMod = modules.find(m => m.id === target);
          return (
            <div key={target} className="flex items-center gap-2 text-xs text-foreground/70">
              <span className="font-medium text-foreground">{targetMod?.name}</span>
              <span className="text-muted-foreground/50">depends on</span>
              {sources.map(src => {
                const srcMod = modules.find(m => m.id === src);
                return <span key={src} className="font-medium text-foreground">{srcMod?.name}</span>;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Flows & IA ─────────────────────────────────────────────────────────────────

const FLOW_TYPE_STYLE: Record<string, string> = {
  entry:    "bg-accent/10 text-accent border border-accent/25",
  action:   "bg-secondary text-foreground border border-border/60",
  decision: "bg-amber-50 text-amber-700 border border-amber-200",
  outcome:  "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))] border border-[hsl(var(--success))]/20",
};
const FLOW_TYPE_LABEL: Record<string, string> = {
  entry: "Entry", action: "Action", decision: "Decision", outcome: "Outcome",
};

function IANodeView({ node, depth = 0 }: { node: IANode; depth?: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 py-1.5 group hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        {depth > 0 && <div className="w-3 h-px bg-border/60 shrink-0" />}
        <p className={cn("text-xs leading-none", depth === 0 ? "font-bold text-foreground" : depth === 1 ? "font-medium text-foreground/80" : "text-muted-foreground/70")}>
          {node.label}
        </p>
        {node.tag && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {node.tag}
          </span>
        )}
      </div>
      {node.children?.map(child => <IANodeView key={child.id} node={child} depth={depth + 1} />)}
    </div>
  );
}

function FlowsAndIASection() {
  const [activeSubTab, setActiveSubTab] = useState<"flows" | "ia">("flows");

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1 w-fit">
        {([["flows", "User Flows"], ["ia", "Information Architecture"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveSubTab(key)}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all", activeSubTab === key ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === "flows" ? (
          <motion.div key="flows" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
            className="space-y-5">
            {USER_FLOWS.map(flow => {
              const persona = CTX_PERSONAS.find(p => p.name === flow.persona);
              return (
                <div key={flow.id} className="surface-elevated rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    {persona && (
                      <div className={cn("h-7 w-7 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0", persona.cls)}>
                        {persona.initials}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-foreground">{flow.name}</p>
                      <p className="text-[10px] text-muted-foreground/60">{flow.persona}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      {Object.entries(FLOW_TYPE_LABEL).map(([type, label]) => (
                        <div key={type} className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full", FLOW_TYPE_STYLE[type])}>
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto pb-1">
                    <div className="flex items-center gap-1 min-w-max">
                      {flow.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className={cn("px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap", FLOW_TYPE_STYLE[step.type])}>
                            {step.label}
                          </div>
                          {i < flow.steps.length - 1 && (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" strokeWidth={2} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground/50">
                    <span>{flow.steps.length} steps</span>
                    <span>{flow.steps.filter(s => s.type === "decision").length} decision point{flow.steps.filter(s => s.type === "decision").length !== 1 ? "s" : ""}</span>
                    <span>{flow.steps.filter(s => s.type === "action").length} actions</span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div key="ia" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
            className="surface-elevated rounded-2xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
              {IA_TREE.map(node => <IANodeView key={node.id} node={node} depth={0} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Open Questions ─────────────────────────────────────────────────────────────

function OpenQuestionsSection({ questions, onChange }: {
  questions: OpenQuestion[]; onChange: (q: OpenQuestion[]) => void;
}) {
  const addQuestion = () => onChange([...questions, {
    id: Date.now().toString(), question: "Define the open question",
    context: "Add context for why this is unresolved.", priority: "Medium", resolved: false,
  }]);

  const update = (id: string, patch: Partial<OpenQuestion>) =>
    onChange(questions.map(q => q.id === id ? { ...q, ...patch } : q));

  const unresolved = questions.filter(q => !q.resolved).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-0.5">Open Questions</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{unresolved}</span> unresolved ·{" "}
            <span className="font-semibold text-foreground">{questions.length - unresolved}</span> resolved
          </p>
        </div>
        <button onClick={addQuestion}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-accent transition-colors">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add Question
        </button>
      </div>

      <div className="space-y-2.5">
        {questions.map(q => (
          <div key={q.id} className={cn(
            "surface-elevated rounded-2xl p-4 transition-all",
            q.resolved && "opacity-55"
          )}>
            <div className="flex items-start gap-3">
              <button onClick={() => update(q.id, { resolved: !q.resolved })} className="mt-0.5 shrink-0">
                {q.resolved
                  ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" strokeWidth={2} />
                  : <div className="h-4 w-4 rounded-full border-2 border-border/60 hover:border-accent transition-colors" />
                }
              </button>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5", P_STYLE[q.priority])}>
                    {q.priority}
                  </span>
                  <EditableText value={q.question} onChange={question => update(q.id, { question })}
                    className={cn("text-sm font-semibold text-foreground flex-1", q.resolved && "line-through text-muted-foreground")} />
                </div>
                <EditableText value={q.context} onChange={context => update(q.id, { context })}
                  className="text-xs text-muted-foreground leading-relaxed" />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <CycleBadge value={q.priority} styles={P_STYLE} cycle={P_LEVELS} onChange={priority => update(q.id, { priority })} prefix="Priority" />
                <button onClick={() => onChange(questions.filter(x => x.id !== q.id))}
                  className="h-6 w-6 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors">
                  <X className="h-3 w-3 text-muted-foreground/40 hover:text-destructive" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {unresolved > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100/80 rounded-2xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-xs text-amber-700">
            <span className="font-semibold">{unresolved} unresolved question{unresolved > 1 ? "s" : ""}</span> — resolve critical questions before proceeding to Screen Derivation.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Export to Excel (CSV) ─────────────────────────────────────────────────────

function exportBacklog(modules: BacklogModule[], questions: OpenQuestion[], projectName: string) {
  const q = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;

  const rows: string[][] = [
    [q("AETHER — DESIGN BACKLOG"), q(""), q(""), q(""), q(""), q(""), q(""), q(""), q(""), q(""), q("")],
    [q(`Project: ${projectName}`), ...Array(10).fill(q(""))],
    [q(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`), ...Array(10).fill(q(""))],
    [q(`Total Modules: ${modules.length}`), q(`Total Items: ${modules.reduce((n, m) => n + m.items.length, 0)}`), ...Array(9).fill(q(""))],
    Array(11).fill(q("")),
    [q("DESIGN BACKLOG"), ...Array(10).fill(q(""))],
    [
      q("Module"), q("Feature Name"), q("Problem Statement"), q("Persona(s)"),
      q("Journey Stage"), q("Opportunity Direction"), q("Priority"), q("Effort"),
      q("Impact"), q("Dependencies"), q("Edge Cases"),
    ],
  ];

  modules.forEach(mod => {
    mod.items.forEach(item => {
      rows.push([
        q(mod.name), q(item.featureName), q(item.problemStatement),
        q(item.personaIds.join(" | ")), q(item.journeyStage), q(item.opportunityDirection),
        q(item.priority), q(item.effort), q(item.impact.join(", ")),
        q(item.dependencies.join("; ")), q(item.edgeCases.join("; ")),
      ]);
    });
    rows.push(Array(11).fill(q(""))); // spacer between modules
  });

  rows.push(Array(11).fill(q("")));
  rows.push([q("OPEN QUESTIONS"), ...Array(10).fill(q(""))]);
  rows.push([q("Priority"), q("Question"), q("Context"), q("Status"), ...Array(7).fill(q(""))]);

  questions.forEach(question => {
    rows.push([
      q(question.priority), q(question.question), q(question.context),
      q(question.resolved ? "Resolved" : "Open"), ...Array(7).fill(q("")),
    ]);
  });

  const csv = "\uFEFF" + rows.map(row => row.join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Aether_Design_Backlog_${projectName.replace(/\s+/g, "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Section Tabs ───────────────────────────────────────────────────────────────

type SectionKey = "backlog" | "modules" | "flows" | "questions";

const SECTION_TABS: { key: SectionKey; label: string; icon: React.ElementType; getBadge?: (m: BacklogModule[], q: OpenQuestion[]) => number | null }[] = [
  { key: "backlog",    label: "Design Backlog",          icon: Layers,     getBadge: (m) => m.reduce((n, mod) => n + mod.items.length, 0) },
  { key: "modules",   label: "Module Map",               icon: LayoutGrid, getBadge: (m) => m.length },
  { key: "flows",     label: "Flows & IA",               icon: Share2 },
  { key: "questions", label: "Open Questions",            icon: HelpCircle, getBadge: (_m, q) => q.filter(x => !x.resolved).length || null },
];

// ─── Main Page ──────────────────────────────────────────────────────────────────

const DesignBacklog = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState<BacklogModule[]>(INITIAL_MODULES);
  const [questions, setQuestions] = useState<OpenQuestion[]>(INITIAL_QUESTIONS);
  const [activeSection, setActiveSection] = useState<SectionKey>("backlog");
  const [projectName, setProjectName] = useState("Aether Project");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);

  const commitName = () => { setProjectName(nameDraft.trim() || projectName); setEditingName(false); };

  const totalItems = modules.reduce((n, m) => n + m.items.length, 0);
  const highItems  = modules.reduce((n, m) => n + m.items.filter(i => i.priority === "High").length, 0);
  const unresolvedQ = questions.filter(q => !q.resolved).length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* ── Header ── */}
          <header className="h-14 flex items-center border-b border-border px-6 gap-3 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
            <div className="h-4 w-px bg-border shrink-0" />

            {editingName ? (
              <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameDraft(projectName); setEditingName(false); } }}
                className="text-sm font-medium bg-accent/[0.06] border border-accent/20 rounded-md px-2 py-0.5 outline-none w-40 focus:border-accent/40 transition-colors" />
            ) : (
              <button onClick={() => { setNameDraft(projectName); setEditingName(true); }}
                className="text-sm font-medium text-foreground hover:text-accent transition-colors group flex items-center gap-1">
                {projectName}
                <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-40 transition-opacity" strokeWidth={1.5} />
              </button>
            )}

            <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />
            <span className="text-xs font-medium text-foreground hidden sm:block">Phase 01</span>
            <span className="text-xs text-muted-foreground hidden md:block">— Design Backlog</span>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--success-soft))] shrink-0 hidden lg:flex">
              <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
              <span className="text-[11px] font-semibold text-[hsl(var(--success))]">PRD Clarity 69%</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate("/project/phase/01/journey")}
                className="h-8 rounded-lg text-xs gap-1.5 px-3 text-muted-foreground hover:text-foreground hidden sm:flex">
                <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
                Back to Journey Mapping
              </Button>

              <Button variant="outline"
                onClick={() => exportBacklog(modules, questions, projectName)}
                className="h-8 rounded-lg text-xs gap-1.5 px-3 border-border/60 hidden sm:flex">
                <Download className="h-3 w-3" strokeWidth={1.5} />
                Export Excel
              </Button>

              <Button
                onClick={() => navigate("/project/phase/02")}
                className="h-8 rounded-lg text-xs gap-1.5 px-3 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft">
                Proceed to Screen Derivation
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </header>

          {/* ── Stage Tracker + Sub-step ── */}
          <div className="border-b border-border/60 px-6 py-3 space-y-3 shrink-0">
            <StageTracker current={1} />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <SubStepStepper current={2} />
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span><span className="font-semibold text-foreground">{totalItems}</span> items</span>
                <span><span className="font-semibold text-[hsl(var(--success))]">{highItems}</span> high priority</span>
                {unresolvedQ > 0 && (
                  <span className="text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                    {unresolvedQ} open question{unresolvedQ > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Context Summary ── */}
          <ContextSummary />

          {/* ── Section Tabs ── */}
          <div className="border-b border-border/60 px-6 shrink-0">
            <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
              {SECTION_TABS.map(tab => {
                const badge = tab.getBadge?.(modules, questions);
                const Icon = tab.icon;
                return (
                  <button key={tab.key} onClick={() => setActiveSection(tab.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap shrink-0",
                      activeSection === tab.key
                        ? "border-accent text-accent"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                    )}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {tab.label}
                    {badge != null && badge > 0 && (
                      <span className={cn(
                        "text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center",
                        activeSection === tab.key ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"
                      )}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main Workspace ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6">
              <AnimatePresence mode="wait">
                {activeSection === "backlog" && (
                  <motion.div key="backlog" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    className="space-y-4">
                    {modules.map(mod => (
                      <BacklogModulePanel key={mod.id} module={mod}
                        onUpdateModule={updated => setModules(prev => prev.map(m => m.id === updated.id ? updated : m))} />
                    ))}
                    <button
                      onClick={() => setModules(prev => [...prev, {
                        id: `m${Date.now()}`, name: "New Module", description: "Define this module's scope.",
                        color: "border-l-accent", dotClass: "bg-accent", items: [],
                      }])}
                      className="w-full border-2 border-dashed border-border/50 rounded-2xl py-5 flex items-center justify-center gap-2 text-sm text-muted-foreground/40 hover:text-accent hover:border-accent/30 hover:bg-accent/[0.02] transition-all">
                      <Plus className="h-4 w-4" strokeWidth={1.5} /> Add Module
                    </button>
                  </motion.div>
                )}

                {activeSection === "modules" && (
                  <motion.div key="modules" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <ModuleMapSection modules={modules} />
                  </motion.div>
                )}

                {activeSection === "flows" && (
                  <motion.div key="flows" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <FlowsAndIASection />
                  </motion.div>
                )}

                {activeSection === "questions" && (
                  <motion.div key="questions" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <OpenQuestionsSection questions={questions} onChange={setQuestions} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Bottom CTA ── */}
          <div className="border-t border-border bg-background/95 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {totalItems} backlog items across {modules.length} modules · <span className="text-[hsl(var(--success))]">{highItems} high priority</span>
              </p>
              {unresolvedQ > 0 && (
                <p className="text-xs text-amber-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                  {unresolvedQ} open question{unresolvedQ > 1 ? "s" : ""} — resolve before proceeding
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline"
                onClick={() => exportBacklog(modules, questions, projectName)}
                className="h-10 rounded-xl border-border/60 text-sm gap-1.5">
                <Download className="h-4 w-4" strokeWidth={1.5} />
                Export Excel
              </Button>
              <Button
                onClick={() => navigate("/project/phase/02")}
                className="h-10 rounded-xl text-sm gap-1.5 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft">
                Proceed to Screen Derivation
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </div>

        </div>
      </div>
    </SidebarProvider>
  );
};

export default DesignBacklog;
