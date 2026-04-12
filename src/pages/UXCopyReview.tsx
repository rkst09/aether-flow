import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { runCopyReview, type RichScreenCopyReview } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronRight,
  Cpu, FileText, Brain, Upload, BookOpen, Search, Layers,
  Download, MousePointer, AlertTriangle, Inbox, Info,
  Type, Compass, CheckCircle2, FileSpreadsheet,
  GitBranch, Users, Monitor,
  X, Link2, Image as ImageIcon, Sparkles, RefreshCw,
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
  screen, sevFilter, typeFilter, previewUrl,
}: {
  screen:      ScreenCopyReview;
  sevFilter:   SevFilter;
  typeFilter:  TypeFilter;
  previewUrl?: string;
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
        <div className="aspect-video rounded-xl bg-secondary/40 border border-border/30 overflow-hidden flex items-center justify-center">
          {previewUrl ? (
            <img src={previewUrl} alt={screen.name} className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <Monitor className="h-8 w-8 text-muted-foreground/30" strokeWidth={1} />
              <span className="text-xs text-muted-foreground/60">{screen.name}</span>
            </div>
          )}
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
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id: routeProjectId } = useParams<{ id: string }>();

  // Files passed from Phase 04 via router state
  const passedFiles = (location.state?.files as File[]) || [];

  const [files,       setFiles]       = useState<File[]>(passedFiles);
  const [previews,    setPreviews]    = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    passedFiles.forEach(f => { map[f.name.replace(/\.[^/.]+$/, "")] = URL.createObjectURL(f); });
    return map;
  });
  const [reviewPhase, setReviewPhase] = useState<ReviewPhase>("setup");
  const [sevFilter,   setSevFilter]   = useState<SevFilter>("all");
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>("all");
  const [reviewData,  setReviewData]  = useState<ScreenCopyReview[]>([]);
  const [generating,  setGenerating]  = useState(true);
  const [apiError,    setApiError]    = useState<string | null>(null);

  // Auto-run when in project context, passing the audit screens
  useEffect(() => {
    if (!routeProjectId) return;
    setGenerating(true);
    setReviewPhase("running");
    setApiError(null);
    runCopyReview(routeProjectId, passedFiles)
      .then(res => { setReviewData(res.copy_rich as ScreenCopyReview[]); setReviewPhase("results"); })
      .catch(err => {
        setApiError(err?.message ?? "Failed to load copy review. Make sure backend is running on http://localhost:8000");
        setReviewPhase("setup");
      })
      .finally(() => setGenerating(false));
  }, [routeProjectId]);

  const hasInput = files.length > 0;

  const handleRunReview = () => {
    if (routeProjectId) {
      const previewMap: Record<string, string> = {};
      files.forEach(f => { previewMap[f.name.replace(/\.[^/.]+$/, "")] = URL.createObjectURL(f); });
      setPreviews(prev => { Object.values(prev).forEach(u => URL.revokeObjectURL(u)); return previewMap; });
      setGenerating(true);
      setReviewPhase("running");
      setApiError(null);
      runCopyReview(routeProjectId, files, true)
        .then(res => { setReviewData(res.copy_rich as ScreenCopyReview[]); setReviewPhase("results"); })
        .catch(err => { setApiError(err?.message ?? "Review failed"); setReviewPhase("setup"); })
        .finally(() => setGenerating(false));
    } else {
      setReviewPhase("running");
      setTimeout(() => setReviewPhase("results"), 2500);
    }
  };

  const handleProceed = () => {
    navigate(routeProjectId ? `/project/${routeProjectId}/phase/06` : "/dashboard");
  };

  const allItems     = getAllItems(reviewData);
  const highCount    = allItems.filter(i => i.severity === "High").length;
  const worstScreen  = reviewData.length ? reviewData.reduce((a, b) =>
    b.items.filter(i => i.severity === "High").length > a.items.filter(i => i.severity === "High").length ? b : a
  ) : null;

  if (generating && reviewPhase === "running") return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent animate-pulse" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Reviewing UX copy…</p>
            <p className="text-xs text-muted-foreground mt-1">Auditing copy across all screens for clarity and tone. 15–30 seconds.</p>
          </div>
          <div className="flex gap-1 mt-2">
            {[0,1,2].map(i => <div key={i} className="h-1.5 w-1.5 rounded-full bg-accent/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        </div>
      </div>
    </SidebarProvider>
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
            <nav className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Aether Platform</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="text-muted-foreground">Phase 05</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="font-semibold text-foreground">UX Copywriting</span>
            </nav>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => navigate(routeProjectId ? `/project/${routeProjectId}/phase/04` : "/dashboard")}
                className="h-8 rounded-lg text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back
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
                    <DropdownMenuItem onClick={() => exportFullExcel(reviewData)} className="text-xs gap-2">
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
                onClick={reviewPhase === "setup" ? handleRunReview : handleProceed}
                disabled={reviewPhase === "setup" && !hasInput}
                className={cn("h-8 rounded-lg text-xs gap-1.5",
                  reviewPhase === "results" || hasInput
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

                {/* ── No screens — must run Phase 04 first ── */}
                {reviewPhase === "setup" && (
                  <motion.div key="setup" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                    className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
                      <Upload className="h-7 w-7 text-muted-foreground" strokeWidth={1} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">Screens required from Phase 04</p>
                      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                        {apiError ?? "Upload your screens in the UX Audit step first. Copy review will use those exact screens automatically — no re-upload needed."}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs gap-1.5 mt-1"
                      onClick={() => navigate(routeProjectId ? `/project/${routeProjectId}/phase/04` : "/dashboard")}>
                      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Back to UX Audit
                    </Button>
                  </motion.div>
                )}

                {reviewPhase === "running" && (
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
                )}

                {reviewPhase === "results" && (
                  <motion.div key="results" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="space-y-5">

                    {/* Intelligence banner */}
                    <div className="rounded-2xl border border-violet-200/60 dark:border-violet-800/30 bg-violet-50/60 dark:bg-violet-950/20 px-5 py-4 flex items-start gap-3">
                      <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Review complete — {allItems.length} copy items analysed across {reviewData.length} screens</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Most impactful: <span className="font-medium text-foreground">{worstScreen.name}</span> — {worstScreen.items.filter(i => i.severity === "High").length} high-priority rewrites needed · Tone guide generated below
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setReviewPhase("setup")}
                        className="h-7 rounded-lg text-[11px] text-muted-foreground hover:text-foreground shrink-0">Re-run</Button>
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Copy Items",      value: allItems.length,        icon: FileText,      sub: `${reviewData.length} screens`       },
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
                    {reviewData.map(screen => (
                      <ScreenCopyCard key={screen.id} screen={screen} sevFilter={sevFilter} typeFilter={typeFilter} previewUrl={previews[screen.name]} />
                    ))}

                    {/* Empty filter state */}
                    {reviewData.every(s => {
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
                      <DropdownMenuItem onClick={() => exportFullExcel(reviewData)} className="text-xs gap-2">
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
                  <Button onClick={handleProceed}
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
