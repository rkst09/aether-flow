import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, ChevronDown, ChevronRight,
  Layers, Share2, Plus, Pencil, X,
  AlertTriangle, Info, SplitSquareHorizontal,
  GitBranch, Cpu, FileText, Brain, Upload, BookOpen,
  Search, Zap, Users, Monitor, Link2, MapPin,
  Download, FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

// ─── Types ───────────────────────────────────────────────────────────────────

type ScreenType = "Entry" | "Action" | "Detail" | "System" | "Feedback";
type Complexity  = "Simple" | "Medium" | "Complex";
type ScreenState = "Loading" | "Empty" | "Error" | "Success";

interface ScreenEntry {
  id: string;
  name: string;
  type: ScreenType;
  personas: string[];
  purpose: string;
  journeyStage: string;   // traceability: which journey stage
  backlogRef: string;     // traceability: which backlog item
  entryPoints: string[];
  exitPoints: string[];
  componentHints: string[];
  states: ScreenState[];
  complexity: Complexity;
  shared: boolean;
  warning?: string;
}

interface ScreenModule {
  id: string;
  name: string;
  color: string;
  bg: string;
  dot: string;
  screens: ScreenEntry[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PERSONAS = [
  { id: "p1", name: "Sarah Chen",   initials: "SC", color: "bg-violet-500", tag: "Primary"   },
  { id: "p2", name: "Alex Rivera",  initials: "AR", color: "bg-blue-500",   tag: "Primary"   },
  { id: "p3", name: "Jordan Patel", initials: "JP", color: "bg-amber-500",  tag: "Secondary" },
  { id: "p4", name: "Morgan Kim",   initials: "MK", color: "bg-rose-500",   tag: "Edge"      },
];

const JOURNEY_STAGE_COLORS: Record<string, string> = {
  "Discovery":           "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "Onboarding":          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Core Workflow":       "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Review & Validate":   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Export & Share":      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "Platform Management": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const INITIAL_MODULES: ScreenModule[] = [
  {
    id: "m1", name: "Authentication",
    color: "border-l-violet-400", bg: "bg-violet-500/[0.06]", dot: "bg-violet-400",
    screens: [
      {
        id: "s1", name: "Sign Up", type: "Entry",
        personas: ["p1","p2","p3"],
        purpose: "New user account creation via email or SSO — triggers workspace initialisation",
        journeyStage: "Discovery", backlogRef: "B-01 · User Onboarding Flow",
        entryPoints: ["Landing page", "Invite link", "Marketing CTA"],
        exitPoints: ["Project Setup Wizard", "Main Dashboard"],
        componentHints: ["Form", "OAuth buttons", "Password strength", "Progress indicator"],
        states: ["Loading","Error","Success"], complexity: "Simple", shared: true,
      },
      {
        id: "s2", name: "Login", type: "Entry",
        personas: ["p1","p2","p3","p4"],
        purpose: "Returning user authentication with session restoration to last active context",
        journeyStage: "Discovery", backlogRef: "B-01 · User Onboarding Flow",
        entryPoints: ["Direct URL", "Email link", "Post sign-up redirect"],
        exitPoints: ["Main Dashboard", "Last active project"],
        componentHints: ["Form", "OAuth buttons", "Remember me toggle", "Error inline"],
        states: ["Loading","Error","Success"], complexity: "Simple", shared: true,
      },
      {
        id: "s3", name: "Password Reset", type: "System",
        personas: ["p1","p2","p3","p4"],
        purpose: "Recover account access via tokenised email link — 2-step verification flow",
        journeyStage: "Discovery", backlogRef: "B-01 · User Onboarding Flow",
        entryPoints: ["Login screen — forgot password link"],
        exitPoints: ["Login screen"],
        componentHints: ["Email input", "Confirmation banner", "Countdown timer", "Resend link"],
        states: ["Loading","Error","Success"], complexity: "Simple", shared: true,
      },
    ],
  },
  {
    id: "m2", name: "Dashboard & Navigation",
    color: "border-l-blue-400", bg: "bg-blue-500/[0.06]", dot: "bg-blue-400",
    screens: [
      {
        id: "s4", name: "Main Dashboard", type: "Entry",
        personas: ["p1","p2","p3"],
        purpose: "Central hub showing project pipeline health, phase progress, and contextual quick actions",
        journeyStage: "Core Workflow", backlogRef: "B-02 · Dashboard Intelligence",
        entryPoints: ["Login", "Sidebar nav — home icon"],
        exitPoints: ["Any project", "Quick tools panel", "Files", "Customization"],
        componentHints: ["Phase prompt cards", "Progress stepper", "Activity feed", "Quick action panel"],
        states: ["Loading","Empty","Success"], complexity: "Complex", shared: true,
      },
      {
        id: "s5", name: "Projects List", type: "Detail",
        personas: ["p1","p2","p3"],
        purpose: "Browse, search, and manage all workspace projects with phase-level status at a glance",
        journeyStage: "Core Workflow", backlogRef: "B-02 · Dashboard Intelligence",
        entryPoints: ["Sidebar nav", "Dashboard CTA"],
        exitPoints: ["Project Detail", "New project intake"],
        componentHints: ["Card grid", "Search bar", "Status filter", "Sort controls", "Empty state"],
        states: ["Loading","Empty","Success"], complexity: "Medium", shared: true,
      },
      {
        id: "s6", name: "Project Detail", type: "Detail",
        personas: ["p1","p2"],
        purpose: "Per-project overview with all 6 phase statuses, entry points, and last-run metadata",
        journeyStage: "Core Workflow", backlogRef: "B-03 · Project Intelligence Engine",
        entryPoints: ["Projects list — card click", "Dashboard recent projects"],
        exitPoints: ["Any phase page", "Files", "Back to projects"],
        componentHints: ["Phase stepper", "Progress rings", "Metadata grid", "Per-phase CTA"],
        states: ["Loading","Error","Success"], complexity: "Medium", shared: false,
      },
    ],
  },
  {
    id: "m3", name: "Phase 01 — Design Intake",
    color: "border-l-emerald-400", bg: "bg-emerald-500/[0.06]", dot: "bg-emerald-400",
    screens: [
      {
        id: "s7", name: "Project Intake", type: "Action",
        personas: ["p1","p2"],
        purpose: "PRD upload and project metadata entry — triggers AI analysis pipeline on submission",
        journeyStage: "Onboarding", backlogRef: "B-03 · PRD Processing",
        entryPoints: ["Dashboard new project CTA", "Projects list — new button"],
        exitPoints: ["Persona Studio (on success)", "Projects list (on cancel)"],
        componentHints: ["File upload dropzone", "Project name input", "Description textarea", "Upload progress", "Validation feedback"],
        states: ["Loading","Error","Success"], complexity: "Medium", shared: false,
      },
      {
        id: "s8", name: "Persona Studio", type: "Action",
        personas: ["p1","p2"],
        purpose: "Review and confirm AI-extracted persona candidates — inline editing, confidence scoring, status management",
        journeyStage: "Core Workflow", backlogRef: "B-04 · Persona Identification",
        entryPoints: ["Project Intake — on AI run completion"],
        exitPoints: ["Journey Mapping (on confirm)"],
        componentHints: ["Split panel", "Expandable persona cards", "Inline field editor", "Confidence bar", "Tag selector", "Accordion sections"],
        states: ["Loading","Empty","Error","Success"], complexity: "Complex", shared: false,
      },
      {
        id: "s9", name: "Journey Mapping", type: "Action",
        personas: ["p1","p2"],
        purpose: "Horizontal per-persona journey canvas with emotion scoring, stage editing, and opportunity identification",
        journeyStage: "Core Workflow", backlogRef: "B-05 · Journey Mapping",
        entryPoints: ["Persona Studio — on confirm"],
        exitPoints: ["Design Backlog (on confirm)"],
        componentHints: ["H-scroll stage canvas", "Emotion area chart", "Stage cards", "Opportunity impact/effort badges", "Persona pills"],
        states: ["Loading","Empty","Error","Success"], complexity: "Complex", shared: false,
        warning: "Multi-persona state complexity — empty state must clearly guide first-time users to add a stage",
      },
      {
        id: "s10", name: "Design Backlog", type: "Action",
        personas: ["p1","p2"],
        purpose: "Structured design task board: backlog items, module map, flows & IA, and open questions",
        journeyStage: "Review & Validate", backlogRef: "B-06 · Design Backlog Derivation",
        entryPoints: ["Journey Mapping — on confirm"],
        exitPoints: ["Screen Derivation (on proceed)"],
        componentHints: ["4-tab workspace", "Expandable item rows", "Module map diagram", "IA tree", "Open questions list", "CSV export"],
        states: ["Loading","Empty","Error","Success"], complexity: "Complex", shared: false,
      },
    ],
  },
  {
    id: "m4", name: "Phase 02 — Screen Derivation",
    color: "border-l-amber-400", bg: "bg-amber-500/[0.06]", dot: "bg-amber-400",
    screens: [
      {
        id: "s11", name: "Screen Derivation Workspace", type: "Action",
        personas: ["p1","p2"],
        purpose: "Full product screen architecture derived from backlog modules — screen cards, relation map, shared/exclusive split",
        journeyStage: "Review & Validate", backlogRef: "B-07 · Screen Architecture",
        entryPoints: ["Design Backlog — proceed CTA"],
        exitPoints: ["Prototype Prompt Generator (on confirm)"],
        componentHints: ["3-tab workspace", "Expandable screen cards", "Relation flow map", "Shared/Exclusive filter", "Summary stat cards"],
        states: ["Loading","Empty","Error","Success"], complexity: "Complex", shared: false,
      },
    ],
  },
  {
    id: "m5", name: "Phase 03–06 — AI Pipeline",
    color: "border-l-rose-400", bg: "bg-rose-500/[0.06]", dot: "bg-rose-400",
    screens: [
      {
        id: "s12", name: "Prototype Prompt Generator", type: "Action",
        personas: ["p1","p2"],
        purpose: "Generate Lovable-ready prompts per confirmed screen — grouped by persona, copyable individually or in bulk",
        journeyStage: "Export & Share", backlogRef: "B-08 · Prototype Prompt Generation",
        entryPoints: ["Screen Derivation — confirm CTA"],
        exitPoints: ["UX Audit (on proceed)"],
        componentHints: ["Prompt cards", "One-click copy", "Bulk export button", "Persona grouping tabs", "Screen name header"],
        states: ["Loading","Empty","Success"], complexity: "Medium", shared: false,
      },
      {
        id: "s13", name: "UX Audit Report", type: "Detail",
        personas: ["p1","p2"],
        purpose: "Heuristic evaluation output: friction points, accessibility gaps, missing states, consistency issues — per priority",
        journeyStage: "Review & Validate", backlogRef: "B-09 · UX Heuristic Audit",
        entryPoints: ["Prototype Generator — proceed CTA"],
        exitPoints: ["Copywriting Review (on proceed)"],
        componentHints: ["Accordion issue sections", "Priority badges (High/Med/Low)", "Issue detail cards", "Severity filter", "Acknowledge CTA"],
        states: ["Loading","Empty","Success"], complexity: "Complex", shared: false,
        warning: "Must surface all 5 heuristic categories — missing empty + error states are the most common finding",
      },
      {
        id: "s14", name: "UX Copywriting Review", type: "Action",
        personas: ["p1","p2"],
        purpose: "Before/after comparison for all copy: CTA labels, errors, microcopy, tooltips, empty state text",
        journeyStage: "Review & Validate", backlogRef: "B-10 · UX Copy Review",
        entryPoints: ["UX Audit — proceed CTA"],
        exitPoints: ["Design Documentation (on confirm)"],
        componentHints: ["Before/after comparison table", "Accept/reject controls", "Inline edit", "Bulk approve", "Category filter"],
        states: ["Loading","Empty","Success"], complexity: "Medium", shared: false,
      },
      {
        id: "s15", name: "Design Documentation", type: "Feedback",
        personas: ["p1","p2"],
        purpose: "BA-ready .docx output: screen annotations, interaction logic, edge cases, validation rules, navigation flows",
        journeyStage: "Export & Share", backlogRef: "B-11 · BA Documentation",
        entryPoints: ["Copywriting Review — confirm CTA"],
        exitPoints: ["File download (on download)", "Main Dashboard (on finish)"],
        componentHints: ["Document section preview", "Section navigation", "Download .docx button", "Share link generator"],
        states: ["Loading","Success"], complexity: "Complex", shared: false,
      },
    ],
  },
  {
    id: "m6", name: "Platform Tools & Settings",
    color: "border-l-slate-400", bg: "bg-slate-500/[0.06]", dot: "bg-slate-400",
    screens: [
      {
        id: "s16", name: "Files", type: "Detail",
        personas: ["p1","p2","p3"],
        purpose: "Manage all uploaded PRDs and AI-generated outputs for the active project — with type, size, date",
        journeyStage: "Platform Management", backlogRef: "B-12 · File Management",
        entryPoints: ["Sidebar nav — Files icon"],
        exitPoints: ["Project Intake (re-upload)", "Export download"],
        componentHints: ["File list table", "Upload zone", "File type badges", "Sort/filter controls", "Version tag"],
        states: ["Loading","Empty","Success"], complexity: "Simple", shared: true,
      },
      {
        id: "s17", name: "Customization", type: "Action",
        personas: ["p1","p2"],
        purpose: "Configure AI output preferences: tone (formal/conversational), persona archetypes, verbosity level",
        journeyStage: "Platform Management", backlogRef: "B-13 · Output Customisation",
        entryPoints: ["Sidebar nav — Customization icon"],
        exitPoints: ["Return to previous context"],
        componentHints: ["Toggle groups", "Radio sets", "Output preview panel", "Save confirmation toast"],
        states: ["Success"], complexity: "Simple", shared: false,
      },
      {
        id: "s18", name: "UX Audit Tool", type: "Action",
        personas: ["p1","p2","p3"],
        purpose: "Standalone heuristic audit — run outside the pipeline by pasting screen descriptions or a screen list",
        journeyStage: "Platform Management", backlogRef: "B-14 · Standalone UX Tools",
        entryPoints: ["Sidebar nav", "Dashboard quick tools panel"],
        exitPoints: ["Audit findings view", "Export report"],
        componentHints: ["Paste/text input area", "Audit report accordion", "Severity filter", "Export button"],
        states: ["Loading","Empty","Success"], complexity: "Medium", shared: true,
      },
      {
        id: "s19", name: "UX Copy Tool", type: "Action",
        personas: ["p1","p2","p3"],
        purpose: "Standalone copy review — paste any screen copy to get before/after improvement suggestions",
        journeyStage: "Platform Management", backlogRef: "B-14 · Standalone UX Tools",
        entryPoints: ["Sidebar nav", "Dashboard quick tools panel"],
        exitPoints: ["Copy improvement view", "Export table"],
        componentHints: ["Paste input area", "Before/after comparison table", "Accept/reject row controls", "Export"],
        states: ["Loading","Empty","Success"], complexity: "Medium", shared: true,
      },
    ],
  },
];

const FLOW_LANES = [
  {
    id: "auth",     label: "Authentication",          labelColor: "text-violet-600 dark:text-violet-400",
    nodeColor: "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30",
    nodeType: "entry",
    nodes: [{ name: "Sign Up" }, { name: "Login" }, { name: "Password Reset" }],
  },
  {
    id: "hub",      label: "Dashboard & Navigation",  labelColor: "text-blue-600 dark:text-blue-400",
    nodeColor: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30",
    nodeType: "hub",
    nodes: [{ name: "Main Dashboard" }, { name: "Projects List" }, { name: "Project Detail" }],
  },
  {
    id: "phase01",  label: "Phase 01 — Design Intake", labelColor: "text-emerald-600 dark:text-emerald-400",
    nodeColor: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30",
    nodeType: "flow",
    nodes: [{ name: "Project Intake" }, { name: "Persona Studio" }, { name: "Journey Mapping" }, { name: "Design Backlog" }],
  },
  {
    id: "phase02",  label: "Phase 02 — Screen Derivation", labelColor: "text-amber-600 dark:text-amber-400",
    nodeColor: "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-300 dark:ring-amber-700",
    nodeType: "current",
    nodes: [{ name: "Screen Derivation ← current" }],
  },
  {
    id: "pipeline", label: "Phase 03–06 — AI Pipeline", labelColor: "text-rose-600 dark:text-rose-400",
    nodeColor: "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30",
    nodeType: "flow",
    nodes: [{ name: "Prototype Prompts" }, { name: "UX Audit" }, { name: "Copy Review" }, { name: "Documentation" }],
  },
  {
    id: "tools",    label: "Platform Tools (sidebar-accessible)", labelColor: "text-slate-500 dark:text-slate-400",
    nodeColor: "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 border-dashed",
    nodeType: "utility",
    nodes: [{ name: "Files" }, { name: "Customization" }, { name: "UX Audit Tool" }, { name: "Copy Tool" }],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ScreenType, { color: string; dot: string }> = {
  Entry:    { color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",   dot: "bg-violet-400" },
  Action:   { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",           dot: "bg-blue-400"   },
  Detail:   { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-400" },
  System:   { color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",          dot: "bg-slate-400"  },
  Feedback: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",       dot: "bg-amber-400"  },
};

const COMPLEXITY_CONFIG: Record<Complexity, { dot: string; label: string; text: string }> = {
  Simple:  { dot: "bg-emerald-400", label: "Simple",  text: "text-emerald-600 dark:text-emerald-400" },
  Medium:  { dot: "bg-amber-400",   label: "Medium",  text: "text-amber-600 dark:text-amber-400"     },
  Complex: { dot: "bg-rose-400",    label: "Complex", text: "text-rose-600 dark:text-rose-400"       },
};

const STATE_COLORS: Record<ScreenState, string> = {
  Loading: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  Empty:   "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  Error:   "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  Success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const ALL_STATES: ScreenState[] = ["Loading", "Empty", "Error", "Success"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function EditableText({
  value, onChange, multiline = false, className = "",
}: { value: string; onChange: (v: string) => void; multiline?: boolean; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const commit = () => { onChange(draft.trim() || value); setEditing(false); };
  if (editing) {
    const shared = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline) commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      },
      autoFocus: true,
      className: `w-full bg-secondary border border-border rounded-md px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary/40 ${className}`,
    };
    return multiline
      ? <textarea rows={3} {...shared as React.TextareaHTMLAttributes<HTMLTextAreaElement>} />
      : <input {...shared as React.InputHTMLAttributes<HTMLInputElement>} />;
  }
  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`cursor-text hover:bg-secondary/60 rounded px-0.5 -mx-0.5 transition-colors ${className}`}
    >
      {value}
    </span>
  );
}

function StageTracker({ current }: { current: number }) {
  const stages = [
    { label: "Upload",    icon: Upload   },
    { label: "Intake",    icon: Brain    },
    { label: "Screens",   icon: Layers   },
    { label: "Prototype", icon: Cpu      },
    { label: "Audit",     icon: Search   },
    { label: "Copy",      icon: FileText },
    { label: "Docs",      icon: BookOpen },
  ];
  return (
    <div className="flex items-center gap-0">
      {stages.map((s, i) => {
        const done   = i < current;
        const active = i === current;
        const locked = i > current;
        return (
          <div key={s.label} className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all
                  ${active ? "bg-foreground text-background"                : ""}
                  ${done   ? "text-muted-foreground hover:text-foreground"  : ""}
                  ${locked ? "text-muted-foreground/40 cursor-not-allowed"  : "cursor-pointer"}
                `}>
                  <s.icon className="h-3 w-3" strokeWidth={1.5} />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">{s.label}</TooltipContent>
            </Tooltip>
            {i < stages.length - 1 && (
              <div className={`w-4 h-px mx-0.5 ${i < current ? "bg-foreground/30" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PersonaAvatar({ id, size = "sm" }: { id: string; size?: "sm" | "xs" }) {
  const p = PERSONAS.find(x => x.id === id);
  if (!p) return null;
  const sz = size === "xs" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`${sz} ${p.color} rounded-full flex items-center justify-center text-white font-semibold shrink-0 ring-1 ring-background`}>
          {p.initials}
        </div>
      </TooltipTrigger>
      <TooltipContent>{p.name} — {p.tag}</TooltipContent>
    </Tooltip>
  );
}

function IntelBanner({ type, message }: { type: "warning" | "info"; message: string }) {
  const cfg = {
    warning: { bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800", Icon: AlertTriangle, text: "text-amber-700 dark:text-amber-400" },
    info:    { bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",     Icon: Info,          text: "text-blue-700 dark:text-blue-400"   },
  }[type];
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${cfg.bg}`}>
      <cfg.Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.text}`} strokeWidth={1.5} />
      <p className={`text-[11px] leading-relaxed ${cfg.text}`}>{message}</p>
    </div>
  );
}

// ─── Screen Card ─────────────────────────────────────────────────────────────

function ScreenCard({
  screen, onUpdate, onDelete,
}: {
  screen: ScreenEntry;
  onUpdate: (s: ScreenEntry) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeCfg  = TYPE_CONFIG[screen.type];
  const compCfg  = COMPLEXITY_CONFIG[screen.complexity];
  const stageBg  = JOURNEY_STAGE_COLORS[screen.journeyStage] ?? "bg-secondary text-muted-foreground";

  const cycleType = () => {
    const order: ScreenType[] = ["Entry","Action","Detail","System","Feedback"];
    onUpdate({ ...screen, type: order[(order.indexOf(screen.type) + 1) % order.length] });
  };
  const cycleComplexity = () => {
    const order: Complexity[] = ["Simple","Medium","Complex"];
    onUpdate({ ...screen, complexity: order[(order.indexOf(screen.complexity) + 1) % order.length] });
  };
  const toggleState = (s: ScreenState) => {
    const next = screen.states.includes(s)
      ? screen.states.filter(x => x !== s)
      : [...screen.states, s];
    onUpdate({ ...screen, states: next });
  };

  const missingError = !screen.states.includes("Error");
  const noPurpose    = !screen.purpose.trim();
  const noPersonas   = screen.personas.length === 0;

  return (
    <motion.div layout className={`rounded-xl border bg-background transition-all
      ${expanded ? "border-border shadow-sm" : "border-border/60 hover:border-border hover:shadow-sm"}`}>

      {/* ── Collapsed row ── */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Left: name + traceability tags */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`h-2 w-2 rounded-full shrink-0 ${typeCfg.dot}`} />

          <span className="text-sm font-semibold text-foreground truncate min-w-0 max-w-[160px] sm:max-w-none">
            <EditableText
              value={screen.name}
              onChange={v => onUpdate({ ...screen, name: v })}
              className="font-semibold"
            />
          </span>

          {/* Type badge */}
          <button
            onClick={e => { e.stopPropagation(); cycleType(); }}
            className={`shrink-0 hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full hover:opacity-75 transition-opacity ${typeCfg.color}`}
          >
            {screen.type}
          </button>

          {/* Journey stage traceability */}
          <span className={`shrink-0 hidden md:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${stageBg}`}>
            <MapPin className="h-2.5 w-2.5" strokeWidth={2} />
            {screen.journeyStage}
          </span>

          {/* Backlog ref traceability */}
          <span className="shrink-0 hidden lg:inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
            <Link2 className="h-2.5 w-2.5" strokeWidth={2} />
            {screen.backlogRef}
          </span>

          {/* Warnings */}
          {(screen.warning || missingError || noPurpose || noPersonas) && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" strokeWidth={1.5} />
          )}
        </div>

        {/* Right: personas + complexity + shared + chevron */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex -space-x-1.5">
            {screen.personas.slice(0, 3).map(pid => (
              <PersonaAvatar key={pid} id={pid} size="xs" />
            ))}
            {screen.personas.length > 3 && (
              <div className="h-5 w-5 bg-muted rounded-full flex items-center justify-center text-[9px] text-muted-foreground ring-1 ring-background">
                +{screen.personas.length - 3}
              </div>
            )}
          </div>

          <button
            onClick={e => { e.stopPropagation(); cycleComplexity(); }}
            className={`hidden sm:flex items-center gap-1 text-[10px] font-medium hover:opacity-75 transition-opacity ${compCfg.text}`}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${compCfg.dot}`} />
            {compCfg.label}
          </button>

          {screen.shared && (
            <span className="hidden sm:inline text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">Shared</span>
          )}

          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
          }
        </div>
      </div>

      {/* ── Expanded body ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-4 space-y-5 border-t border-border/40">

              {/* Intelligence banners */}
              {screen.warning  && <IntelBanner type="warning" message={screen.warning} />}
              {noPersonas      && <IntelBanner type="warning" message="No persona assigned — this screen has no defined audience." />}
              {noPurpose       && <IntelBanner type="warning" message="Purpose is empty — this screen has no defined function." />}
              {missingError    && <IntelBanner type="info"    message='Missing "Error" state — all screens should gracefully handle failures.' />}

              {/* Purpose */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Purpose</p>
                <EditableText
                  value={screen.purpose}
                  onChange={v => onUpdate({ ...screen, purpose: v })}
                  multiline
                  className="text-sm leading-relaxed text-foreground"
                />
              </div>

              {/* Traceability row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-secondary/40 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Journey Stage</p>
                  <EditableText
                    value={screen.journeyStage}
                    onChange={v => onUpdate({ ...screen, journeyStage: v })}
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${stageBg}`}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Backlog Source</p>
                  <EditableText
                    value={screen.backlogRef}
                    onChange={v => onUpdate({ ...screen, backlogRef: v })}
                    className="text-xs text-foreground font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Scope</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={screen.shared}
                      onChange={e => onUpdate({ ...screen, shared: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-xs text-foreground">{screen.shared ? "Shared — multiple personas" : "Exclusive — specific persona"}</span>
                  </label>
                </div>
              </div>

              {/* Personas */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Persona Mapping</p>
                <div className="flex flex-wrap gap-2">
                  {screen.personas.map(pid => {
                    const p = PERSONAS.find(x => x.id === pid)!;
                    return (
                      <div key={pid} className="flex items-center gap-1.5 text-xs bg-secondary border border-border/50 rounded-full pl-1 pr-2 py-0.5">
                        <PersonaAvatar id={pid} size="xs" />
                        <span className="text-foreground font-medium">{p.name}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{p.tag}</span>
                        <button
                          onClick={() => onUpdate({ ...screen, personas: screen.personas.filter(x => x !== pid) })}
                          className="text-muted-foreground hover:text-foreground ml-0.5"
                        >
                          <X className="h-2.5 w-2.5" strokeWidth={2} />
                        </button>
                      </div>
                    );
                  })}
                  {PERSONAS.filter(p => !screen.personas.includes(p.id)).map(p => (
                    <button
                      key={p.id}
                      onClick={() => onUpdate({ ...screen, personas: [...screen.personas, p.id] })}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-2.5 py-0.5 transition-colors"
                    >
                      <Plus className="h-2.5 w-2.5" strokeWidth={2} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entry → Exit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Entry Points</p>
                  <ul className="space-y-1">
                    {screen.entryPoints.map((ep, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <div className="h-1 w-1 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                        {ep}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Exit Points</p>
                  <ul className="space-y-1">
                    {screen.exitPoints.map((ep, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50 mt-0.5 shrink-0" strokeWidth={1.5} />
                        {ep}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Component hints + States */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Component Hints</p>
                  <div className="flex flex-wrap gap-1.5">
                    {screen.componentHints.map((c, i) => (
                      <span key={i} className="text-[11px] bg-secondary border border-border/40 text-foreground rounded-md px-2 py-0.5">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Required States</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_STATES.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleState(s)}
                        className={`text-[11px] font-medium rounded-md px-2 py-0.5 transition-all border
                          ${screen.states.includes(s)
                            ? `${STATE_COLORS[s]} border-transparent`
                            : "bg-secondary/40 text-muted-foreground/40 border-dashed border-border/40 line-through"
                          }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end pt-1 border-t border-border/40">
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Remove screen
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Module Section ───────────────────────────────────────────────────────────

function ModuleSection({
  module, onUpdateModule,
}: {
  module: ScreenModule;
  onUpdateModule: (m: ScreenModule) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const complexCount = module.screens.filter(s => s.complexity === "Complex").length;
  const warnCount    = module.screens.filter(s => s.warning || !s.states.includes("Error") || s.personas.length === 0).length;
  const sharedCount  = module.screens.filter(s => s.shared).length;

  const updateScreen = (id: string, updated: ScreenEntry) =>
    onUpdateModule({ ...module, screens: module.screens.map(s => s.id === id ? updated : s) });
  const deleteScreen = (id: string) =>
    onUpdateModule({ ...module, screens: module.screens.filter(s => s.id !== id) });
  const addScreen = () => {
    const blank: ScreenEntry = {
      id: `s${Date.now()}`, name: "New Screen", type: "Action",
      personas: [], purpose: "",
      journeyStage: "Core Workflow", backlogRef: "B-?? · Unlinked",
      entryPoints: ["—"], exitPoints: ["—"],
      componentHints: [], states: ["Loading","Success"],
      complexity: "Simple", shared: false,
    };
    onUpdateModule({ ...module, screens: [...module.screens, blank] });
  };

  return (
    <div className={`rounded-2xl border-l-4 ${module.color} border border-border/60 overflow-hidden`}>
      {/* Module header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`w-full flex items-center justify-between px-5 py-4 ${module.bg} hover:brightness-[0.97] dark:hover:brightness-110 transition-all`}
      >
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${module.dot}`} />
          <span className="text-sm font-bold text-foreground">{module.name}</span>
          <span className="text-xs text-muted-foreground bg-background/60 rounded-full px-2 py-0.5 border border-border/40">
            {module.screens.length} screen{module.screens.length !== 1 ? "s" : ""}
          </span>
          {sharedCount > 0 && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              {sharedCount} shared
            </span>
          )}
          {complexCount > 0 && (
            <span className="text-[11px] text-rose-600 dark:text-rose-400 hidden sm:inline">
              {complexCount} complex
            </span>
          )}
          {warnCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
              {warnCount}
            </div>
          )}
        </div>
        {collapsed
          ? <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          : <ChevronDown  className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        }
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 bg-background">
              {module.screens.map(screen => (
                <ScreenCard
                  key={screen.id}
                  screen={screen}
                  onUpdate={u => updateScreen(screen.id, u)}
                  onDelete={() => deleteScreen(screen.id)}
                />
              ))}
              <button
                onClick={addScreen}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-xs text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-secondary/20 transition-all"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Add screen to {module.name}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Screen List Tab ──────────────────────────────────────────────────────────

function ScreenListTab({
  modules, filter, onUpdateModule,
}: {
  modules: ScreenModule[];
  filter: "all" | "shared" | "exclusive";
  onUpdateModule: (id: string, m: ScreenModule) => void;
}) {
  const filtered = useMemo(() =>
    filter === "all" ? modules
    : modules.map(mod => ({
        ...mod,
        screens: mod.screens.filter(s => filter === "shared" ? s.shared : !s.shared),
      })).filter(m => m.screens.length > 0),
    [modules, filter]
  );

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">No screens match this filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map(mod => (
        <ModuleSection
          key={mod.id}
          module={mod}
          onUpdateModule={m => onUpdateModule(mod.id, m)}
        />
      ))}
    </div>
  );
}

// ─── Relation Map Tab ─────────────────────────────────────────────────────────

function RelationMapTab() {
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Screen Navigation Flow</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Primary user paths — read top to bottom</p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-px bg-foreground/40" />
            <span>Sequential flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-px border-t border-dashed border-muted-foreground/50" />
            <span>Sidebar-accessible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded ring-1 ring-amber-400" />
            <span>Current phase</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-1 overflow-auto min-w-[560px]">
        {FLOW_LANES.map((lane, laneIdx) => (
          <div key={lane.id}>
            <div className="flex items-center gap-3">
              {/* Lane label */}
              <div className="w-48 shrink-0 flex items-center">
                <span className={`text-[11px] font-bold ${lane.labelColor}`}>{lane.label}</span>
              </div>
              {/* Nodes */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {lane.nodes.map((node, nIdx) => (
                  <div key={node.name} className="flex items-center gap-1.5">
                    <div className={`rounded-lg border text-xs font-medium text-foreground px-3 py-1.5 whitespace-nowrap ${lane.nodeColor}`}>
                      {node.name}
                    </div>
                    {nIdx < lane.nodes.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" strokeWidth={2} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Vertical connector — only between sequential lanes (not tools) */}
            {laneIdx < FLOW_LANES.length - 2 && (
              <div className="flex ml-48 pl-3 py-0.5">
                <div className="flex flex-col items-center">
                  <div className="w-px h-3 bg-border" />
                  <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-muted-foreground/30" />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="mt-5 pt-4 border-t border-border/50">
          <IntelBanner
            type="info"
            message="Platform tools (Files, Customization, standalone audit/copy tools) float outside the sequential flow — reachable from the sidebar at any point without breaking phase progression."
          />
        </div>
      </div>
    </div>
  );
}

// ─── Shared / Exclusive Tab ───────────────────────────────────────────────────

function SharedExclusiveTab({ modules }: { modules: ScreenModule[] }) {
  const allScreens = modules.flatMap(m =>
    m.screens.map(s => ({ ...s, moduleName: m.name, moduleDot: m.dot }))
  );
  const shared    = allScreens.filter(s => s.shared);
  const exclusive = allScreens.filter(s => !s.shared);

  const renderList = (screens: typeof allScreens, emptyMsg: string) => (
    <div className="space-y-1.5">
      {screens.length === 0
        ? <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-xs text-muted-foreground">{emptyMsg}</p>
          </div>
        : screens.map(s => {
          const typeCfg = TYPE_CONFIG[s.type];
          const compCfg = COMPLEXITY_CONFIG[s.complexity];
          const stageBg = JOURNEY_STAGE_COLORS[s.journeyStage] ?? "bg-secondary text-muted-foreground";
          return (
            <div key={s.id} className="flex items-start gap-3 rounded-xl border border-border/60 px-4 py-3 bg-background hover:border-border transition-colors">
              <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${s.moduleDot}`} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{s.name}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeCfg.color}`}>{s.type}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stageBg}`}>{s.journeyStage}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">{s.moduleName}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className={`text-[11px] font-medium ${compCfg.text}`}>{s.complexity}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-[11px] text-muted-foreground">{s.backlogRef}</span>
                </div>
              </div>
              <div className="flex -space-x-1.5 shrink-0">
                {s.personas.slice(0, 3).map(pid => <PersonaAvatar key={pid} id={pid} size="xs" />)}
                {s.personas.length > 3 && (
                  <div className="h-5 w-5 bg-muted rounded-full flex items-center justify-center text-[9px] text-muted-foreground ring-1 ring-background">
                    +{s.personas.length - 3}
                  </div>
                )}
              </div>
            </div>
          );
        })
      }
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <h3 className="text-sm font-bold text-foreground">Shared Screens</h3>
          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5 border border-border/40">{shared.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">Accessible by multiple personas — design must generalise across contexts</p>
        {renderList(shared, "No shared screens in current filter.")}
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <h3 className="text-sm font-bold text-foreground">Persona-Exclusive Screens</h3>
          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5 border border-border/40">{exclusive.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">Built for a specific persona — can be deeply optimised for that context and goal</p>
        {renderList(exclusive, "No exclusive screens in current filter.")}
      </div>
    </div>
  );
}

// ─── Export Utilities ─────────────────────────────────────────────────────────

function exportToExcel(modules: ScreenModule[], projectName: string) {
  const header = ["Module","Screen","Type","Complexity","Shared","Personas","Journey Stage","Backlog Ref","States","Purpose","Entry Points","Exit Points","Component Hints"];
  const rows: string[][] = [header];
  for (const mod of modules) {
    for (const s of mod.screens) {
      const personas = PERSONAS.filter(x => s.personas.includes(x.id)).map(x => x.name).join("; ");
      rows.push([
        mod.name, s.name, s.type, s.complexity,
        s.shared ? "Shared" : "Exclusive",
        personas, s.journeyStage, s.backlogRef,
        s.states.join("; "), s.purpose,
        s.entryPoints.join("; "), s.exitPoints.join("; "),
        s.componentHints.join("; "),
      ]);
    }
  }
  const csv = "\uFEFF" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${projectName.replace(/\s+/g, "_")}_Screen_List.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportMapToWord() {
  const laneRows = FLOW_LANES.map(lane =>
    `<tr>
      <td style="font-weight:600;padding:10px 14px;white-space:nowrap;vertical-align:top;color:#374151;width:220px;">${lane.label}</td>
      <td style="padding:10px 14px;color:#4b5563;">${lane.nodes.map(n => n.name).join(" → ")}</td>
    </tr>`
  ).join("");

  const html = `<html><head><meta charset="utf-8"/></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:40px;color:#111;font-size:13px;">
    <h1 style="font-size:20px;margin-bottom:4px;">Screen Navigation Flow</h1>
    <p style="font-size:12px;color:#6b7280;margin-bottom:24px;">Primary user paths — read top to bottom · Aether Platform</p>
    <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;">
      <thead><tr style="background:#f9fafb;">
        <th style="text-align:left;padding:8px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;border-bottom:2px solid #e5e7eb;width:220px;">Phase / Lane</th>
        <th style="text-align:left;padding:8px 14px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;border-bottom:2px solid #e5e7eb;">Screens (sequential)</th>
      </tr></thead>
      <tbody>${laneRows}</tbody>
    </table>
    <p style="font-size:11px;color:#9ca3af;margin-top:20px;">Platform tools are sidebar-accessible at any point without breaking phase progression.</p>
  </body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "Aether_Relation_Map.doc";
  a.click();
  URL.revokeObjectURL(url);
}

function exportMapToPDF() {
  const laneRows = FLOW_LANES.map(lane =>
    `<tr><td>${lane.label}</td><td>${lane.nodes.map(n => n.name).join(" → ")}</td></tr>`
  ).join("");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Aether — Screen Navigation Flow</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:-apple-system,Segoe UI,Arial,sans-serif;padding:40px;color:#111;font-size:12px}
      h1{font-size:18px;margin-bottom:4px}
      .sub{color:#6b7280;margin-bottom:24px;font-size:12px}
      table{width:100%;border-collapse:collapse}
      th{text-align:left;padding:8px 12px;background:#f9fafb;border-bottom:2px solid #e5e7eb;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
      td{padding:10px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top}
      td:first-child{font-weight:600;white-space:nowrap;width:220px;color:#374151}
      td:last-child{color:#4b5563;line-height:1.6}
      .note{font-size:11px;color:#9ca3af;margin-top:20px}
      @media print{body{padding:20px}}
    </style>
  </head><body>
    <h1>Screen Navigation Flow</h1>
    <p class="sub">Primary user paths — read top to bottom · Aether Platform</p>
    <table>
      <thead><tr><th>Phase / Lane</th><th>Screens (sequential)</th></tr></thead>
      <tbody>${laneRows}</tbody>
    </table>
    <p class="note">Platform tools are sidebar-accessible at any point without breaking phase progression.</p>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ScreenDerivation = () => {
  const navigate = useNavigate();
  const [modules,     setModules]     = useState<ScreenModule[]>(INITIAL_MODULES);
  const [projectName, setProjectName] = useState("Aether Platform");
  const [activeTab,   setActiveTab]   = useState("list");
  const [listFilter,  setListFilter]  = useState<"all" | "shared" | "exclusive">("all");

  const allScreens       = modules.flatMap(m => m.screens);
  const totalScreens     = allScreens.length;
  const sharedCount      = allScreens.filter(s => s.shared).length;
  const complexCount     = allScreens.filter(s => s.complexity === "Complex").length;
  const personasCovered  = new Set(allScreens.flatMap(s => s.personas)).size;
  const backlogRefs      = new Set(allScreens.map(s => s.backlogRef)).size;
  const journeyStages    = new Set(allScreens.map(s => s.journeyStage)).size;
  const coveragePct      = Math.round((journeyStages / 6) * 100);
  const warnCount        = allScreens.filter(s => s.warning || !s.states.includes("Error") || s.personas.length === 0).length;
  const missingErrorCount = allScreens.filter(s => !s.states.includes("Error")).length;

  const updateModule = (id: string, m: ScreenModule) =>
    setModules(prev => prev.map(mod => mod.id === id ? m : mod));

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />

        <div className="flex flex-col flex-1 overflow-hidden">

          {/* ── Header ── */}
          <header className="h-14 flex items-center border-b border-border px-6 gap-3 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
            <div className="h-4 w-px bg-border shrink-0" />
            <EditableText
              value={projectName}
              onChange={setProjectName}
              className="text-sm font-semibold text-foreground"
            />
            <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />
            <span className="text-xs font-medium text-foreground hidden sm:block">Phase 02</span>
            <span className="text-xs text-muted-foreground hidden md:block">— Screen Derivation</span>
            <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1">
              <GitBranch className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-[11px] text-muted-foreground">Derived from Personas, Flows & Backlog</span>
            </div>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => navigate("/project/phase/01/backlog")}
                className="h-8 rounded-lg text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back to Design Backlog
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1.5">
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">Screen List</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => exportToExcel(modules, projectName)} className="text-xs gap-2">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
                    Export to Excel (.csv)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">Relation Map</DropdownMenuLabel>
                  <DropdownMenuItem onClick={exportMapToPDF} className="text-xs gap-2">
                    <FileText className="h-3.5 w-3.5 text-rose-500" strokeWidth={1.5} />
                    Export to PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportMapToWord} className="text-xs gap-2">
                    <FileText className="h-3.5 w-3.5 text-blue-500" strokeWidth={1.5} />
                    Export to Word (.doc)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" onClick={() => navigate("/project/phase/03")}
                className="h-8 rounded-lg text-xs gap-1.5 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft">
                Proceed to Prototype
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </header>

          {/* ── Stage tracker ── */}
          <div className="border-b border-border/60 px-6 py-3 flex items-center justify-between flex-wrap gap-2 shrink-0">
            <StageTracker current={2} />
            {warnCount > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
                {warnCount} screen{warnCount !== 1 ? "s" : ""} need attention
              </div>
            )}
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

              {/* ── Summary Layer ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Total Screens",    value: totalScreens,    icon: Layers,    sub: `${modules.length} modules`            },
                  { label: "Personas Covered", value: personasCovered, icon: Users,     sub: `of ${PERSONAS.length} in project`     },
                  { label: "Shared",           value: sharedCount,     icon: Share2,    sub: `${totalScreens - sharedCount} exclusive` },
                  { label: "Complex",          value: complexCount,    icon: Zap,       sub: "require deep spec"                    },
                  { label: "Backlog Items",    value: backlogRefs,     icon: Link2,     sub: "linked sources"                       },
                  { label: "Flow Coverage",    value: `${coveragePct}%`, icon: GitBranch, sub: `${journeyStages} of 6 stages`       },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-background px-4 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <stat.icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-xl font-bold text-foreground tabular-nums">{stat.value}</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">{stat.label}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* System intelligence */}
              {missingErrorCount > 0 && (
                <IntelBanner
                  type="warning"
                  message={`${missingErrorCount} screen${missingErrorCount !== 1 ? "s are" : " is"} missing an Error state — expand each card and toggle the state on to address this.`}
                />
              )}

              {/* ── Workspace Tabs ── */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <TabsList className="rounded-xl bg-secondary h-9">
                    <TabsTrigger value="list"  className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-background">
                      <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Screen List
                      <span className="bg-muted rounded-full px-1.5 py-px text-[10px] font-medium">{totalScreens}</span>
                    </TabsTrigger>
                    <TabsTrigger value="map"   className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-background">
                      <GitBranch className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Relation Map
                    </TabsTrigger>
                    <TabsTrigger value="split" className="rounded-lg text-xs gap-1.5 data-[state=active]:bg-background">
                      <SplitSquareHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Shared / Exclusive
                    </TabsTrigger>
                  </TabsList>

                  {activeTab === "list" && (
                    <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
                      {(["all","shared","exclusive"] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setListFilter(f)}
                          className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors
                            ${listFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <TabsContent value="list" className="mt-4">
                  <ScreenListTab modules={modules} filter={listFilter} onUpdateModule={updateModule} />
                </TabsContent>
                <TabsContent value="map" className="mt-4">
                  <RelationMapTab />
                </TabsContent>
                <TabsContent value="split" className="mt-4">
                  <SharedExclusiveTab modules={modules} />
                </TabsContent>
              </Tabs>

            </div>
          </div>

          {/* ── Bottom CTA ── */}
          <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-6 py-4">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {totalScreens} screens across {modules.length} modules
                </p>
                <p className="text-xs text-muted-foreground">
                  {sharedCount} shared · {totalScreens - sharedCount} exclusive · {complexCount} complex · {coveragePct}% flow coverage
                </p>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 rounded-xl text-sm gap-1.5">
                      <Download className="h-4 w-4" strokeWidth={1.5} />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">Screen List</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => exportToExcel(modules, projectName)} className="text-xs gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
                      Export to Excel (.csv)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">Relation Map</DropdownMenuLabel>
                    <DropdownMenuItem onClick={exportMapToPDF} className="text-xs gap-2">
                      <FileText className="h-3.5 w-3.5 text-rose-500" strokeWidth={1.5} />
                      Export to PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportMapToWord} className="text-xs gap-2">
                      <FileText className="h-3.5 w-3.5 text-blue-500" strokeWidth={1.5} />
                      Export to Word (.doc)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => navigate("/project/phase/03")}
                  className="h-10 rounded-xl text-sm gap-1.5 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
                >
                  Confirm Screen List & Proceed to Phase 03
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </SidebarProvider>
  );
};

export default ScreenDerivation;
