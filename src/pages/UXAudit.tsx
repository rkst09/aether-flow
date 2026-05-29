import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { confirmPhaseReview, runAudit, type RichScreenAudit } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronRight,
  Cpu, FileText, Brain, Upload, BookOpen, Search, Layers,
  Download, MousePointer, Zap, AlertCircle, Shield,
  X, AlertTriangle, CheckCircle2,
  FileSpreadsheet, GitBranch,
  Users, Monitor, BarChart3, Image as ImageIcon, ChevronRight as ChevronRightIcon,
  Sparkles, RefreshCw,
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
  screen, sevFilter, typeFilter, previewUrl,
}: {
  screen:      ScreenAudit;
  sevFilter:   SevFilter;
  typeFilter:  TypeFilter;
  previewUrl?: string;
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

  // Input state
  const [files,         setFiles]         = useState<File[]>([]);
  const [contextValue,  setContextValue]  = useState("");
  const [previews,      setPreviews]      = useState<Record<string, string>>({});

  // Audit state
  const [auditPhase,  setAuditPhase]  = useState<AuditPhase>("setup");
  const [sevFilter,   setSevFilter]   = useState<SevFilter>("all");
  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>("all");
  const [auditData,   setAuditData]   = useState<ScreenAudit[]>([]);
  const [apiError,    setApiError]    = useState<string | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  const hasInput = files.length > 0;

  useEffect(() => {
    return () => {
      Object.values(previews).forEach(URL.revokeObjectURL);
    };
  }, [previews]);

  useEffect(() => {
    if (!routeProjectId) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setAuditPhase("running");
    setApiError(null);
    runAudit(routeProjectId, [], "", "", false, controller.signal)
      .then(res => {
        if (controller.signal.aborted) return;
        if (res.audit_rich?.length) {
          setAuditData(res.audit_rich as ScreenAudit[]);
          setAuditPhase("results");
          return;
        }
        setAuditPhase("setup");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAuditPhase("setup");
        }
      });
    return () => controller.abort();
  }, [routeProjectId]);

  const cancelAuditRun = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setAuditPhase(auditData.length ? "results" : "setup");
    setApiError("Audit cancelled.");
  };

  const handleRunAudit = () => {
    if (!hasInput) return;
    // Build preview URLs before files are consumed by fetch
    const previewMap: Record<string, string> = {};
    files.forEach(f => {
      const name = f.name.replace(/\.[^/.]+$/, "");
      previewMap[name] = URL.createObjectURL(f);
    });
    setPreviews(prev => { Object.values(prev).forEach(u => URL.revokeObjectURL(u)); return previewMap; });
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setAuditPhase("running");
    setApiError(null);
    runAudit(routeProjectId ?? "", files, "", contextValue, false, controller.signal)
      .then(res => {
        if (controller.signal.aborted) return;
        setAuditData(res.audit_rich as ScreenAudit[]);
        setAuditPhase("results");
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setApiError(err?.message ?? "Audit failed.");
          setAuditPhase("setup");
        }
      });
  };

  const allIssues   = getAllIssues(auditData);
  const highCount   = allIssues.filter(i => i.severity === "High").length;
  const avgScore    = auditData.length ? Math.round(auditData.reduce((a, s) => a + s.score, 0) / auditData.length) : 0;
  const worstScreen = auditData.length ? auditData.reduce((a, b) => a.score < b.score ? a : b) : null;

  const handleProceed = async () => {
    if (!routeProjectId) {
      navigate("/dashboard");
      return;
    }

    try {
      setIsFinalizing(true);
      setFinalizeError(null);
      await confirmPhaseReview(routeProjectId, 4, {
        nextPhase: 5,
        summary: "UX audit reviewed and approved for copywriting.",
        metrics: {
          screen_count: auditData.length,
          issue_count: allIssues.length,
          high_severity_count: highCount,
          average_score: avgScore,
        },
      });
      navigate(`/project/${routeProjectId}/phase/05`, { state: { files } });
    } catch (error) {
      setFinalizeError(error instanceof Error ? error.message : "Unable to confirm the audit right now.");
    } finally {
      setIsFinalizing(false);
    }
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
            <nav className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Aether Platform</span>
              <ChevronRightIcon className="h-3 w-3 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="text-muted-foreground">Phase 04</span>
              <ChevronRightIcon className="h-3 w-3 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="font-semibold text-foreground">UX Audit</span>
            </nav>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => navigate(routeProjectId ? `/project/${routeProjectId}/phase/03` : "/dashboard")}
                className="h-8 rounded-lg text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Back
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
                    <DropdownMenuItem onClick={() => exportFullExcel(auditData)} className="text-xs gap-2">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
                      Full Audit — Excel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => exportSummaryPDF(auditData)} className="text-xs gap-2">
                      <FileText className="h-3.5 w-3.5 text-rose-500" strokeWidth={1.5} />
                      Summary Report — PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {auditPhase === "setup" && (
                <Button
                  size="sm"
                  onClick={handleRunAudit}
                  disabled={!hasInput}
                  className={cn(
                    "h-8 rounded-lg text-xs gap-1.5",
                    hasInput
                      ? "gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
                      : "opacity-40 cursor-not-allowed",
                  )}
                >
                  <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Analyze My Screens
                </Button>
              )}
              {auditPhase === "running" && (
                <Button variant="outline" size="sm" onClick={cancelAuditRun} className="h-8 rounded-lg text-xs gap-1.5">
                  Cancel Audit
                </Button>
              )}
              {auditPhase === "results" && (
                <Button
                  size="sm"
                  onClick={handleProceed}
                  disabled={isFinalizing}
                  className="h-8 rounded-lg text-xs gap-1.5 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
                >
                  {isFinalizing ? "Confirming..." : "Proceed to UX Copy"}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              )}
            </div>
          </header>

          {/* ── Stage Tracker ── */}
          <div className="border-b border-border/60 px-6 py-3 shrink-0">
            <StageTracker current={4} />
          </div>

          {/* ── Scrollable Content ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

              <AnimatePresence mode="wait">
                {auditPhase === "setup" && (
                  <motion.div key="setup" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">

                    {/* Hero context */}
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-foreground">Audit your product experience</h2>
                      <p className="text-xs text-muted-foreground">
                        Upload your screens or paste a product link. Aether will analyze usability, clarity, and interaction quality.
                      </p>
                    </div>

                    {/* Input method */}
                    <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
                      <div className="p-5 space-y-3">
                        <UploadZone files={files} onFiles={setFiles} />
                        <p className="text-[11px] text-muted-foreground text-center">
                          Upload the screens you want audited (PNG, JPG, PDF) · Aether analyzes only what you provide — no assumptions
                        </p>
                      </div>
                    </div>

                    {/* Optional context */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Describe your product <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <textarea
                        value={contextValue}
                        onChange={e => setContextValue(e.target.value)}
                        placeholder="E.g. B2B SaaS dashboard for finance teams — helps users manage invoices and track spend..."
                        rows={3}
                        className="w-full text-sm text-foreground placeholder:text-muted-foreground/50 bg-background border border-border/60 rounded-xl px-4 py-3 resize-none outline-none focus:border-foreground/30 transition-colors leading-relaxed"
                      />
                      <p className="text-[11px] text-muted-foreground">Helps Aether understand context and generate more accurate findings.</p>
                    </div>

                    {/* CTA */}
                    <Button
                      onClick={handleRunAudit}
                      disabled={!hasInput}
                      className={cn(
                        "w-full h-11 rounded-xl text-sm gap-2",
                        hasInput
                          ? "gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
                          : "opacity-40 cursor-not-allowed",
                      )}
                    >
                      <Search className="h-4 w-4" strokeWidth={1.5} />
                      Analyze My Screens
                    </Button>

                    <p className="text-center text-[11px] text-muted-foreground">
                      {hasInput
                        ? "Aether analyzes only what you provide — no assumptions"
                        : "Upload at least one screen or paste a product link to continue"
                      }
                    </p>

                    {apiError && (
                      <div className="flex items-start gap-2 rounded-xl border border-rose-200/60 bg-rose-50/60 dark:bg-rose-950/20 px-4 py-3">
                        <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" strokeWidth={1.5} />
                        <p className="text-xs text-rose-700 dark:text-rose-400">{apiError}</p>
                      </div>
                    )}

                  </motion.div>
                )}

                {auditPhase === "running" && (
                  <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center py-24 gap-5 text-muted-foreground">
                    <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
                      <Search className="h-7 w-7 text-foreground animate-pulse" strokeWidth={1} />
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">Analysing experience…</p>
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
                      <Button variant="outline" size="sm" onClick={cancelAuditRun} className="rounded-xl text-xs gap-1.5">
                        Cancel Audit
                      </Button>
                    </motion.div>
                  )}

                {auditPhase === "results" && (
                  <motion.div key="results" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>

                    {/* Intelligence banner */}
                    <div className="rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-950/20 px-5 py-4 flex items-start gap-3 mb-5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">Audit complete — {allIssues.length} issues found across {auditData.length} screens</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {worstScreen ? <>Critical focus: <span className="font-medium text-foreground">{worstScreen.name}</span> requires immediate attention (UX score: {worstScreen.score}/100) · </> : null}{highCount} high-severity issues need resolution before launch
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setAuditPhase("setup")}
                        className="h-7 rounded-lg text-[11px] text-muted-foreground hover:text-foreground shrink-0">
                        Re-run
                      </Button>
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                      {[
                        { label: "Total Issues",    value: allIssues.length, icon: AlertCircle, sub: `${auditData.length} screens`        },
                        { label: "High Severity",   value: highCount,        icon: AlertTriangle, sub: "require immediate fix", accent: true },
                        { label: "Screens Audited", value: auditData.length, icon: Monitor,      sub: "in this project"                    },
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
                      {auditData.map(screen => (
                        <ScreenAuditCard
                          key={screen.id}
                          screen={screen}
                          sevFilter={sevFilter}
                          typeFilter={typeFilter}
                          previewUrl={previews[screen.name]}
                        />
                      ))}
                      {auditData.every(s => {
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
	                  {finalizeError ? <p className="text-xs text-destructive">{finalizeError}</p> : null}
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
                      <DropdownMenuItem onClick={() => exportFullExcel(auditData)} className="text-xs gap-2">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.5} />
                        Full Audit — Excel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => exportSummaryPDF(auditData)} className="text-xs gap-2">
                        <FileText className="h-3.5 w-3.5 text-rose-500" strokeWidth={1.5} />
                        Summary Report — PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
	                  <Button
	                    onClick={handleProceed}
	                    disabled={isFinalizing}
	                    className="h-10 rounded-xl text-sm gap-1.5 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
	                  >
	                    {isFinalizing ? "Confirming..." : "Proceed to UX Copywriting"}
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
