import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronRight,
  Cpu, FileText, Brain, Upload, BookOpen, Search, Layers,
  Download, MousePointer, Zap, AlertCircle, Shield,
  X, Link2, AlertTriangle, CheckCircle2,
  FileSpreadsheet, FolderOpen, Sparkles, GitBranch,
  Users, Monitor, BarChart3, Image as ImageIcon,
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

type AuditPhase  = "setup" | "running" | "results";
type Mode        = "project" | "standalone";
type InputTab    = "upload" | "link";
type Severity    = "High" | "Medium" | "Low";
type IssueType   = "usability" | "cognitive" | "interaction" | "emotional" | "system";
type SevFilter   = "all" | "high" | "medium" | "low";
type TypeFilter  = "all" | IssueType;

interface AuditIssue {
  id:             string;
  title:          string;
  description:    string;
  severity:       Severity;
  recommendation: string;
}

interface IssueCategory {
  type:   IssueType;
  issues: AuditIssue[];
}

interface ScreenAudit {
  id:         string;
  name:       string;
  score:      number;
  persona:    string;
  categories: IssueCategory[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ISSUE_TYPE_CONFIG: Record<IssueType, {
  label: string;
  Icon:  React.ElementType;
  dot:   string;
  bar:   string;
  faint: string;
}> = {
  usability:   { label: "Usability Issues",  Icon: MousePointer, dot: "bg-rose-400",   bar: "border-l-rose-400",   faint: "bg-rose-50 dark:bg-rose-950/20"   },
  cognitive:   { label: "Cognitive Load",    Icon: Brain,        dot: "bg-amber-400",  bar: "border-l-amber-400",  faint: "bg-amber-50 dark:bg-amber-950/20" },
  interaction: { label: "Interaction",       Icon: Zap,          dot: "bg-blue-400",   bar: "border-l-blue-400",   faint: "bg-blue-50 dark:bg-blue-950/20"   },
  emotional:   { label: "Emotional & Trust", Icon: Shield,       dot: "bg-violet-400", bar: "border-l-violet-400", faint: "bg-violet-50 dark:bg-violet-950/20"},
  system:      { label: "System Gaps",       Icon: AlertCircle,  dot: "bg-slate-400",  bar: "border-l-slate-400",  faint: "bg-slate-50 dark:bg-slate-800/40" },
};

const SEVERITY_CONFIG: Record<Severity, { dot: string; badge: string }> = {
  High:   { dot: "bg-rose-500",  badge: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800"      },
  Medium: { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
  Low:    { dot: "bg-blue-400",  badge: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"        },
};

const MOCK_PROJECTS = [
  { id: "p1", name: "Design System Redesign",  personas: 4, screens: 19, phase: "Phase 03 Complete" },
  { id: "p2", name: "E-Commerce Platform v2",  personas: 3, screens: 14, phase: "Phase 02 Complete" },
  { id: "p3", name: "Mobile Banking App",      personas: 5, screens: 22, phase: "Phase 01 Complete" },
];

const MOCK_AUDIT: ScreenAudit[] = [
  {
    id: "s1", name: "Dashboard Overview", score: 74, persona: "Sarah Chen",
    categories: [
      { type: "usability", issues: [
        { id: "u1", severity: "High",   title: "Primary CTA buried below fold",          description: "The main action button requires scrolling to reach, violating the first-screen rule.",                    recommendation: "Elevate the primary CTA to the top third of the viewport — visible without any scrolling."                    },
        { id: "u2", severity: "Medium", title: "Navigation hierarchy unclear",            description: "Sidebar items carry equal visual weight regardless of access frequency.",                                    recommendation: "Apply visual hierarchy: primary destinations bold and prominent, secondary items at reduced weight."          },
      ]},
      { type: "cognitive", issues: [
        { id: "c1", severity: "High",   title: "12 data points visible simultaneously",  description: "The dashboard exposes all metrics at once, creating a scanning burden and reducing comprehension.",          recommendation: "Apply progressive disclosure — surface 4–6 key metrics first, expand remaining on demand."                   },
        { id: "c2", severity: "Medium", title: "No visual grouping of related metrics",  description: "Data clusters are not spatially grouped, forcing the user to mentally organise them.",                        recommendation: "Use subtle dividers or whitespace to group related KPIs into logical clusters."                             },
      ]},
      { type: "interaction", issues: [
        { id: "i1", severity: "Medium", title: "Interactive cards have no hover state",  description: "Cards that trigger navigation show no visual affordance — unclear affordance for new users.",                 recommendation: "Add consistent hover state: border highlight, background tint, and cursor change on all clickable cards."    },
      ]},
      { type: "emotional", issues: [
        { id: "e1", severity: "High",   title: "No onboarding guidance for first session", description: "Users arriving to an empty dashboard receive no direction, creating abandonment risk.",                     recommendation: "Add a contextual welcome banner with 2–3 quick-start actions, visible only on first session."              },
      ]},
      { type: "system", issues: [
        { id: "sy1", severity: "High",   title: "Loading state undefined",              description: "Data-loaded sections have no skeleton screen, causing perceived freeze on slow connections.",                   recommendation: "Design and implement skeleton screens for all async content sections."                                    },
        { id: "sy2", severity: "Medium", title: "Empty state not designed",             description: "When no data exists, sections render blank with no guidance or call to action.",                                recommendation: "Design per-section empty states with a clear label and an actionable CTA."                                 },
      ]},
    ],
  },
  {
    id: "s2", name: "Feature Creation Flow", score: 58, persona: "Alex Rivera",
    categories: [
      { type: "usability", issues: [
        { id: "u3", severity: "High",   title: "Form field labels are ambiguous",        description: "Labels like 'Name' and 'Type' are insufficient — users don't know what input is expected.",                  recommendation: "Rewrite with plain language and inline examples: 'Feature name (e.g. User Login)'."                        },
        { id: "u4", severity: "High",   title: "No step progress indicator",             description: "A 4-step form shows no indication of current position or remaining steps.",                                    recommendation: "Add a step indicator at the top of the form: 'Step 2 of 4' with a visual progress bar."                  },
        { id: "u5", severity: "High",   title: "Errors shown only on submit",            description: "Inline validation is absent — errors appear only after the user attempts full submission.",                    recommendation: "Implement real-time inline validation — show field errors as the user leaves each field."                   },
      ]},
      { type: "cognitive", issues: [
        { id: "c3", severity: "High",   title: "All 11 fields shown in one view",        description: "A single-screen form with 11 fields imposes maximum cognitive load from the first interaction.",              recommendation: "Restructure into 3–4 logical steps with 3–4 fields each using a clear wizard pattern."                    },
        { id: "c4", severity: "Medium", title: "Required vs optional indistinguishable", description: "No visual differentiation exists between mandatory and optional fields.",                                       recommendation: "Mark required fields with asterisk; group optional fields in a collapsible secondary section."              },
      ]},
      { type: "interaction", issues: [
        { id: "i2", severity: "High",   title: "CTA label is vague ('Submit')",          description: "'Submit' does not communicate what will happen — users are uncertain of the action's consequence.",           recommendation: "Replace with specific action label: 'Create Feature' or 'Save & Continue'."                                },
        { id: "i3", severity: "Medium", title: "No keyboard navigation support",         description: "Tab order is inconsistent; some elements are unreachable via keyboard.",                                       recommendation: "Audit and correct tab order; ensure all form elements and CTAs are keyboard-accessible."                    },
      ]},
      { type: "emotional", issues: [
        { id: "e2", severity: "High",   title: "No success feedback after submission",   description: "Form submits without a visible success state, leaving users uncertain whether their action registered.",       recommendation: "Add a dedicated success screen: confirmation + summary of what was created + clear next steps."            },
        { id: "e3", severity: "Medium", title: "Discard action too easy to trigger",     description: "'Cancel' sits adjacent to 'Submit' with equal visual weight, risking accidental loss of work.",               recommendation: "Add confirmation dialog before discarding: 'Discard changes? This cannot be undone.'"                      },
      ]},
      { type: "system", issues: [
        { id: "sy3", severity: "High",   title: "No autosave mechanism indicated",       description: "Long-form creation has no autosave, exposing users to data loss on refresh or timeout.",                      recommendation: "Implement autosave with visible status indicator: 'Draft saved 2 minutes ago' in the form header."         },
        { id: "sy4", severity: "Medium", title: "Session timeout not handled",           description: "No handling for session expiry mid-form — data is silently lost.",                                             recommendation: "Detect and warn users of imminent timeout; preserve form data in localStorage as fallback."               },
      ]},
    ],
  },
  {
    id: "s3", name: "Settings Page", score: 82, persona: "Jordan Patel",
    categories: [
      { type: "usability", issues: [
        { id: "u6", severity: "Low",    title: "Settings categories need clearer grouping", description: "Unrelated settings are listed together, requiring users to scan a long undifferentiated list.",           recommendation: "Use labelled sections with visual dividers: Account, Notifications, Security, Billing."                   },
      ]},
      { type: "cognitive", issues: [
        { id: "c5", severity: "Medium", title: "Toggle labels describe state, not action",  description: "'Notifications: On/Off' describes the current state rather than the action's outcome.",                   recommendation: "Rewrite to describe outcome: 'Receive email notifications when a feature is updated'."                    },
      ]},
      { type: "interaction", issues: [
        { id: "i4", severity: "High",   title: "No confirmation on critical changes",       description: "Account-level settings take immediate effect with no confirmation — risk of accidental destructive action.", recommendation: "Add a confirmation modal for changes that affect billing, permissions, or data visibility."              },
        { id: "i5", severity: "Low",    title: "Save button placement inconsistent",        description: "Some sections auto-save; others require explicit save — inconsistent mental model.",                       recommendation: "Standardise: all sections either auto-save with visible status, or all require explicit save action."      },
      ]},
      { type: "emotional", issues: [] },
      { type: "system", issues: [
        { id: "sy5", severity: "Medium", title: "Reload-required settings not flagged",     description: "Some settings require a page reload to take effect, with no indication of this to the user.",             recommendation: "Add an inline badge on settings that require reload: '⚠ Requires reload to apply'."                       },
      ]},
    ],
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
  if (score >= 65) return "text-amber-600 bg-amber-50 dark:bg-amber-950/30";
  return "text-rose-600 bg-rose-50 dark:bg-rose-950/30";
}

function getAllIssues(screens: ScreenAudit[]) {
  return screens.flatMap(s => s.categories.flatMap(c => c.issues));
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportFullExcel(screens: ScreenAudit[]) {
  const header = ["Screen","Persona","Category","Severity","Issue","Description","Recommendation"];
  const rows   = screens.flatMap(s =>
    s.categories.flatMap(c =>
      c.issues.map(i => [s.name, s.persona, ISSUE_TYPE_CONFIG[c.type].label, i.severity, i.title, i.description, i.recommendation])
    )
  );
  const csv = "\uFEFF" + [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  downloadBlob(csv, "Aether_UX_Audit_Full.csv", "text/csv;charset=utf-8;");
}

function exportScreenExcel(screen: ScreenAudit) {
  const header = ["Category","Severity","Issue","Description","Recommendation"];
  const rows   = screen.categories.flatMap(c =>
    c.issues.map(i => [ISSUE_TYPE_CONFIG[c.type].label, i.severity, i.title, i.description, i.recommendation])
  );
  const csv = "\uFEFF" + [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  downloadBlob(csv, `Aether_Audit_${screen.name.replace(/\s+/g,"_")}.csv`, "text/csv;charset=utf-8;");
}

function exportSummaryPDF(screens: ScreenAudit[]) {
  const allIssues = getAllIssues(screens);
  const highCount = allIssues.filter(i => i.severity === "High").length;
  const avgScore  = Math.round(screens.reduce((a,s) => a + s.score, 0) / screens.length);

  const rows = screens.flatMap(s =>
    s.categories.flatMap(c =>
      c.issues.filter(i => i.severity === "High").map(i =>
        `<tr><td>${s.name}</td><td>${ISSUE_TYPE_CONFIG[c.type].label}</td><td style="color:#e11d48;font-weight:600">High</td><td>${i.title}</td><td>${i.recommendation}</td></tr>`
      )
    )
  ).join("");

  const win = window.open("","_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Aether UX Audit Summary</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Segoe UI,sans-serif;padding:40px;color:#111;font-size:12px}
  h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;margin:24px 0 12px;color:#374151}
  .sub{color:#6b7280;font-size:12px;margin-bottom:24px}.stats{display:flex;gap:24px;margin-bottom:24px}
  .stat{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px 20px}
  .stat-val{font-size:24px;font-weight:700;color:#111}.stat-lbl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em}
  table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 12px;background:#f9fafb;border-bottom:2px solid #e5e7eb;font-size:11px;text-transform:uppercase;color:#6b7280}
  td{padding:9px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;font-size:12px}@media print{body{padding:20px}}</style>
  </head><body>
  <h1>UX Audit Summary</h1><p class="sub">Generated by Aether · ${screens.length} screens audited</p>
  <div class="stats">
    <div class="stat"><div class="stat-val">${allIssues.length}</div><div class="stat-lbl">Total Issues</div></div>
    <div class="stat"><div class="stat-val" style="color:#e11d48">${highCount}</div><div class="stat-lbl">High Severity</div></div>
    <div class="stat"><div class="stat-val">${screens.length}</div><div class="stat-lbl">Screens Audited</div></div>
    <div class="stat"><div class="stat-val">${avgScore}</div><div class="stat-lbl">Avg UX Score</div></div>
  </div>
  <h2>Critical Issues (High Severity)</h2>
  <table><thead><tr><th>Screen</th><th>Category</th><th>Severity</th><th>Issue</th><th>Recommendation</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 300);
}

function exportAuditJson(screens: ScreenAudit[]) {
  const data = { version: "1.0", generated: new Date().toISOString(), screens };
  downloadBlob(JSON.stringify(data, null, 2), "Aether_UX_Audit.json", "application/json");
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
        const done = i < current; const active = i === current; const locked = i > current;
        return (
          <div key={s.label} className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
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

// ─── Issue Item ───────────────────────────────────────────────────────────────

function IssueItem({ issue }: { issue: AuditIssue }) {
  const sev = SEVERITY_CONFIG[issue.severity];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/30 last:border-0">
      <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", sev.dot)} />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground leading-snug">{issue.title}</span>
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0", sev.badge)}>
            {issue.severity}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{issue.description}</p>
        <div className="flex items-start gap-1.5 text-xs text-foreground/70 bg-background rounded-lg px-3 py-2 border border-border/50">
          <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          {issue.recommendation}
        </div>
      </div>
    </div>
  );
}

// ─── Issue Category Block ─────────────────────────────────────────────────────

function IssueCategoryBlock({
  category, sevFilter, typeFilter,
}: {
  category:  IssueCategory;
  sevFilter:  SevFilter;
  typeFilter: TypeFilter;
}) {
  const [open, setOpen] = useState(true);
  const cfg  = ISSUE_TYPE_CONFIG[category.type];

  const visible = category.issues.filter(i =>
    (sevFilter === "all"  || i.severity.toLowerCase() === sevFilter) &&
    (typeFilter === "all" || category.type === typeFilter)
  );

  if (typeFilter !== "all" && category.type !== typeFilter) return null;
  if (sevFilter  !== "all" && visible.length === 0)         return null;

  const highCount   = visible.filter(i => i.severity === "High").length;
  const mediumCount = visible.filter(i => i.severity === "Medium").length;

  return (
    <div className={cn("border-b border-border/40 last:border-0")}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/30 transition-colors"
      >
        <div className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
        <cfg.Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
        <span className="text-xs font-semibold text-foreground flex-1 text-left">{cfg.label}</span>
        <div className="flex items-center gap-1.5">
          {highCount > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800">
              {highCount} High
            </span>
          )}
          {mediumCount > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
              {mediumCount} Med
            </span>
          )}
          {visible.length === 0 && (
            <span className="text-[10px] text-muted-foreground/60">No issues</span>
          )}
          {open
            ? <ChevronDown  className="h-3.5 w-3.5 text-muted-foreground ml-1" strokeWidth={1.5} />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-1" strokeWidth={1.5} />
          }
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-1">
              {visible.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/60 py-3 italic">
                  No {sevFilter} issues in this category.
                </p>
              ) : (
                visible.map(issue => <IssueItem key={issue.id} issue={issue} />)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Screen Audit Card ────────────────────────────────────────────────────────

function ScreenAuditCard({
  screen, sevFilter, typeFilter,
}: {
  screen:     ScreenAudit;
  sevFilter:  SevFilter;
  typeFilter: TypeFilter;
}) {
  const allIssues  = screen.categories.flatMap(c => c.issues);
  const visible    = allIssues.filter(i =>
    (sevFilter === "all" || i.severity.toLowerCase() === sevFilter) &&
    (typeFilter === "all" || screen.categories.find(c => c.type === typeFilter)?.issues.includes(i))
  );

  if (sevFilter !== "all" && visible.length === 0) return null;

  const totalCount = allIssues.length;
  const highCount  = allIssues.filter(i => i.severity === "High").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl border border-border/60 bg-background overflow-hidden"
    >
      {/* Card header */}
      <div className="px-5 py-4 border-b border-border/40 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground">{screen.name}</h3>
            <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
              {screen.persona}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalCount} issues found · {highCount} high severity
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("text-sm font-bold px-3 py-1 rounded-xl cursor-default", scoreColor(screen.score))}>
                {screen.score}/100
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">UX Score</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 rounded-lg text-[11px] gap-1 px-2.5">
                <Download className="h-3 w-3" strokeWidth={1.5} />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => exportScreenExcel(screen)} className="text-xs gap-2">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Screen preview placeholder */}
      <div className="px-5 py-4 border-b border-border/40">
        <div className="aspect-video rounded-xl bg-secondary/40 border border-border/30 flex flex-col items-center justify-center gap-2">
          <Monitor className="h-8 w-8 text-muted-foreground/30" strokeWidth={1} />
          <span className="text-xs text-muted-foreground/60">{screen.name}</span>
        </div>
      </div>

      {/* Issue categories */}
      <div>
        {screen.categories.map(cat => (
          <IssueCategoryBlock
            key={cat.type}
            category={cat}
            sevFilter={sevFilter}
            typeFilter={typeFilter}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({
  files, onFiles,
}: {
  files:   File[];
  onFiles: (files: File[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    onFiles([...files, ...dropped]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onFiles([...files, ...Array.from(e.target.files)]);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-2xl border-2 border-dashed px-8 py-10 flex flex-col items-center gap-3 cursor-pointer transition-all",
          isDragging
            ? "border-foreground/40 bg-secondary/60"
            : "border-border/60 hover:border-border hover:bg-secondary/20",
        )}
      >
        <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
          <ImageIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "Drop screens here" : "Drop screens here, or click to upload"}
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG, WebP, PDF supported · Multiple files allowed</p>
        </div>
        <input ref={inputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleChange} />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2">
              <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] text-foreground font-medium truncate flex-1">{file.name}</span>
              <button onClick={e => { e.stopPropagation(); onFiles(files.filter((_, j) => j !== i)); }}
                className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const UXAudit = () => {
  const navigate = useNavigate();
  const { id: routeProjectId } = useParams<{ id: string }>();

  // Mode & setup
  const [mode,        setMode]        = useState<Mode>("project");
  const [projectId,   setProjectId]   = useState<string>("p1");
  const [standName,   setStandName]   = useState("");
  const [standDesc,   setStandDesc]   = useState("");
  const [standIndustry, setStandIndustry] = useState("");
  const [standType,   setStandType]   = useState("");

  // Input
  const [inputTab,    setInputTab]    = useState<InputTab>("upload");
  const [files,       setFiles]       = useState<File[]>([]);
  const [linkValue,   setLinkValue]   = useState("");

  // Audit state
  const [auditPhase,  setAuditPhase]  = useState<AuditPhase>("setup");
  const [sevFilter,   setSevFilter]   = useState<SevFilter>("all");
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>("all");

  const selectedProject = MOCK_PROJECTS.find(p => p.id === projectId)!;

  const isLinkValid = linkValue.startsWith("http://") || linkValue.startsWith("https://");
  const hasInput    = files.length > 0 || isLinkValid;
  const canRun      = hasInput && (
    mode === "project"
      ? !!projectId
      : standName.trim().length > 0 && standDesc.trim().length > 0
  );

  const handleRunAudit = () => {
    setAuditPhase("running");
    setTimeout(() => setAuditPhase("results"), 2500);
  };

  const allIssues  = getAllIssues(MOCK_AUDIT);
  const highCount  = allIssues.filter(i => i.severity === "High").length;
  const avgScore   = Math.round(MOCK_AUDIT.reduce((a, s) => a + s.score, 0) / MOCK_AUDIT.length);
  const worstScreen = MOCK_AUDIT.reduce((a, b) => a.score < b.score ? a : b);

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
            <span className="text-xs font-medium text-foreground hidden sm:block">Phase 04</span>
            <span className="text-xs text-muted-foreground hidden md:block">— UX Audit</span>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => navigate(routeProjectId ? `/project/${routeProjectId}/phase/03` : "/dashboard")}
                className="h-8 rounded-lg text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back to Prototype
              </Button>

              {auditPhase === "results" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1.5">
                      <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">Audit Report</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => exportFullExcel(MOCK_AUDIT)} className="text-xs gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
                      Full Audit — Excel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => exportSummaryPDF(MOCK_AUDIT)} className="text-xs gap-2">
                      <FileText className="h-3.5 w-3.5 text-rose-500" strokeWidth={1.5} />
                      Summary Report — PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                size="sm"
                onClick={auditPhase === "setup" ? handleRunAudit : async () => { if (routeProjectId) { await supabase.from("projects").update({ current_phase: 7, updated_at: new Date().toISOString() }).eq("id", routeProjectId); } navigate(routeProjectId ? `/project/${routeProjectId}/phase/05` : "/dashboard"); }}
                disabled={auditPhase === "setup" && !canRun}
                className={cn(
                  "h-8 rounded-lg text-xs gap-1.5",
                  auditPhase === "results"
                    ? "gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
                    : canRun
                      ? "gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
                      : "opacity-40 cursor-not-allowed",
                )}
              >
                {auditPhase === "results" ? (
                  <>Proceed to UX Copy <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} /></>
                ) : (
                  <>Run Audit <Search className="h-3.5 w-3.5" strokeWidth={1.5} /></>
                )}
              </Button>
            </div>
          </header>

          {/* ── Stage Tracker ── */}
          <div className="border-b border-border/60 px-6 py-3 shrink-0">
            <StageTracker current={4} />
          </div>

          {/* ── Scrollable Content ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

              {/* ── Setup Section (always visible, collapses to summary in results) ── */}
              <AnimatePresence mode="wait">
                {auditPhase !== "results" ? (

                  <motion.div key="setup" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">

                    {/* Mode selector + context */}
                    <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
                      <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3 flex-wrap">
                        <p className="text-xs font-semibold text-foreground">Audit Source</p>
                        <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
                          <button onClick={() => setMode("project")}
                            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                              mode === "project" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />From Project
                          </button>
                          <button onClick={() => setMode("standalone")}
                            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                              mode === "standalone" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />New Audit
                          </button>
                        </div>
                      </div>

                      <div className="px-5 py-4">
                        <AnimatePresence mode="wait">
                          {mode === "project" ? (
                            <motion.div key="project" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="space-y-3">
                              {/* Project dropdown */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Select Project</label>
                                <select
                                  value={projectId}
                                  onChange={e => setProjectId(e.target.value)}
                                  className="w-full max-w-sm rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition-colors cursor-pointer"
                                >
                                  {MOCK_PROJECTS.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>
                              {/* Context pills */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-full px-3 py-1">
                                  <Users className="h-3 w-3" strokeWidth={1.5} />
                                  {selectedProject.personas} Personas
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-full px-3 py-1">
                                  <Monitor className="h-3 w-3" strokeWidth={1.5} />
                                  {selectedProject.screens} Screens
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-full px-3 py-1">
                                  <GitBranch className="h-3 w-3" strokeWidth={1.5} />
                                  {selectedProject.phase}
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div key="standalone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Project Name <span className="text-rose-500">*</span></label>
                                <input value={standName} onChange={e => setStandName(e.target.value)}
                                  placeholder="e.g. Mobile Banking App"
                                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground/30 transition-colors" />
                              </div>
                              <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Description <span className="text-rose-500">*</span></label>
                                <textarea value={standDesc} onChange={e => setStandDesc(e.target.value)}
                                  placeholder="What product are you auditing and what should the audit focus on?"
                                  rows={2}
                                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground/30 resize-none transition-colors" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Industry</label>
                                <select value={standIndustry} onChange={e => setStandIndustry(e.target.value)}
                                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition-colors cursor-pointer">
                                  <option value="">Select industry</option>
                                  {["SaaS","E-Commerce","FinTech","HealthTech","EdTech","Enterprise Tools","Consumer App"].map(v => <option key={v}>{v}</option>)}
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Product Type</label>
                                <select value={standType} onChange={e => setStandType(e.target.value)}
                                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition-colors cursor-pointer">
                                  <option value="">Select type</option>
                                  {["Web App","Mobile App","Dashboard","API Tool","Design System","E-Commerce Store"].map(v => <option key={v}>{v}</option>)}
                                </select>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Input section */}
                    <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
                      <div className="border-b border-border/40 flex">
                        {([["upload","Upload Screens"],["link","Paste Link"]] as [InputTab, string][]).map(([tab, label]) => (
                          <button key={tab} onClick={() => setInputTab(tab)}
                            className={cn("flex-1 py-3 text-xs font-medium transition-colors border-b-2",
                              inputTab === tab
                                ? "border-foreground text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60")}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="p-5">
                        <AnimatePresence mode="wait">
                          {inputTab === "upload" ? (
                            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                              <UploadZone files={files} onFiles={setFiles} />
                            </motion.div>
                          ) : (
                            <motion.div key="link" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className={cn("flex-1 flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors",
                                  linkValue && !isLinkValid ? "border-rose-400/60 bg-rose-50/30 dark:bg-rose-950/10" :
                                  isLinkValid ? "border-emerald-400/60 bg-emerald-50/30 dark:bg-emerald-950/10" :
                                  "border-border/60 bg-background")}>
                                  <Link2 className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                                  <input
                                    value={linkValue} onChange={e => setLinkValue(e.target.value)}
                                    placeholder="https://your-product.com or Figma prototype link"
                                    className="flex-1 text-sm text-foreground placeholder:text-muted-foreground/50 bg-transparent outline-none"
                                  />
                                  {isLinkValid && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={1.5} />}
                                  {linkValue && !isLinkValid && <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" strokeWidth={1.5} />}
                                </div>
                              </div>
                              {linkValue && !isLinkValid && (
                                <p className="text-[11px] text-rose-500">Enter a valid URL starting with https://</p>
                              )}
                              <p className="text-xs text-muted-foreground">Supports live web apps, Figma prototypes, and staging URLs.</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Run Audit CTA */}
                    <Button
                      onClick={handleRunAudit}
                      disabled={!canRun}
                      className={cn(
                        "w-full h-11 rounded-xl text-sm gap-2",
                        canRun
                          ? "gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
                          : "opacity-40 cursor-not-allowed",
                      )}
                    >
                      <Search className="h-4 w-4" strokeWidth={1.5} />
                      Run UX Audit
                    </Button>

                    {!canRun && (
                      <p className="text-center text-[11px] text-muted-foreground">
                        {mode === "standalone" && !standName
                          ? "Enter a project name and description to continue"
                          : "Upload at least one screen or enter a product link"}
                      </p>
                    )}

                  </motion.div>

                ) : auditPhase === "running" ? (

                  <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center py-24 gap-5 text-muted-foreground">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
                        <Search className="h-7 w-7 text-foreground animate-pulse" strokeWidth={1} />
                      </div>
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">Analysing screens…</p>
                      <p className="text-xs text-muted-foreground">Evaluating usability, cognitive load, interactions, and system gaps</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {["Usability","Cognitive","Interaction","Emotional","System"].map((label, i) => (
                        <motion.span key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.3 }}
                          className="text-[10px] bg-secondary text-muted-foreground rounded-full px-2 py-0.5">
                          {label}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>

                ) : (

                  /* Results mode: compact context strip */
                  <motion.div key="results-context" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>

                    {/* Intelligence banner */}
                    <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-950/20 px-5 py-4 flex items-start gap-3 mb-5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Audit complete — {allIssues.length} issues found across {MOCK_AUDIT.length} screens</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Critical focus: <span className="font-medium text-foreground">{worstScreen.name}</span> requires immediate attention (UX score: {worstScreen.score}/100) · {highCount} high-severity issues need resolution before launch
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setAuditPhase("setup")}
                        className="h-7 rounded-lg text-[11px] text-muted-foreground hover:text-foreground shrink-0">
                        New Audit
                      </Button>
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                      {[
                        { label: "Total Issues",    value: allIssues.length, icon: AlertCircle, sub: `${MOCK_AUDIT.length} screens`        },
                        { label: "High Severity",   value: highCount,        icon: AlertTriangle, sub: "require immediate fix", accent: true },
                        { label: "Screens Audited", value: MOCK_AUDIT.length, icon: Monitor,      sub: "in this project"                    },
                        { label: "Avg UX Score",    value: `${avgScore}/100`, icon: BarChart3,    sub: "across all screens"                 },
                      ].map((stat, i) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          className="rounded-xl border border-border bg-background px-4 py-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <stat.icon className={cn("h-3.5 w-3.5", stat.accent ? "text-rose-500" : "text-muted-foreground")} strokeWidth={1.5} />
                            <span className={cn("text-xl font-bold tabular-nums", stat.accent ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>
                              {stat.value}
                            </span>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-foreground">{stat.label}</p>
                            <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Filter bar */}
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
                        {(["all","high","medium","low"] as SevFilter[]).map(f => (
                          <button key={f} onClick={() => setSevFilter(f)}
                            className={cn("rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors",
                              sevFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            {f === "all" ? "All Severity" : f}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 rounded-xl bg-secondary p-1 overflow-x-auto">
                        {(["all","usability","cognitive","interaction","emotional","system"] as TypeFilter[]).map(f => (
                          <button key={f} onClick={() => setTypeFilter(f)}
                            className={cn("rounded-lg px-3 py-1 text-xs font-medium capitalize whitespace-nowrap transition-colors",
                              typeFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            {f === "all" ? "All Types" : f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Screen audit cards */}
                    <div className="space-y-4">
                      {MOCK_AUDIT.map(screen => (
                        <ScreenAuditCard
                          key={screen.id}
                          screen={screen}
                          sevFilter={sevFilter}
                          typeFilter={typeFilter}
                        />
                      ))}
                      {MOCK_AUDIT.every(s => {
                        const vis = s.categories.flatMap(c => c.issues).filter(i =>
                          (sevFilter === "all" || i.severity.toLowerCase() === sevFilter) &&
                          (typeFilter === "all" || s.categories.find(c => c.type === typeFilter)?.issues.includes(i))
                        );
                        return vis.length === 0;
                      }) && (
                        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" strokeWidth={1} />
                          <p className="text-sm font-semibold text-foreground">No issues match this filter</p>
                          <p className="text-xs text-muted-foreground mt-1">Try adjusting severity or type filters</p>
                        </div>
                      )}
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

          {/* ── Bottom CTA ── */}
          {auditPhase === "results" && (
            <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-6 py-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {allIssues.length} issues · {highCount} critical · avg score {avgScore}/100
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Audit ready for export and team review
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
                      <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">Export Audit</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => exportFullExcel(MOCK_AUDIT)} className="text-xs gap-2">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
                        Full Audit — Excel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => exportSummaryPDF(MOCK_AUDIT)} className="text-xs gap-2">
                        <FileText className="h-3.5 w-3.5 text-rose-500" strokeWidth={1.5} />
                        Summary Report — PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={async () => { if (routeProjectId) { await supabase.from("projects").update({ current_phase: 7, updated_at: new Date().toISOString() }).eq("id", routeProjectId); } navigate(routeProjectId ? `/project/${routeProjectId}/phase/05` : "/dashboard"); }}
                    className="h-10 rounded-xl text-sm gap-1.5 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
                  >
                    Proceed to UX Copywriting
                    <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </SidebarProvider>
  );
};

export default UXAudit;
