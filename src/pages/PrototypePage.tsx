import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight,
  Cpu, FileText, Brain, Upload, BookOpen, Search, Layers,
  Copy, Check, RefreshCw, Download, Pencil, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Format    = "lovable" | "v0" | "generic";
type Verbosity = "detailed" | "short";

interface PromptSection {
  id:      string;
  title:   string;
  content: string;
  hint?:   string;
}

interface PersonaPrompt {
  id:           string;
  name:         string;
  role:         string;
  tag:          "Primary" | "Secondary";
  status:       "generated" | "review";
  initial:      string;
  quality:      number;
  screensCount: number;
  sections:     PromptSection[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<Format, string> = {
  lovable: "Lovable",
  v0:      "v0",
  generic: "Generic AI",
};

const FORMAT_PREFIXES: Record<Format, string> = {
  lovable: "Build this prototype using Lovable.\nStack: React + TypeScript + Tailwind CSS + shadcn/ui.",
  v0:      "Generate this UI using v0 by Vercel.\nStack: Next.js App Router + shadcn/ui + Tailwind CSS.",
  generic: "",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PROMPTS: PersonaPrompt[] = [
  {
    id:           "pm",
    name:         "Sarah Chen",
    role:         "Product Manager",
    tag:          "Primary",
    status:       "generated",
    initial:      "SC",
    quality:      94,
    screensCount: 8,
    sections: [
      {
        id:    "framing",
        title: "Persona Framing",
        content:
          "You are building for Sarah Chen, a Product Manager at a mid-size B2B SaaS company. Sarah uses this platform daily to track feature delivery, manage stakeholder expectations, and align her team around roadmap priorities. She is highly analytical, values speed, and expects the interface to reduce cognitive overhead — not add to it.",
      },
      {
        id:    "context",
        title: "Product & Domain Context",
        content:
          "Domain: B2B SaaS — Product Intelligence Platform\nProduct type: Internal workflow tool\nTone: Professional, minimal, confident\nUX quality bar: Enterprise-grade clarity. Every component must earn its place. No decorative elements.",
      },
      {
        id:    "scope",
        title: "Scope Definition",
        content:
          "Screens to include:\n• Dashboard Overview\n• Project Kanban Board\n• Feature Detail View\n• Stakeholder Report View\n• Roadmap Timeline\n• Settings & Preferences\n\nFlows covered:\n• Onboarding → Project Setup → Feature Tracking\n• Report Generation → Stakeholder Export\n\nExclude: Auth flows, billing, user management, admin panels.",
      },
      {
        id:    "interactions",
        title: "Key Interactions",
        content:
          "Navigation: Persistent sidebar with breadcrumb trails in nested views.\nForm actions: Inline editing for feature fields; modal dialog for project creation.\nState transitions: Optimistic UI on board drag-and-drop; skeleton loaders on data fetch.\nModal flows: Confirm-before-delete for features; slideout panel for feature detail view.",
      },
      {
        id:    "ui",
        title: "UI Direction",
        content:
          "Layout: Dashboard-style with toggleable content density.\nDensity: Compact default with expandable rows.\nComponents: Sortable data tables, Kanban boards, progress rings, inline status badges.\nTypography: Clean sans-serif, strong visual hierarchy, 13–14px body text.",
      },
      {
        id:    "constraints",
        title: "Constraints",
        content:
          "Do not generate auth screens, payment flows, or admin panels. Avoid gratuitous animations — transitions only where they communicate state change. No placeholder illustrations. Favour composition over variety in component selection. Keep the colour palette to 3–4 neutrals with one accent.",
      },
    ],
  },
  {
    id:           "admin",
    name:         "Marcus Webb",
    role:         "Enterprise Admin",
    tag:          "Secondary",
    status:       "generated",
    initial:      "MW",
    quality:      89,
    screensCount: 6,
    sections: [
      {
        id:    "framing",
        title: "Persona Framing",
        content:
          "You are building for Marcus Webb, an Enterprise Admin responsible for configuring the platform across departments, managing user permissions, and ensuring compliance with organisational data policies. Marcus needs full control, clear audit trails, and zero ambiguity in every action he takes.",
      },
      {
        id:    "context",
        title: "Product & Domain Context",
        content:
          "Domain: Enterprise SaaS — Admin & Governance Layer\nProduct type: Back-office configuration tool\nTone: Authoritative, structured, functional\nUX quality bar: Zero ambiguity. Destructive actions require confirmation. Every setting must carry a clear scope label.",
      },
      {
        id:    "scope",
        title: "Scope Definition",
        content:
          "Screens to include:\n• User Management Table\n• Role & Permission Matrix\n• Audit Log Viewer\n• Organisation Settings\n• Integration Hub\n• Data Export Centre\n\nFlows covered:\n• User Provisioning → Role Assignment\n• Integration Setup → Webhook Configuration\n\nExclude: End-user product flows, onboarding journeys, marketing screens.",
      },
      {
        id:    "interactions",
        title: "Key Interactions",
        content:
          "Navigation: Top nav for module switching; sidebar for sub-pages within each module.\nForm actions: Bulk selection with inline actions; confirmation modals for destructive operations.\nState transitions: Clear loading states on async operations; inline success/error banners.\nModal flows: Slideout panel for user detail; full-page modal for permission matrix editing.",
      },
      {
        id:    "ui",
        title: "UI Direction",
        content:
          "Layout: Dense table-first layout with expandable row details.\nDensity: High — this is a power-user tool, every pixel counts.\nComponents: Sortable filterable tables, role badge matrix, toggle switches, status chips.\nTypography: System font stack, tight line-height, strong weight contrast between labels and values.",
      },
      {
        id:    "constraints",
        title: "Constraints",
        content:
          "No decorative elements. No illustrations. No marketing copy. Avoid card-based layouts — tables are the correct pattern for this persona. All destructive actions must include a confirmation step. Maintain clear visual separation between read-only data and editable fields.",
      },
    ],
  },
  {
    id:           "support",
    name:         "Priya Nair",
    role:         "Support Agent",
    tag:          "Secondary",
    status:       "review",
    initial:      "PN",
    quality:      67,
    screensCount: 5,
    sections: [
      {
        id:    "framing",
        title: "Persona Framing",
        content:
          "You are building for Priya Nair, a Support Agent who handles incoming customer queries, escalates issues to the product team, and documents resolutions in the platform. Priya works under time pressure and needs to surface information quickly without deep navigation.",
      },
      {
        id:    "context",
        title: "Product & Domain Context",
        content:
          "Domain: B2B SaaS — Support & Resolution Workflow\nProduct type: Case management interface\nTone: Efficient, helpful, low-friction\nUX quality bar: Speed is everything. Reduce clicks to zero where possible. No unnecessary chrome.",
      },
      {
        id:    "scope",
        title: "Scope Definition",
        content:
          "Screens to include:\n• Ticket Queue View\n• Ticket Detail & Resolution\n• Knowledge Base Search\n• Escalation Flow\n• Activity Log\n\nFlows covered:\n• Ticket Triage → Resolution → Documentation\n\nExclude: Admin settings, user management, billing, reporting.",
      },
      {
        id:    "interactions",
        title: "Key Interactions",
        content:
          "Navigation: Flat — no deep nesting. Global search accessible from any screen.\nForm actions: Quick-reply templates with one-click insert; drag to reassign tickets.\nState transitions: Real-time status updates; toast notifications for assignment changes.\nModal flows: Escalation confirmation dialog; knowledge base in a side drawer.",
      },
      {
        id:    "ui",
        title: "UI Direction",
        content:
          "Layout: Split view — ticket list on left, detail panel on right.\nDensity: Medium — breathing room reduces errors under pressure.\nComponents: Ticket cards with priority flags, inline tags, status pills, expandable activity log.\nTypography: Readable body size (14px), clear priority colour coding with semantic colours.",
      },
      {
        id:      "constraints",
        title:   "Constraints",
        content: "",
        hint:    "No constraints defined — add exclusions and scope limits to sharpen this prompt.",
      },
    ],
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function buildPromptString(persona: PersonaPrompt, format: Format, verbosity: Verbosity): string {
  const prefix = FORMAT_PREFIXES[format] ? FORMAT_PREFIXES[format] + "\n\n" : "";
  const body = persona.sections
    .filter(s => s.content.trim())
    .map(s => {
      const content = verbosity === "short" ? s.content.split("\n")[0] : s.content;
      return `## ${s.title.toUpperCase()}\n${content}`;
    })
    .join("\n\n");
  return prefix + body;
}

function exportAsTxt(persona: PersonaPrompt, format: Format, verbosity: Verbosity) {
  const text = buildPromptString(persona, format, verbosity);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Aether_Prompt_${persona.name.replace(/\s+/g, "_")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsMd(persona: PersonaPrompt, format: Format, verbosity: Verbosity) {
  const prefix   = FORMAT_PREFIXES[format] ? `${FORMAT_PREFIXES[format]}\n\n` : "";
  const sections = persona.sections
    .filter(s => s.content.trim())
    .map(s => {
      const content = verbosity === "short" ? s.content.split("\n")[0] : s.content;
      return `## ${s.title}\n\n${content}`;
    })
    .join("\n\n---\n\n");
  const md   = `# Prototype Prompt — ${persona.name}\n_Generated by Aether · ${FORMAT_LABELS[format]} format_\n\n${prefix}${sections}`;
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `Aether_Prompt_${persona.name.replace(/\s+/g, "_")}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function qualityColor(score: number) {
  if (score >= 90) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
  if (score >= 70) return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
  return "text-rose-600 bg-rose-50 dark:bg-rose-950/30";
}

// ─── Stage Tracker ────────────────────────────────────────────────────────────

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
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                  active && "bg-foreground text-background",
                  done   && "text-muted-foreground hover:text-foreground cursor-pointer",
                  locked && "text-muted-foreground/40 cursor-not-allowed",
                )}>
                  <s.icon className="h-3 w-3" strokeWidth={1.5} />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">{s.label}</TooltipContent>
            </Tooltip>
            {i < stages.length - 1 && (
              <div className={cn("w-4 h-px mx-0.5", i < current ? "bg-foreground/30" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section Block ────────────────────────────────────────────────────────────

interface SectionBlockProps {
  section:      PromptSection;
  verbosity:    Verbosity;
  isEditing:    boolean;
  isLast:       boolean;
  onStartEdit:  () => void;
  onEndEdit:    () => void;
  onChange:     (content: string) => void;
}

function SectionBlock({ section, verbosity, isEditing, isLast, onStartEdit, onEndEdit, onChange }: SectionBlockProps) {
  const displayContent = verbosity === "short"
    ? section.content.split("\n")[0]
    : section.content;

  return (
    <div className={cn(
      "group px-6 py-5 transition-colors hover:bg-secondary/30",
      !isLast && "border-b border-border/40",
    )}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {section.title}
        </span>
        {!isEditing && (
          <button
            onClick={onStartEdit}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-all rounded-md px-1.5 py-0.5 hover:bg-secondary"
          >
            <Pencil className="h-2.5 w-2.5" strokeWidth={1.5} />
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <textarea
          value={section.content}
          onChange={e => onChange(e.target.value)}
          onBlur={onEndEdit}
          autoFocus
          className="w-full text-sm font-mono text-foreground bg-background/60 border border-border/60 rounded-xl px-4 py-3 resize-none outline-none focus:border-foreground/30 transition-colors leading-relaxed"
          rows={Math.max(3, section.content.split("\n").length + 1)}
        />
      ) : (
        <p
          onClick={onStartEdit}
          className={cn(
            "text-sm font-mono leading-relaxed whitespace-pre-wrap cursor-text transition-colors",
            displayContent
              ? "text-foreground/80 hover:text-foreground"
              : "text-muted-foreground/40 italic",
          )}
        >
          {displayContent || "Click to add content…"}
        </p>
      )}

      {section.hint && !isEditing && (
        <div className="mt-3 flex items-start gap-2 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2 border border-amber-200/60 dark:border-amber-800/30">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" strokeWidth={1.5} />
          {section.hint}
        </div>
      )}
    </div>
  );
}

// ─── Export Dropdown (reused in header + bottom bar) ─────────────────────────

interface ExportMenuProps {
  persona:   PersonaPrompt;
  format:    Format;
  verbosity: Verbosity;
  onCopy:    () => void;
  size?:     "sm" | "default";
}

function ExportMenu({ persona, format, verbosity, onCopy, size = "default" }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size === "sm" ? "sm" : "default"}
          className={cn(
            "gap-1.5",
            size === "sm" ? "h-8 rounded-lg text-xs" : "h-10 rounded-xl text-sm",
          )}
        >
          <Download className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} strokeWidth={1.5} />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
          {persona.name}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={onCopy} className="text-xs gap-2">
          <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
          Copy Prompt
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => exportAsTxt(persona, format, verbosity)} className="text-xs gap-2">
          <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
          Export as .txt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAsMd(persona, format, verbosity)} className="text-xs gap-2">
          <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
          Export as .md
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PrototypePage = () => {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();

  const [selectedId,     setSelectedId]     = useState<string>("pm");
  const [format,         setFormat]         = useState<Format>("lovable");
  const [verbosity,      setVerbosity]      = useState<Verbosity>("detailed");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [promptData,     setPromptData]     = useState<PersonaPrompt[]>(MOCK_PROMPTS);
  const [copied,         setCopied]         = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const current        = promptData.find(p => p.id === selectedId)!;
  const totalScreens   = promptData.reduce((a, p) => a + p.screensCount, 0);
  const generatedCount = promptData.filter(p => p.status === "generated").length;

  const handleCopy = () => {
    navigator.clipboard.writeText(buildPromptString(current, format, verbosity));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    setEditingSection(null);
    setTimeout(() => setIsRegenerating(false), 1500);
  };

  const handleSelectPersona = (id: string) => {
    setSelectedId(id);
    setEditingSection(null);
  };

  const updateSection = (sectionId: string, content: string) => {
    setPromptData(prev => prev.map(p =>
      p.id === selectedId
        ? { ...p, sections: p.sections.map(s => s.id === sectionId ? { ...s, content } : s) }
        : p,
    ));
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* ── Header ── */}
          <header className="h-14 flex items-center border-b border-border px-6 gap-3 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
            <div className="h-4 w-px bg-border shrink-0" />
            <span className="text-sm font-semibold text-foreground">Aether Platform</span>
            <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />
            <span className="text-xs font-medium text-foreground hidden sm:block">Phase 03</span>
            <span className="text-xs text-muted-foreground hidden md:block">— Prototype Prompts</span>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => navigate(projectId ? `/project/${projectId}/phase/02` : "/dashboard")}
                className="h-8 rounded-lg text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back to Screen Derivation
              </Button>

              <ExportMenu persona={current} format={format} verbosity={verbosity} onCopy={handleCopy} size="sm" />

              <Button size="sm" onClick={async () => { if (projectId) { await supabase.from("projects").update({ current_phase: 6, updated_at: new Date().toISOString() }).eq("id", projectId); } navigate(projectId ? `/project/${projectId}/phase/04` : "/dashboard"); }}
                className="h-8 rounded-lg text-xs gap-1.5 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft">
                Proceed to UX Audit
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </header>

          {/* ── Stage Tracker + Stats ── */}
          <div className="border-b border-border/60 px-6 py-3 space-y-3 shrink-0">
            <StageTracker current={3} />
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-foreground">{promptData.length}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Personas</span>
              </div>
              <div className="h-3 w-px bg-border/60" />
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-foreground">{generatedCount}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Prompts Generated</span>
              </div>
              <div className="h-3 w-px bg-border/60" />
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-foreground">{totalScreens}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Screens Covered</span>
              </div>
              <div className="h-3 w-px bg-border/60" />
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-foreground">87%</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Flow Coverage</span>
              </div>
            </div>
          </div>

          {/* ── Main Split Layout ── */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── Left: Persona Selector ── */}
            <div className="w-64 shrink-0 border-r border-border/60 overflow-y-auto py-4 px-3 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-2">
                Personas
              </p>
              {promptData.map(persona => (
                <button
                  key={persona.id}
                  onClick={() => handleSelectPersona(persona.id)}
                  className={cn(
                    "w-full text-left rounded-xl px-3 py-3 transition-all border",
                    selectedId === persona.id
                      ? "bg-background border-border shadow-sm"
                      : "border-transparent hover:bg-secondary/60",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0",
                      selectedId === persona.id
                        ? "bg-foreground text-background"
                        : "bg-secondary text-foreground",
                    )}>
                      {persona.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-foreground truncate">{persona.name}</span>
                        <span className={cn(
                          "text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
                          persona.tag === "Primary"
                            ? "bg-foreground/10 text-foreground"
                            : "bg-secondary text-muted-foreground",
                        )}>
                          {persona.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{persona.role}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={cn(
                          "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                          persona.status === "generated"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
                        )}>
                          {persona.status === "generated" ? "Generated" : "Needs Review"}
                        </span>
                        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", qualityColor(persona.quality))}>
                          {persona.quality}%
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* ── Right: Prompt Workspace ── */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Toolbar */}
              <div className="shrink-0 border-b border-border/60 px-6 py-3 flex items-center gap-3 flex-wrap bg-background/50">
                {/* Format toggle */}
                <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
                  {(["lovable", "v0", "generic"] as Format[]).map(f => (
                    <button key={f} onClick={() => setFormat(f)}
                      className={cn(
                        "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                        format === f
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}>
                      {FORMAT_LABELS[f]}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-px bg-border/60" />

                {/* Verbosity toggle */}
                <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
                  {(["detailed", "short"] as Verbosity[]).map(v => (
                    <button key={v} onClick={() => setVerbosity(v)}
                      className={cn(
                        "rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors",
                        verbosity === v
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}>
                      {v}
                    </button>
                  ))}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="h-8 rounded-lg text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                    <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")} strokeWidth={1.5} />
                    {isRegenerating ? "Regenerating…" : "Regenerate"}
                  </Button>

                  <Button size="sm" onClick={handleCopy}
                    className={cn(
                      "h-8 rounded-lg text-xs gap-1.5 transition-all",
                      copied
                        ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                        : "gradient-accent text-accent-foreground hover:brightness-110 shadow-soft",
                    )}>
                    {copied
                      ? <Check    className="h-3.5 w-3.5" strokeWidth={2}   />
                      : <Copy     className="h-3.5 w-3.5" strokeWidth={1.5} />
                    }
                    {copied ? "Copied!" : "Copy Prompt"}
                  </Button>
                </div>
              </div>

              {/* Prompt Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 py-6">
                  <AnimatePresence mode="wait">

                    {isRegenerating ? (
                      <motion.div key="loading"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
                        <RefreshCw className="h-8 w-8 animate-spin" strokeWidth={1} />
                        <p className="text-sm">Regenerating prompt for {current.name}…</p>
                      </motion.div>
                    ) : (
                      <motion.div key={selectedId + format + verbosity}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

                        {/* Prompt meta header */}
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h2 className="text-base font-semibold text-foreground">{current.name}</h2>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">{current.role}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {current.screensCount} screens · {FORMAT_LABELS[format]} format · {verbosity}
                            </p>
                          </div>
                          <span className={cn("text-[10px] font-semibold px-2 py-1 rounded-full shrink-0", qualityColor(current.quality))}>
                            Quality {current.quality}%
                          </span>
                        </div>

                        {/* Format preamble */}
                        {FORMAT_PREFIXES[format] && (
                          <div className="mb-4 px-4 py-3 rounded-xl bg-accent/8 border border-accent/20">
                            <p className="text-[11px] font-mono text-accent whitespace-pre-wrap leading-relaxed">
                              {FORMAT_PREFIXES[format]}
                            </p>
                          </div>
                        )}

                        {/* Sections block */}
                        <div className="rounded-2xl border border-border/60 overflow-hidden bg-secondary/20">
                          {current.sections.map((section, idx) => (
                            <SectionBlock
                              key={section.id}
                              section={section}
                              verbosity={verbosity}
                              isEditing={editingSection === section.id}
                              isLast={idx === current.sections.length - 1}
                              onStartEdit={() => setEditingSection(section.id)}
                              onEndEdit={() => setEditingSection(null)}
                              onChange={content => updateSection(section.id, content)}
                            />
                          ))}
                        </div>

                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>

          {/* ── Bottom CTA ── */}
          <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-6 py-4">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {generatedCount} of {promptData.length} prompts ready
                </p>
                <p className="text-xs text-muted-foreground">
                  {totalScreens} screens · {promptData.length} personas · {FORMAT_LABELS[format]} format
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportMenu persona={current} format={format} verbosity={verbosity} onCopy={handleCopy} />
                <Button
                  onClick={async () => { if (projectId) { await supabase.from("projects").update({ current_phase: 6, updated_at: new Date().toISOString() }).eq("id", projectId); } navigate(projectId ? `/project/${projectId}/phase/04` : "/dashboard"); }}
                  className="h-10 rounded-xl text-sm gap-1.5 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
                >
                  Proceed to UX Audit
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

export default PrototypePage;
