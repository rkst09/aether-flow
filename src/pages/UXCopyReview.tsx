import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronRight,
  Cpu, FileText, Brain, Upload, BookOpen, Search, Layers,
  Download, MousePointer, AlertTriangle, Inbox, Info,
  Type, Compass, CheckCircle2, FileSpreadsheet,
  FolderOpen, Sparkles, GitBranch, Users, Monitor,
  X, Link2, Image as ImageIcon,
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

type ReviewPhase = "setup" | "running" | "results";
type Mode        = "project" | "standalone";
type InputTab    = "upload" | "link";
type Severity    = "High" | "Medium" | "Low";
type CopyType    = "cta" | "error" | "empty" | "instructional" | "form" | "navigation" | "success";
type IssueType   = "clarity" | "generic" | "guidance" | "tone" | "cognitive";
type SevFilter   = "all" | "high" | "medium" | "low";
type TypeFilter  = "all" | IssueType;

interface CopyItem {
  id:        string;
  copyType:  CopyType;
  original:  string;
  issue:     string;
  issueType: IssueType;
  severity:  Severity;
  suggested: string;
  persona:   string;
}

interface ScreenCopyReview {
  id:      string;
  name:    string;
  persona: string;
  items:   CopyItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COPY_TYPE_CONFIG: Record<CopyType, { label: string; Icon: React.ElementType; dot: string }> = {
  cta:           { label: "CTA Labels",           Icon: MousePointer, dot: "bg-violet-400" },
  error:         { label: "Error Messages",        Icon: AlertTriangle,dot: "bg-rose-400"   },
  empty:         { label: "Empty States",          Icon: Inbox,        dot: "bg-blue-400"   },
  instructional: { label: "Instructional Copy",    Icon: Info,         dot: "bg-amber-400"  },
  form:          { label: "Form Labels & Helpers", Icon: Type,         dot: "bg-emerald-400"},
  navigation:    { label: "Navigation Labels",     Icon: Compass,      dot: "bg-slate-400"  },
  success:       { label: "Success Messages",      Icon: CheckCircle2, dot: "bg-teal-400"   },
};

const ISSUE_TYPE_CONFIG: Record<IssueType, { label: string; badge: string }> = {
  clarity:   { label: "Clarity Issue",      badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"      },
  generic:   { label: "Generic Wording",    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800"            },
  guidance:  { label: "Missing Guidance",   badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"            },
  tone:      { label: "Tone Mismatch",      badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800"},
  cognitive: { label: "Cognitive Overload", badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800"},
};

const SEVERITY_CONFIG: Record<Severity, { dot: string; badge: string }> = {
  High:   { dot: "bg-rose-500",  badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800"          },
  Medium: { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"    },
  Low:    { dot: "bg-blue-400",  badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"           },
};

const MOCK_PROJECTS = [
  { id: "p1", name: "Design System Redesign",  personas: 4, screens: 19, phase: "Phase 04 Complete" },
  { id: "p2", name: "E-Commerce Platform v2",  personas: 3, screens: 14, phase: "Phase 03 Complete" },
  { id: "p3", name: "Mobile Banking App",      personas: 5, screens: 22, phase: "Phase 02 Complete" },
];

const MOCK_REVIEW: ScreenCopyReview[] = [
  {
    id: "s1", name: "Dashboard Overview", persona: "Sarah Chen",
    items: [
      { id: "d1", copyType: "cta",           original: "Submit",                                  issue: "Doesn't describe the action or outcome",               issueType: "generic",   severity: "High",   suggested: "Generate Report",                                      persona: "Sarah Chen · PM"          },
      { id: "d2", copyType: "navigation",    original: "Data",                                    issue: "Too abstract — destination is unclear",                 issueType: "clarity",   severity: "Medium", suggested: "Analytics",                                            persona: "Sarah Chen · PM"          },
      { id: "d3", copyType: "empty",         original: "No data available",                       issue: "Offers no next action or context",                      issueType: "guidance",  severity: "High",   suggested: "No projects yet — create your first to get started",  persona: "Alex Rivera · PM"         },
      { id: "d4", copyType: "instructional", original: "Fill in all fields before proceeding",    issue: "Commanding tone creates friction",                      issueType: "tone",      severity: "Low",    suggested: "Complete these fields to continue",                    persona: "Sarah Chen · PM"          },
    ],
  },
  {
    id: "s2", name: "Feature Creation Flow", persona: "Alex Rivera",
    items: [
      { id: "f1", copyType: "cta",           original: "Submit",                                  issue: "Generic — doesn't describe what gets created",          issueType: "generic",   severity: "High",   suggested: "Create Feature",                                       persona: "Alex Rivera · PM"         },
      { id: "f2", copyType: "cta",           original: "Cancel",                                  issue: "Doesn't convey consequence of discarding work",         issueType: "tone",      severity: "Medium", suggested: "Discard changes",                                      persona: "Alex Rivera · PM"         },
      { id: "f3", copyType: "error",         original: "Invalid input",                           issue: "No recovery path — user doesn't know what to fix",      issueType: "guidance",  severity: "High",   suggested: "Feature name can't be empty — add a name to continue", persona: "Alex Rivera · PM"         },
      { id: "f4", copyType: "form",          original: "Name",                                    issue: "Too broad — ambiguous in a feature creation context",    issueType: "clarity",   severity: "Medium", suggested: "Feature name (e.g. User Login, Search Bar)",           persona: "Alex Rivera · PM"         },
      { id: "f5", copyType: "form",          original: "Type",                                    issue: "No context for what values are expected",                issueType: "clarity",   severity: "Medium", suggested: "Feature type (e.g. User Story, Bug Fix, Enhancement)", persona: "Alex Rivera · PM"         },
      { id: "f6", copyType: "instructional", original: "Complete all required fields",            issue: "Instructional — states the obvious without helping",     issueType: "cognitive", severity: "Low",    suggested: "Add a name and type to define this feature",           persona: "Alex Rivera · PM"         },
      { id: "f7", copyType: "success",       original: "Done!",                                   issue: "Doesn't confirm what was created or what to do next",   issueType: "clarity",   severity: "High",   suggested: "Feature created — it's now in your project backlog",  persona: "Alex Rivera · PM"         },
    ],
  },
  {
    id: "s3", name: "Settings Page", persona: "Jordan Patel",
    items: [
      { id: "s1", copyType: "navigation",    original: "Settings",                                issue: "Too broad as a section header",                         issueType: "clarity",   severity: "Low",    suggested: "Account Settings",                                     persona: "Jordan Patel · Admin"     },
      { id: "s2", copyType: "form",          original: "Notifications: On",                       issue: "Describes state, not the action's outcome",             issueType: "clarity",   severity: "Medium", suggested: "Receive email updates for project activity",           persona: "Jordan Patel · Admin"     },
      { id: "s3", copyType: "cta",           original: "Save",                                    issue: "Generic — doesn't specify what is being saved",         issueType: "generic",   severity: "Low",    suggested: "Save account preferences",                             persona: "Jordan Patel · Admin"     },
      { id: "s4", copyType: "instructional", original: "Some changes may require a reload",       issue: "Vague — creates uncertainty without resolution",         issueType: "cognitive", severity: "Medium", suggested: "These settings apply after you reload the page",       persona: "Marcus Webb · Enterprise" },
      { id: "s5", copyType: "error",         original: "An error occurred",                       issue: "No cause, no recovery path — leaves user stranded",      issueType: "guidance",  severity: "High",   suggested: "Couldn't save changes — try again or contact support", persona: "Marcus Webb · Enterprise" },
    ],
  },
];

const TONE_GUIDE = {
  principles: [
    { title: "Direct",     body: "Say exactly what happens when the user acts. No ambiguity." },
    { title: "Specific",   body: "Name the action and its outcome. 'Save account preferences' — not 'Save'." },
    { title: "Guiding",    body: "Every error shows a recovery path. Never leave the user stranded." },
    { title: "Consistent", body: "One term, one meaning, everywhere. Never mix synonyms for the same action." },
  ],
  dos: [
    "Use action verbs: Create, Save, View, Start, Generate",
    "Name outcomes: 'Create Feature' not 'Submit'",
    "Guide recovery in errors: '[Problem] — [How to fix it]'",
    "Write empty states as invitations: 'No items yet — add your first'",
    "Write success as confirmation + next step: 'Done — it's now in your backlog'",
  ],
  donts: [
    "Use vague labels: Submit, Done, Data, Settings, Click here",
    "Write anxiety-inducing instructions: 'You must', 'Required', 'Invalid'",
    "Leave empty states without a next action",
    "Show generic errors: 'An error occurred' with no context",
    "Mix formal and casual tone within a single flow",
  ],
  patterns: [
    { pattern: "CTAs",            format: "[Verb] + [Object]",              example: "'Generate Report', 'Create Feature', 'Save Preferences'" },
    { pattern: "Error Messages",  format: "[What failed] — [How to fix]",   example: "'Name can't be empty — add a name to continue'"          },
    { pattern: "Success States",  format: "[What happened] — [What's next]", example: "'Feature created — it's now in your project backlog'"    },
    { pattern: "Empty States",    format: "[State] — [Invitation to act]",  example: "'No projects yet — create your first to get started'"    },
  ],
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function getAllItems(screens: ScreenCopyReview[]) {
  return screens.flatMap(s => s.items);
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportFullExcel(screens: ScreenCopyReview[]) {
  const header = ["Screen","Copy Type","Original","Issue Type","Severity","Issue","Suggested","Persona"];
  const rows   = screens.flatMap(s => s.items.map(i => [
    s.name, COPY_TYPE_CONFIG[i.copyType].label, i.original,
    ISSUE_TYPE_CONFIG[i.issueType].label, i.severity, i.issue, i.suggested, i.persona,
  ]));
  const csv = "\uFEFF" + [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  downloadBlob(csv, "Aether_Copy_Review_Full.csv", "text/csv;charset=utf-8;");
}

function exportScreenExcel(screen: ScreenCopyReview) {
  const header = ["Copy Type","Original","Issue Type","Severity","Issue","Suggested","Persona"];
  const rows   = screen.items.map(i => [
    COPY_TYPE_CONFIG[i.copyType].label, i.original,
    ISSUE_TYPE_CONFIG[i.issueType].label, i.severity, i.issue, i.suggested, i.persona,
  ]);
  const csv = "\uFEFF" + [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  downloadBlob(csv, `Aether_Copy_${screen.name.replace(/\s+/g,"_")}.csv`, "text/csv;charset=utf-8;");
}

function exportToneGuidePDF() {
  const dos   = TONE_GUIDE.dos.map(d  => `<li>${d}</li>`).join("");
  const donts = TONE_GUIDE.donts.map(d => `<li>${d}</li>`).join("");
  const patterns = TONE_GUIDE.patterns.map(p =>
    `<tr><td style="font-weight:600">${p.pattern}</td><td style="font-family:monospace;font-size:11px">${p.format}</td><td style="color:#6b7280;font-size:11px">${p.example}</td></tr>`
  ).join("");

  const win = window.open("","_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Aether — Tone-of-Voice Guide</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,Segoe UI,sans-serif;padding:40px;color:#111;font-size:12px}
  h1{font-size:20px;margin-bottom:4px}h2{font-size:14px;margin:24px 0 10px;color:#374151}
  .sub{color:#6b7280;margin-bottom:24px}.principles{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
  .p{border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px}.p-title{font-weight:700;margin-bottom:4px}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
  ul{padding-left:16px;line-height:2}li{font-size:12px}
  table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 12px;background:#f9fafb;border-bottom:2px solid #e5e7eb;font-size:11px;text-transform:uppercase;color:#6b7280}
  td{padding:8px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top}@media print{body{padding:20px}}</style>
  </head><body>
  <h1>Tone-of-Voice Guide</h1><p class="sub">Generated by Aether — UX Copywriting Review</p>
  <h2>Core Principles</h2>
  <div class="principles">${TONE_GUIDE.principles.map(p => `<div class="p"><div class="p-title">${p.title}</div>${p.body}</div>`).join("")}</div>
  <div class="cols">
    <div><h2>✓ Do</h2><ul>${dos}</ul></div>
    <div><h2>✗ Don't</h2><ul>${donts}</ul></div>
  </div>
  <h2>Copy Patterns</h2>
  <table><thead><tr><th>Element</th><th>Format</th><th>Example</th></tr></thead><tbody>${patterns}</tbody></table>
  </body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 300);
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

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ files, onFiles }: { files: File[]; onFiles: (f: File[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    onFiles([...files, ...Array.from(e.dataTransfer.files)]);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn("rounded-2xl border-2 border-dashed px-8 py-10 flex flex-col items-center gap-3 cursor-pointer transition-all",
          isDragging ? "border-foreground/40 bg-secondary/60" : "border-border/60 hover:border-border hover:bg-secondary/20")}
      >
        <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
          <ImageIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">{isDragging ? "Drop screens here" : "Drop screens here, or click to upload"}</p>
          <p className="text-xs text-muted-foreground">PNG, JPG, WebP, PDF · Multiple files allowed</p>
        </div>
        <input ref={inputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
          onChange={e => e.target.files && onFiles([...files, ...Array.from(e.target.files)])} />
      </div>
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2">
              <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <span className="text-[11px] text-foreground font-medium truncate flex-1">{file.name}</span>
              <button onClick={e => { e.stopPropagation(); onFiles(files.filter((_,j) => j !== i)); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Copy Row ─────────────────────────────────────────────────────────────────

function CopyRow({ item }: { item: CopyItem }) {
  const issueCfg = ISSUE_TYPE_CONFIG[item.issueType];
  const sevCfg   = SEVERITY_CONFIG[item.severity];
  return (
    <div className="py-4 border-b border-border/30 last:border-0 group">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_1fr] gap-3 sm:gap-4 sm:items-start">

        {/* Original */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">Original</p>
          <p className="text-sm font-mono text-foreground/50 line-through decoration-muted-foreground/40">
            "{item.original}"
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed hidden sm:block">{item.issue}</p>
        </div>

        {/* Middle: badges */}
        <div className="flex sm:flex-col items-start sm:items-center gap-1.5 sm:pt-5">
          <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full border", issueCfg.badge)}>
            {issueCfg.label}
          </span>
          <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full border", sevCfg.badge)}>
            {item.severity}
          </span>
          <p className="text-[11px] text-muted-foreground sm:hidden leading-relaxed">{item.issue}</p>
        </div>

        {/* Suggested */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Suggested</p>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            "{item.suggested}"
          </p>
          <span className="inline-flex text-[10px] text-muted-foreground bg-secondary/80 rounded-full px-2 py-0.5">
            {item.persona}
          </span>
        </div>

      </div>
    </div>
  );
}

// ─── Copy Section Block ───────────────────────────────────────────────────────

function CopySectionBlock({
  copyType, items, sevFilter, typeFilter,
}: {
  copyType:   CopyType;
  items:      CopyItem[];
  sevFilter:  SevFilter;
  typeFilter: TypeFilter;
}) {
  const [open, setOpen] = useState(true);
  const cfg = COPY_TYPE_CONFIG[copyType];

  const visible = items.filter(i =>
    (sevFilter  === "all" || i.severity.toLowerCase()  === sevFilter) &&
    (typeFilter === "all" || i.issueType               === typeFilter)
  );

  if (typeFilter !== "all" && items.every(i => i.issueType !== typeFilter)) return null;
  if (sevFilter  !== "all" && visible.length === 0)                          return null;

  const highCount = visible.filter(i => i.severity === "High").length;

  return (
    <div className="border-b border-border/40 last:border-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/30 transition-colors">
        <div className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
        <cfg.Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
        <span className="text-xs font-semibold text-foreground flex-1 text-left">{cfg.label}</span>
        <div className="flex items-center gap-1.5">
          {highCount > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800">
              {highCount} High
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/60">{visible.length} {visible.length === 1 ? "item" : "items"}</span>
          {open
            ? <ChevronDown  className="h-3.5 w-3.5 text-muted-foreground ml-1" strokeWidth={1.5} />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-1" strokeWidth={1.5} />
          }
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.16, ease: "easeOut" }}
            className="overflow-hidden">
            <div className="px-5 pb-2">
              {visible.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/60 py-3 italic">No {sevFilter} issues in this category.</p>
              ) : (
                visible.map(item => <CopyRow key={item.id} item={item} />)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Screen Copy Card ─────────────────────────────────────────────────────────

function ScreenCopyCard({
  screen, sevFilter, typeFilter,
}: {
  screen:     ScreenCopyReview;
  sevFilter:  SevFilter;
  typeFilter: TypeFilter;
}) {
  const visibleItems = screen.items.filter(i =>
    (sevFilter  === "all" || i.severity.toLowerCase()  === sevFilter) &&
    (typeFilter === "all" || i.issueType               === typeFilter)
  );
  if (sevFilter !== "all" && visibleItems.length === 0) return null;

  const highCount = screen.items.filter(i => i.severity === "High").length;
  const copyTypes = [...new Set(screen.items.map(i => i.copyType))] as CopyType[];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
      className="rounded-2xl border border-border/60 bg-background overflow-hidden">

      {/* Card header */}
      <div className="px-5 py-4 border-b border-border/40 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">{screen.name}</h3>
            <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">{screen.persona}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{screen.items.length} copy items · {highCount} high priority</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 rounded-lg text-[11px] gap-1 px-2.5 shrink-0">
              <Download className="h-3 w-3" strokeWidth={1.5} />Export
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

      {/* Screen preview */}
      <div className="px-5 py-4 border-b border-border/40">
        <div className="aspect-video rounded-xl bg-secondary/40 border border-border/30 flex flex-col items-center justify-center gap-2">
          <Monitor className="h-8 w-8 text-muted-foreground/30" strokeWidth={1} />
          <span className="text-xs text-muted-foreground/60">{screen.name}</span>
        </div>
      </div>

      {/* Copy sections */}
      <div>
        {copyTypes.map(ct => (
          <CopySectionBlock
            key={ct}
            copyType={ct}
            items={screen.items.filter(i => i.copyType === ct)}
            sevFilter={sevFilter}
            typeFilter={typeFilter}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Tone Guide Summary ───────────────────────────────────────────────────────

function ToneGuideSummary() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}
      className="space-y-5 rounded-2xl border border-border/60 bg-background overflow-hidden">

      <div className="px-5 py-4 border-b border-border/40">
        <h3 className="text-sm font-bold text-foreground">Tone-of-Voice Guide</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Product communication principles derived from this review</p>
      </div>

      {/* Principles */}
      <div className="px-5 pb-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Core Principles</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TONE_GUIDE.principles.map((p, i) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
              className="rounded-xl bg-secondary/40 border border-border/40 px-4 py-3 space-y-1">
              <p className="text-xs font-bold text-foreground">{p.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Do's and Don'ts */}
      <div className="px-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Do</p>
          <div className="space-y-1.5">
            {TONE_GUIDE.dos.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" strokeWidth={1.5} />
                <p className="text-xs text-foreground leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-500">Don't</p>
          <div className="space-y-1.5">
            {TONE_GUIDE.donts.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <X className="h-3.5 w-3.5 text-rose-500 mt-0.5 shrink-0" strokeWidth={2} />
                <p className="text-xs text-foreground leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copy Patterns */}
      <div className="px-5 pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Copy Patterns</p>
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <div className="grid grid-cols-[120px_1fr_1fr] bg-secondary/40 px-4 py-2.5 border-b border-border/40">
            {["Element","Format","Example"].map(h => (
              <p key={h} className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{h}</p>
            ))}
          </div>
          {TONE_GUIDE.patterns.map((p, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr_1fr] px-4 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors">
              <p className="text-xs font-semibold text-foreground">{p.pattern}</p>
              <p className="text-xs font-mono text-foreground/70 pr-4">{p.format}</p>
              <p className="text-xs text-muted-foreground italic">{p.example}</p>
            </div>
          ))}
        </div>
      </div>

    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const UXCopyReview = () => {
  const navigate = useNavigate();

  const [mode,          setMode]          = useState<Mode>("project");
  const [projectId,     setProjectId]     = useState<string>("p1");
  const [standName,     setStandName]     = useState("");
  const [standDesc,     setStandDesc]     = useState("");
  const [standIndustry, setStandIndustry] = useState("");
  const [standType,     setStandType]     = useState("");
  const [inputTab,      setInputTab]      = useState<InputTab>("upload");
  const [files,         setFiles]         = useState<File[]>([]);
  const [linkValue,     setLinkValue]     = useState("");
  const [reviewPhase,   setReviewPhase]   = useState<ReviewPhase>("setup");
  const [sevFilter,     setSevFilter]     = useState<SevFilter>("all");
  const [typeFilter,    setTypeFilter]    = useState<TypeFilter>("all");

  const selectedProject = MOCK_PROJECTS.find(p => p.id === projectId)!;
  const isLinkValid = linkValue.startsWith("http://") || linkValue.startsWith("https://");
  const hasInput    = files.length > 0 || isLinkValid;
  const canRun      = hasInput && (
    mode === "project"
      ? !!projectId
      : standName.trim().length > 0 && standDesc.trim().length > 0
  );

  const handleRunReview = () => {
    setReviewPhase("running");
    setTimeout(() => setReviewPhase("results"), 2500);
  };

  const allItems     = getAllItems(MOCK_REVIEW);
  const highCount    = allItems.filter(i => i.severity === "High").length;
  const worstScreen  = MOCK_REVIEW.reduce((a, b) =>
    b.items.filter(i => i.severity === "High").length > a.items.filter(i => i.severity === "High").length ? b : a
  );

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
            <span className="text-xs font-medium text-foreground hidden sm:block">Phase 05</span>
            <span className="text-xs text-muted-foreground hidden md:block">— UX Copywriting Review</span>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => navigate("/project/phase/04")}
                className="h-8 rounded-lg text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back to UX Audit
              </Button>

              {reviewPhase === "results" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1.5">
                      <Download className="h-3.5 w-3.5" strokeWidth={1.5} />Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">Copy Review</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => exportFullExcel(MOCK_REVIEW)} className="text-xs gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
                      Full Report — Excel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={exportToneGuidePDF} className="text-xs gap-2">
                      <FileText className="h-3.5 w-3.5 text-violet-500" strokeWidth={1.5} />
                      Tone Guide — PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button size="sm"
                onClick={reviewPhase === "setup" ? handleRunReview : () => navigate("/project/phase/06")}
                disabled={reviewPhase === "setup" && !canRun}
                className={cn("h-8 rounded-lg text-xs gap-1.5",
                  reviewPhase === "results" || canRun
                    ? "gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
                    : "opacity-40 cursor-not-allowed",
                )}>
                {reviewPhase === "results"
                  ? <><span>Proceed to Documentation</span><ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} /></>
                  : <><span>Run Review</span><FileText className="h-3.5 w-3.5" strokeWidth={1.5} /></>
                }
              </Button>
            </div>
          </header>

          {/* ── Stage Tracker ── */}
          <div className="border-b border-border/60 px-6 py-3 shrink-0">
            <StageTracker current={5} />
          </div>

          {/* ── Scrollable Content ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
              <AnimatePresence mode="wait">

                {/* ── Setup ── */}
                {reviewPhase !== "results" ? (
                  <motion.div key="setup" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">

                    {/* Mode selector */}
                    <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
                      <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3 flex-wrap">
                        <p className="text-xs font-semibold text-foreground">Review Source</p>
                        <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
                          <button onClick={() => setMode("project")}
                            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                              mode === "project" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />From Project
                          </button>
                          <button onClick={() => setMode("standalone")}
                            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                              mode === "standalone" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />New Review
                          </button>
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        <AnimatePresence mode="wait">
                          {mode === "project" ? (
                            <motion.div key="project" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Select Project</label>
                                <select value={projectId} onChange={e => setProjectId(e.target.value)}
                                  className="w-full max-w-sm rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/30 transition-colors cursor-pointer">
                                  {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-full px-3 py-1">
                                  <Users className="h-3 w-3" strokeWidth={1.5} />{selectedProject.personas} Personas
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-full px-3 py-1">
                                  <Monitor className="h-3 w-3" strokeWidth={1.5} />{selectedProject.screens} Screens
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary rounded-full px-3 py-1">
                                  <GitBranch className="h-3 w-3" strokeWidth={1.5} />{selectedProject.phase}
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div key="standalone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Project Name <span className="text-rose-500">*</span></label>
                                <input value={standName} onChange={e => setStandName(e.target.value)} placeholder="e.g. Mobile Banking App"
                                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground/30 transition-colors" />
                              </div>
                              <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Description <span className="text-rose-500">*</span></label>
                                <textarea value={standDesc} onChange={e => setStandDesc(e.target.value)} placeholder="What product are you reviewing and who is the primary user?" rows={2}
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
                        {([["upload","Upload Screens"],["link","Paste Link"]] as [InputTab,string][]).map(([tab,label]) => (
                          <button key={tab} onClick={() => setInputTab(tab)}
                            className={cn("flex-1 py-3 text-xs font-medium transition-colors border-b-2",
                              inputTab === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60")}>
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
                              <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors",
                                linkValue && !isLinkValid ? "border-rose-400/60 bg-rose-50/30 dark:bg-rose-950/10" :
                                isLinkValid ? "border-emerald-400/60 bg-emerald-50/30 dark:bg-emerald-950/10" :
                                "border-border/60 bg-background")}>
                                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                                <input value={linkValue} onChange={e => setLinkValue(e.target.value)}
                                  placeholder="https://your-product.com or Figma prototype link"
                                  className="flex-1 text-sm text-foreground placeholder:text-muted-foreground/50 bg-transparent outline-none" />
                                {isLinkValid && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={1.5} />}
                                {linkValue && !isLinkValid && <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" strokeWidth={1.5} />}
                              </div>
                              {linkValue && !isLinkValid && <p className="text-[11px] text-rose-500">Enter a valid URL starting with https://</p>}
                              <p className="text-xs text-muted-foreground">Supports live web apps, Figma prototypes, and staging URLs.</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <Button onClick={handleRunReview} disabled={!canRun}
                      className={cn("w-full h-11 rounded-xl text-sm gap-2",
                        canRun ? "gradient-accent text-accent-foreground hover:brightness-110 shadow-soft" : "opacity-40 cursor-not-allowed")}>
                      <FileText className="h-4 w-4" strokeWidth={1.5} />
                      Run Copywriting Review
                    </Button>
                    {!canRun && (
                      <p className="text-center text-[11px] text-muted-foreground">
                        {mode === "standalone" && !standName ? "Enter a project name and description to continue" : "Upload at least one screen or enter a product link"}
                      </p>
                    )}

                  </motion.div>

                ) : reviewPhase === "running" ? (

                  <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-24 gap-5 text-muted-foreground">
                    <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
                      <FileText className="h-7 w-7 text-foreground animate-pulse" strokeWidth={1} />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">Analysing copy…</p>
                      <p className="text-xs text-muted-foreground">Reviewing CTAs, error messages, empty states, form labels, and more</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {["CTAs","Error Messages","Empty States","Form Labels","Navigation"].map((label, i) => (
                        <motion.span key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.3 }}
                          className="text-[10px] bg-secondary text-muted-foreground rounded-full px-2 py-0.5">{label}</motion.span>
                      ))}
                    </div>
                  </motion.div>

                ) : (

                  /* ── Results ── */
                  <motion.div key="results" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-5">

                    {/* Intelligence banner */}
                    <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/30 bg-violet-50/60 dark:bg-violet-950/20 px-5 py-4 flex items-start gap-3">
                      <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Review complete — {allItems.length} copy items analysed across {MOCK_REVIEW.length} screens</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Most impactful: <span className="font-medium text-foreground">{worstScreen.name}</span> — {worstScreen.items.filter(i => i.severity === "High").length} high-priority rewrites needed · Tone guide generated below
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setReviewPhase("setup")}
                        className="h-7 rounded-lg text-[11px] text-muted-foreground hover:text-foreground shrink-0">New Review</Button>
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Copy Items",      value: allItems.length,        icon: FileText,      sub: `${MOCK_REVIEW.length} screens`       },
                        { label: "High Priority",   value: highCount,              icon: AlertTriangle, sub: "require immediate rewrite", accent: true },
                        { label: "Issue Types",     value: 5,                      icon: Layers,        sub: "categories detected"                 },
                        { label: "Tone Guide",      value: "Ready",                icon: CheckCircle2,  sub: "principles generated"                },
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

                    {/* Filters */}
                    <div className="flex items-center gap-3 flex-wrap">
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
                        {(["all","clarity","generic","guidance","tone","cognitive"] as TypeFilter[]).map(f => (
                          <button key={f} onClick={() => setTypeFilter(f)}
                            className={cn("rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap capitalize transition-colors",
                              typeFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            {f === "all" ? "All Types" : ISSUE_TYPE_CONFIG[f as IssueType]?.label ?? f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Screen cards */}
                    {MOCK_REVIEW.map(screen => (
                      <ScreenCopyCard key={screen.id} screen={screen} sevFilter={sevFilter} typeFilter={typeFilter} />
                    ))}

                    {/* Empty filter state */}
                    {MOCK_REVIEW.every(s => {
                      const vis = s.items.filter(i =>
                        (sevFilter === "all" || i.severity.toLowerCase() === sevFilter) &&
                        (typeFilter === "all" || i.issueType === typeFilter)
                      );
                      return vis.length === 0;
                    }) && (
                      <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" strokeWidth={1} />
                        <p className="text-sm font-semibold text-foreground">No items match this filter</p>
                        <p className="text-xs text-muted-foreground mt-1">Try adjusting severity or issue type filters</p>
                      </div>
                    )}

                    {/* Tone Guide */}
                    <ToneGuideSummary />

                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>

          {/* ── Bottom CTA ── */}
          {reviewPhase === "results" && (
            <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-6 py-4">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{allItems.length} copy items reviewed · {highCount} high-priority rewrites</p>
                  <p className="text-xs text-muted-foreground">Tone guide ready for export</p>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-10 rounded-xl text-sm gap-1.5">
                        <Download className="h-4 w-4" strokeWidth={1.5} />Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">Export Review</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => exportFullExcel(MOCK_REVIEW)} className="text-xs gap-2">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
                        Full Report — Excel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={exportToneGuidePDF} className="text-xs gap-2">
                        <FileText className="h-3.5 w-3.5 text-violet-500" strokeWidth={1.5} />
                        Tone Guide — PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={() => navigate("/project/phase/06")}
                    className="h-10 rounded-xl text-sm gap-1.5 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft">
                    Proceed to Documentation
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

export default UXCopyReview;
