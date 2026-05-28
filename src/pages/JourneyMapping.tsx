import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { runPersonas, runJourney, saveJourneys, type RichPersona, type RichJourneyMap } from "@/lib/api";
import { useApiCall } from "@/hooks/useApiCall";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { PhaseErrorState } from "@/components/PhaseErrorState";
import { motion, AnimatePresence } from "framer-motion";
import { getPhaseErrorDetails } from "@/lib/request-errors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  Lightbulb,
  Pencil,
  X,
  Lock,
  Smile,
  Meh,
  Frown,
  Download,
  FileText,
  Target,
  Zap,
  Sparkles,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ImpactLevel = "High" | "Medium" | "Low";
type EffortLevel = "High" | "Medium" | "Low";

interface Opportunity {
  id: string;
  text: string;
  impact: ImpactLevel;
  effort: EffortLevel;
}

interface JourneyStage {
  id: string;
  title: string;
  emotionScore: number; // 1–5
  actions: string[];
  thoughts: string[];
  painPoints: string[];
  systemGaps: string[];
  opportunities: Opportunity[];
}

type JourneyExportFormat = "word" | "excel" | "pdf";

// ─── Emotion Config ─────────────────────────────────────────────────────────────

const EMOTION_CONFIG: Record<number, { label: string; icon: React.ElementType; color: string; bg: string; dotFill: string }> = {
  5: { label: "Delighted",   icon: Smile, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success-soft))]", dotFill: "hsl(152 60% 45%)" },
  4: { label: "Positive",    icon: Smile, color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success-soft))]", dotFill: "hsl(152 60% 45%)" },
  3: { label: "Neutral",     icon: Meh,   color: "text-amber-500",              bg: "bg-amber-50",                   dotFill: "hsl(38 92% 50%)"  },
  2: { label: "Frustrated",  icon: Frown, color: "text-destructive",            bg: "bg-destructive/[0.06]",         dotFill: "hsl(0 84% 60%)"   },
  1: { label: "Struggling",  icon: Frown, color: "text-destructive",            bg: "bg-destructive/[0.06]",         dotFill: "hsl(0 84% 60%)"   },
};

// ─── Persona selector item (derived from RichPersona) ──────────────────────────

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSafeFileName(value: string) {
  return String(value || "Journey_Map")
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "Journey_Map";
}

function getJourneyExportBaseName(projectName: string, personaName?: string) {
  return getSafeFileName(`${projectName || "Aether"}_${personaName || "Journey"}_Journey_Map`);
}

function buildJourneyExportHtml(stages: JourneyStage[], projectName: string, personaName?: string) {
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const avgEmotion = stages.length
    ? (stages.reduce((sum, stage) => sum + stage.emotionScore, 0) / stages.length).toFixed(1)
    : "0.0";

  const list = (items: string[]) =>
    items.length
      ? `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : `<p class="muted">No items captured</p>`;

  const opportunityList = (items: Opportunity[]) =>
    items.length
      ? `<ul>${items.map(item => `<li>${escapeHtml(item.text)} <span>Impact: ${escapeHtml(item.impact)} | Effort: ${escapeHtml(item.effort)}</span></li>`).join("")}</ul>`
      : `<p class="muted">No opportunities captured</p>`;

  const stageRows = stages.map((stage, index) => `
    <section class="stage">
      <h2>${index + 1}. ${escapeHtml(stage.title)}</h2>
      <p class="emotion">Emotion: ${stage.emotionScore}/5 (${escapeHtml(EMOTION_CONFIG[stage.emotionScore]?.label ?? "Neutral")})</p>
      <div class="grid">
        <div><h3>User Actions</h3>${list(stage.actions)}</div>
        <div><h3>Thoughts</h3>${list(stage.thoughts)}</div>
        <div><h3>Pain Points</h3>${list(stage.painPoints)}</div>
        <div><h3>System Gaps</h3>${list(stage.systemGaps)}</div>
      </div>
      <h3>Opportunities</h3>
      ${opportunityList(stage.opportunities)}
    </section>
  `).join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Aether Journey Map Export</title>
    <style>
      body{font-family:Segoe UI,Arial,sans-serif;color:#0f172a;padding:36px;font-size:13px;line-height:1.5}
      h1{font-size:22px;margin:0 0 4px}
      h2{font-size:16px;margin:0 0 6px}
      h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin:12px 0 6px}
      ul{margin:0;padding-left:18px}
      li{margin:3px 0}
      li span{color:#64748b;font-size:12px}
      .meta{color:#64748b;margin:0 0 24px}
      .summary{display:flex;gap:18px;margin:18px 0 24px;padding:12px 14px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px}
      .stage{border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:16px;break-inside:avoid}
      .emotion{color:#4f46e5;font-weight:600;margin:0 0 10px}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 24px}
      .muted{color:#94a3b8;margin:0}
      @media print{body{padding:20px}.stage{break-inside:avoid}.summary{display:block}}
    </style>
  </head>
  <body>
    <h1>${escapeHtml(projectName || "Aether")} - Journey Map</h1>
    <p class="meta">${escapeHtml(personaName || "Selected persona")} | ${today}</p>
    <div class="summary">
      <div><strong>${stages.length}</strong> stages</div>
      <div><strong>${avgEmotion}/5</strong> average emotion</div>
      <div><strong>${stages.filter(stage => stage.emotionScore <= 2).length}</strong> high-friction stages</div>
    </div>
    ${stageRows || `<p class="muted">No journey stages available.</p>`}
  </body>
</html>`;
}

function exportJourneyToWord(stages: JourneyStage[], projectName: string, personaName?: string) {
  downloadBlob(
    buildJourneyExportHtml(stages, projectName, personaName),
    `${getJourneyExportBaseName(projectName, personaName)}.doc`,
    "application/msword"
  );
}

function exportJourneyToExcel(stages: JourneyStage[], projectName: string, personaName?: string) {
  const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Project", "Persona", "Stage #", "Stage", "Emotion Score", "Emotion Label", "User Actions", "Thoughts", "Pain Points", "System Gaps", "Opportunities"],
    ...stages.map((stage, index) => [
      projectName,
      personaName ?? "Selected persona",
      index + 1,
      stage.title,
      stage.emotionScore,
      EMOTION_CONFIG[stage.emotionScore]?.label ?? "Neutral",
      stage.actions.join(" | "),
      stage.thoughts.join(" | "),
      stage.painPoints.join(" | "),
      stage.systemGaps.join(" | "),
      stage.opportunities.map(item => `${item.text} (Impact: ${item.impact}, Effort: ${item.effort})`).join(" | "),
    ]),
  ];

  const csv = `\uFEFF${rows.map(row => row.map(quote).join(",")).join("\r\n")}`;
  downloadBlob(csv, `${getJourneyExportBaseName(projectName, personaName)}.csv`, "text/csv;charset=utf-8;");
}

function exportJourneyToPdf(stages: JourneyStage[], projectName: string, personaName?: string) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return;
  printWindow.document.write(buildJourneyExportHtml(stages, projectName, personaName));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

const AVATAR_COLORS = [
  "gradient-accent text-white",
  "bg-violet-500 text-white",
  "bg-teal-500 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
];

interface PersonaItem {
  id: string;
  name: string;
  tag: string;
  initials: string;
  avatarClass: string;
}

function buildPersonaItems(richPersonas: RichPersona[]): PersonaItem[] {
  return richPersonas.map((p, i) => ({
    id: p.db_id,
    name: p.name,
    tag: p.tag ?? "Secondary",
    initials: p.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
    avatarClass: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}

function buildJourneyState(journeysRich: RichJourneyMap[]): Record<string, JourneyStage[]> {
  const result: Record<string, JourneyStage[]> = {};
  for (const jm of journeysRich) {
    if (!jm.persona_id) continue;
    result[jm.persona_id] = (jm.stages ?? []).map(s => ({
      id: s.id,
      title: s.title,
      emotionScore: s.emotionScore,
      actions: s.actions ?? [],
      thoughts: s.thoughts ?? [],
      painPoints: s.painPoints ?? [],
      systemGaps: s.systemGaps ?? [],
      opportunities: (s.opportunities ?? []).map(o => ({
        id: o.id,
        text: o.text,
        impact: o.impact as ImpactLevel,
        effort: o.effort as EffortLevel,
      })),
    }));
  }
  return result;
}

// ─── (no static mock journey data — all journeys come from the API) ─────────────


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
            i === current ? "bg-accent/10 text-accent"
              : i < current ? "text-muted-foreground"
              : "text-muted-foreground/35"
          )}>
            {i < current
              ? <Check className="h-2.5 w-2.5" strokeWidth={3} />
              : i === current
              ? <div className="h-1.5 w-1.5 rounded-full bg-accent" />
              : <Lock className="h-2.5 w-2.5" strokeWidth={2} />
            }
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

function EditableText({ value, onChange, className }: {
  value: string; onChange: (v: string) => void; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { onChange(draft.trim() || value); setEditing(false); };

  if (editing) return (
    <input
      autoFocus value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      className={cn("bg-accent/[0.05] border border-accent/20 rounded-md px-2 py-0.5 outline-none w-full focus:border-accent/40 transition-colors text-sm", className)}
    />
  );

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn("cursor-text group inline-flex items-baseline gap-1 hover:bg-secondary/60 rounded px-1 -mx-1 transition-colors", className)}
    >
      <span>{value}</span>
      <Pencil className="h-2.5 w-2.5 text-transparent group-hover:text-muted-foreground/35 transition-colors shrink-0 self-center" strokeWidth={1.5} />
    </span>
  );
}

// ─── Inline Editable List ───────────────────────────────────────────────────────

function EditableList({ items, onChange, placeholder = "Add…" }: {
  items: string[]; onChange: (items: string[]) => void; placeholder?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");
  const addItem = () => { if (newItem.trim()) onChange([...items, newItem.trim()]); setNewItem(""); setAdding(false); };

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="group flex items-start gap-1.5">
          <div className="h-1 w-1 rounded-full bg-muted-foreground/40 mt-[7px] shrink-0" />
          <div className="flex-1 min-w-0">
            <EditableText value={item} onChange={v => { const n = [...items]; n[i] = v; onChange(n); }} className="text-xs text-foreground" />
          </div>
          <button onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="opacity-0 group-hover:opacity-100 h-4 w-4 rounded hover:bg-destructive/10 flex items-center justify-center transition-opacity shrink-0 mt-0.5">
            <X className="h-2.5 w-2.5 text-muted-foreground/50" strokeWidth={2} />
          </button>
        </div>
      ))}
      {adding
        ? <div className="pl-2.5">
            <input autoFocus value={newItem} onChange={e => setNewItem(e.target.value)}
              onBlur={addItem}
              onKeyDown={e => { if (e.key === "Enter") addItem(); if (e.key === "Escape") { setNewItem(""); setAdding(false); } }}
              placeholder={placeholder}
              className="w-full bg-accent/[0.05] border border-accent/20 rounded-md px-2 py-0.5 text-xs outline-none focus:border-accent/40 transition-colors" />
          </div>
        : <button onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-accent transition-colors pl-2.5">
            <Plus className="h-2.5 w-2.5" strokeWidth={2} /> Add
          </button>
      }
    </div>
  );
}

// ─── Impact / Effort Badges (click-to-cycle) ───────────────────────────────────

const IMPACT_CYCLE: ImpactLevel[] = ["High", "Medium", "Low"];
const EFFORT_CYCLE: EffortLevel[] = ["High", "Medium", "Low"];

const IMPACT_STYLE: Record<ImpactLevel, string> = {
  High:   "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]",
  Medium: "bg-amber-50 text-amber-600",
  Low:    "bg-secondary text-muted-foreground",
};
const EFFORT_STYLE: Record<EffortLevel, string> = {
  High:   "bg-destructive/[0.07] text-destructive",
  Medium: "bg-amber-50 text-amber-600",
  Low:    "bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]",
};

function CycleBadge({ value, styles, cycle, onChange, prefix }: {
  value: string; styles: Record<string, string>; cycle: string[];
  onChange: (v: string) => void; prefix: string;
}) {
  return (
    <button
      onClick={() => { const i = cycle.indexOf(value); onChange(cycle[(i + 1) % cycle.length]); }}
      title={`${prefix}: click to change`}
      className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full transition-colors cursor-pointer hover:opacity-80", styles[value])}
    >
      {prefix} {value}
    </button>
  );
}

// ─── Emotion Selector ───────────────────────────────────────────────────────────

function EmotionSelector({ score, onChange }: { score: number; onChange: (s: number) => void }) {
  const cfg = EMOTION_CONFIG[score] ?? EMOTION_CONFIG[3];
  const Icon = cfg.icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors hover:opacity-80 w-full",
          cfg.bg
        )}>
          <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} strokeWidth={1.5} />
          <span className={cn("text-[11px] font-medium flex-1 text-left", cfg.color)}>{cfg.label}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-xl min-w-[140px]">
        {[5, 4, 3, 2, 1].map(s => {
          const c = EMOTION_CONFIG[s];
          const I = c.icon;
          return (
            <DropdownMenuItem key={s} onClick={() => onChange(s)}
              className={cn("text-sm gap-2 cursor-pointer", score === s && "font-medium")}>
              <I className={cn("h-3.5 w-3.5", c.color)} strokeWidth={1.5} />
              {c.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Emotion Graph ──────────────────────────────────────────────────────────────

interface EmotionChartPayload {
  name: string;
  score: number;
}

interface EmotionTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: EmotionChartPayload }>;
}

interface EmotionDotProps {
  cx?: number;
  cy?: number;
  payload: EmotionChartPayload;
}

function EmotionTooltip({ active, payload }: EmotionTooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, score } = payload[0]?.payload ?? {};
  const cfg = EMOTION_CONFIG[score] ?? EMOTION_CONFIG[3];
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-elevated text-xs pointer-events-none">
      <p className="font-semibold text-foreground mb-0.5">{name}</p>
      <p className={cfg.color}>{cfg.label}</p>
    </div>
  );
}

function EmotionGraph({ stages }: { stages: JourneyStage[] }) {
  const data = stages.map(s => ({ name: s.title, score: s.emotionScore }));

  const renderDot = (props: EmotionDotProps) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const fill = EMOTION_CONFIG[payload.score]?.dotFill ?? "hsl(220 70% 55%)";
    return <circle key={`dot-${payload.name}`} cx={cx} cy={cy} r={4} fill={fill} stroke="white" strokeWidth={2} />;
  };

  const renderActiveDot = (props: EmotionDotProps) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const fill = EMOTION_CONFIG[payload.score]?.dotFill ?? "hsl(220 70% 55%)";
    return <circle key={`adot-${payload.name}`} cx={cx} cy={cy} r={6} fill={fill} stroke="white" strokeWidth={2} />;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 24, left: 24, bottom: 0 }}>
        <defs>
          <linearGradient id="emotionAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="hsl(220 70% 55%)" stopOpacity={0.12} />
            <stop offset="100%" stopColor="hsl(220 70% 55%)" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 9, fill: "hsl(240 4% 55%)" }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <RechartsTooltip content={<EmotionTooltip />} cursor={false} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="hsl(220 70% 55%)"
          strokeWidth={2}
          fill="url(#emotionAreaGrad)"
          dot={renderDot}
          activeDot={renderActiveDot}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Section Label ──────────────────────────────────────────────────────────────

function SectionLabel({ children, warning }: { children: React.ReactNode; warning?: boolean }) {
  return (
    <p className={cn(
      "text-[9px] font-bold uppercase tracking-widest mb-1.5",
      warning ? "text-amber-500" : "text-muted-foreground/45"
    )}>
      {children}
    </p>
  );
}

// ─── Journey Stage Card ─────────────────────────────────────────────────────────

const CARD_W = 256;

function JourneyStageCard({
  stage, index, total, onUpdate, onDelete, onDuplicate, onMoveLeft, onMoveRight,
}: {
  stage: JourneyStage;
  index: number;
  total: number;
  onUpdate: (s: JourneyStage) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const u = (patch: Partial<JourneyStage>) => onUpdate({ ...stage, ...patch });

  const updateOpportunity = (id: string, patch: Partial<Opportunity>) =>
    u({ opportunities: stage.opportunities.map(o => o.id === id ? { ...o, ...patch } : o) });

  const addOpportunity = () => u({
    opportunities: [...stage.opportunities, { id: Date.now().toString(), text: "Define the opportunity", impact: "Medium", effort: "Medium" }],
  });

  const hasMissingData = stage.painPoints.length === 0 || stage.thoughts.length === 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{ width: CARD_W, minWidth: CARD_W }}
      className="bg-card border border-border/60 rounded-2xl flex flex-col shadow-soft hover:shadow-elevated transition-shadow duration-200"
    >
      {/* ── Card Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-5 w-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
              {index + 1}
            </div>
            <EditableText
              value={stage.title}
              onChange={title => u({ title })}
              className="text-sm font-semibold text-foreground"
            />
          </div>
          {/* Stage controls */}
          <div className="flex items-center gap-0.5 shrink-0 ml-1">
            <button onClick={onMoveLeft} disabled={index === 0}
              className="h-5 w-5 rounded hover:bg-secondary flex items-center justify-center transition-colors disabled:opacity-25">
              <ChevronLeft className="h-3 w-3 text-muted-foreground/60" strokeWidth={2} />
            </button>
            <button onClick={onMoveRight} disabled={index === total - 1}
              className="h-5 w-5 rounded hover:bg-secondary flex items-center justify-center transition-colors disabled:opacity-25">
              <ChevronRight className="h-3 w-3 text-muted-foreground/60" strokeWidth={2} />
            </button>
            <button onClick={onDuplicate}
              className="h-5 w-5 rounded hover:bg-secondary flex items-center justify-center transition-colors">
              <Copy className="h-3 w-3 text-muted-foreground/60" strokeWidth={1.5} />
            </button>
            <button onClick={() => setDeleteConfirm(true)}
              className="h-5 w-5 rounded hover:bg-destructive/10 flex items-center justify-center transition-colors">
              <Trash2 className="h-3 w-3 text-muted-foreground/60 hover:text-destructive" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Inline missing-data hint */}
        {hasMissingData && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100/80 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" strokeWidth={1.5} />
            <span className="text-[10px] text-amber-600">Missing {stage.thoughts.length === 0 ? "thoughts" : "pain points"}</span>
          </div>
        )}
      </div>

      {/* ── Card Body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* User Actions */}
        <div>
          <SectionLabel>User Actions</SectionLabel>
          <EditableList items={stage.actions} onChange={actions => u({ actions })} placeholder="Add action…" />
        </div>

        {/* User Thoughts */}
        <div className="pt-3 border-t border-border/40">
          <SectionLabel warning={stage.thoughts.length === 0}>Thoughts</SectionLabel>
          {stage.thoughts.length === 0
            ? <p className="text-[10px] text-amber-500/70 italic">No thoughts added</p>
            : <EditableList items={stage.thoughts} onChange={thoughts => u({ thoughts })} placeholder="What are they thinking…" />
          }
          {stage.thoughts.length === 0 && (
            <button onClick={() => u({ thoughts: ["Add what the user is thinking at this stage"] })}
              className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-600 transition-colors mt-1 pl-2.5">
              <Plus className="h-2.5 w-2.5" strokeWidth={2} /> Add thought
            </button>
          )}
        </div>

        {/* Emotional State */}
        <div className="pt-3 border-t border-border/40">
          <SectionLabel>Emotional State</SectionLabel>
          <EmotionSelector score={stage.emotionScore} onChange={emotionScore => u({ emotionScore })} />
        </div>

        {/* Pain Points */}
        <div className="pt-3 border-t border-border/40">
          <SectionLabel warning={stage.painPoints.length === 0}>Pain Points</SectionLabel>
          {stage.painPoints.length === 0
            ? <p className="text-[10px] text-amber-500/70 italic">No pain points captured</p>
            : <EditableList items={stage.painPoints} onChange={painPoints => u({ painPoints })} placeholder="Add pain point…" />
          }
          {stage.painPoints.length === 0 && (
            <button onClick={() => u({ painPoints: ["Add a pain point for this stage"] })}
              className="flex items-center gap-1 text-[10px] text-amber-500 hover:text-amber-600 transition-colors mt-1 pl-2.5">
              <Plus className="h-2.5 w-2.5" strokeWidth={2} /> Add pain point
            </button>
          )}
        </div>

        {/* System Gaps */}
        <div className="pt-3 border-t border-border/40">
          <SectionLabel>System Gaps</SectionLabel>
          <EditableList items={stage.systemGaps} onChange={systemGaps => u({ systemGaps })} placeholder="Add system gap…" />
        </div>

        {/* Opportunities */}
        <div className="pt-3 border-t border-border/40">
          <SectionLabel>
            <span className="flex items-center gap-1">
              <Zap className="h-2.5 w-2.5 inline" strokeWidth={2} />
              Opportunities
            </span>
          </SectionLabel>
          <div className="space-y-2">
            {stage.opportunities.map(opp => (
              <div key={opp.id} className="group bg-accent/[0.04] border border-accent/10 rounded-xl p-2.5">
                <EditableText
                  value={opp.text}
                  onChange={text => updateOpportunity(opp.id, { text })}
                  className="text-[11px] text-foreground font-medium leading-snug"
                />
                <div className="flex items-center gap-1.5 mt-2 justify-between">
                  <div className="flex gap-1">
                    <CycleBadge
                      value={opp.impact} styles={IMPACT_STYLE} cycle={IMPACT_CYCLE}
                      onChange={impact => updateOpportunity(opp.id, { impact })} prefix="Impact"
                    />
                    <CycleBadge
                      value={opp.effort} styles={EFFORT_STYLE} cycle={EFFORT_CYCLE}
                      onChange={effort => updateOpportunity(opp.id, { effort })} prefix="Effort"
                    />
                  </div>
                  <button
                    onClick={() => u({ opportunities: stage.opportunities.filter(o => o.id !== opp.id) })}
                    className="opacity-0 group-hover:opacity-100 h-4 w-4 rounded hover:bg-destructive/10 flex items-center justify-center transition-opacity shrink-0"
                  >
                    <X className="h-2.5 w-2.5 text-muted-foreground/50" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addOpportunity}
              className="flex items-center gap-1 text-[10px] text-accent/60 hover:text-accent transition-colors pl-0.5">
              <Plus className="h-2.5 w-2.5" strokeWidth={2} /> Add opportunity
            </button>
          </div>
        </div>

      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete stage "{stage.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This stage will be permanently removed from the journey.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Stage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ─── Add Stage Card ─────────────────────────────────────────────────────────────

function AddStageCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      style={{ width: 140, minWidth: 140 }}
      className="border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground/40 hover:text-accent hover:border-accent/30 hover:bg-accent/[0.03] transition-all duration-200 self-start h-32"
    >
      <Plus className="h-5 w-5" strokeWidth={1.5} />
      <span className="text-xs font-medium">Add Stage</span>
    </button>
  );
}

// ─── Empty Journey State ────────────────────────────────────────────────────────

function EmptyJourney({ onGenerate, onAdd }: { onGenerate: () => void; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-8">
      <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <Target className="h-5 w-5 text-muted-foreground/50" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1.5">No journey generated yet</p>
      <p className="text-xs text-muted-foreground mb-6 max-w-[260px] leading-relaxed">
        Generate a journey map from the confirmed persona, or add stages manually.
      </p>
      <div className="flex items-center gap-2">
        <Button onClick={onGenerate} className="h-9 rounded-xl gradient-accent text-accent-foreground text-sm gap-1.5">
          <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.5} />
          Generate from Persona
        </Button>
        <Button variant="outline" onClick={onAdd} className="h-9 rounded-xl border-border/60 text-sm gap-1.5">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add Manually
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

const JourneyMapping = () => {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const [activePersonaId, setActivePersonaId] = useState("");
  const [journeys, setJourneys] = useState<Record<string, JourneyStage[]>>({});
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [richJourneys, setRichJourneys] = useState<RichJourneyMap[]>([]);
  const { run: runApiCall, cancel: cancelApiCall, loading: apiLoading, error: apiError } =
    useApiCall<[{ personas_rich: RichPersona[]; cached: boolean }, { journeys_rich: RichJourneyMap[]; cached: boolean }]>({ initialLoading: true });

  useEffect(() => {
    if (!projectId) return;
    runApiCall(signal => Promise.all([runPersonas(projectId, false, signal), runJourney(projectId, false, signal)]), {
      onSuccess: ([personasRes, journeyRes]) => {
        const items = buildPersonaItems(personasRes.personas_rich);
        setPersonas(items);
        if (items.length > 0) setActivePersonaId(items[0].id);
        setRichJourneys(journeyRes.journeys_rich);
        setJourneys(buildJourneyState(journeyRes.journeys_rich));
      },
    });
  }, [projectId, runApiCall]);

  const handleRegenerate = useCallback(() => {
    if (!projectId) return;
    runApiCall(signal => runJourney(projectId, true, signal), {
      onSuccess: res => { setRichJourneys(res.journeys_rich); setJourneys(buildJourneyState(res.journeys_rich)); },
    });
  }, [projectId, runApiCall]);

  const handleProceed = useCallback(async () => {
    if (!projectId) return;
    const updated = richJourneys.map(jm => ({ ...jm, stages: (journeys[jm.persona_id ?? ""] ?? jm.stages) as typeof jm.stages }));
    try { await saveJourneys(projectId, updated); } catch (e) { console.error("save journeys:", e); }
    navigate(`/project/${projectId}/phase/01/backlog`);
  }, [projectId, richJourneys, journeys, navigate]);

  const [projectName, setProjectName] = useState("Journey Mapping");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(projectName);

  const stages = journeys[activePersonaId] ?? [];
  const activePersona = personas.find(p => p.id === activePersonaId) ?? personas[0];

  // ── Mutations ──
  const setStages = (next: JourneyStage[]) =>
    setJourneys(prev => ({ ...prev, [activePersonaId]: next }));

  const updateStage = (id: string, patch: Partial<JourneyStage>) =>
    setStages(stages.map(s => s.id === id ? { ...s, ...patch } : s));

  const deleteStage = (id: string) => setStages(stages.filter(s => s.id !== id));

  const duplicateStage = (id: string) => {
    const src = stages.find(s => s.id === id);
    if (!src) return;
    const copy = { ...src, id: Date.now().toString(), title: `${src.title} (Copy)` };
    const idx = stages.findIndex(s => s.id === id);
    const next = [...stages]; next.splice(idx + 1, 0, copy);
    setStages(next);
  };

  const moveStage = (id: string, dir: -1 | 1) => {
    const idx = stages.findIndex(s => s.id === id);
    if (idx < 0) return;
    const next = [...stages];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setStages(next);
  };

  const addStage = () => setStages([...stages, {
    id: Date.now().toString(),
    title: "New Stage",
    emotionScore: 3,
    actions: ["Define user action"],
    thoughts: [],
    painPoints: [],
    systemGaps: [],
    opportunities: [],
  }]);

  const commitProjectName = () => { setProjectName(nameDraft.trim() || projectName); setEditingName(false); };

  const handleExport = (format: JourneyExportFormat) => {
    if (stages.length === 0) return;

    if (format === "word") {
      exportJourneyToWord(stages, projectName, activePersona?.name);
      return;
    }

    if (format === "excel") {
      exportJourneyToExcel(stages, projectName, activePersona?.name);
      return;
    }

    exportJourneyToPdf(stages, projectName, activePersona?.name);
  };

  const CANVAS_MIN_W = stages.length * (CARD_W + 12) + 180;
  const overallScore = stages.length
    ? (stages.reduce((sum, s) => sum + s.emotionScore, 0) / stages.length).toFixed(1)
    : "—";

  const highFrictionCount = stages.filter(s => s.emotionScore <= 2).length;

  if (apiLoading) return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent animate-pulse" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Building journey maps…</p>
            <p className="text-xs text-muted-foreground mt-1">Mapping flows for each persona. This takes 15–30 seconds.</p>
          </div>
          <div className="flex gap-1 mt-2">
            {[0,1,2].map(i => <div key={i} className="h-1.5 w-1.5 rounded-full bg-accent/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground mt-1" onClick={cancelApiCall}>
            Cancel
          </Button>
        </div>
      </div>
    </SidebarProvider>
  );

  if (apiError) return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <PhaseErrorState details={getPhaseErrorDetails("Journey generation", apiError)} onRetry={handleRegenerate} />
      </div>
    </SidebarProvider>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* ── System Header ── */}
          <header className="h-14 flex items-center border-b border-border px-6 gap-3 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
            <div className="h-4 w-px bg-border shrink-0" />

            {editingName ? (
              <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                onBlur={commitProjectName}
                onKeyDown={e => { if (e.key === "Enter") commitProjectName(); if (e.key === "Escape") { setNameDraft(projectName); setEditingName(false); } }}
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
            <span className="text-xs text-muted-foreground hidden md:block">— Journey Mapping</span>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--success-soft))] shrink-0 hidden lg:flex">
              <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
              <span className="text-[11px] font-semibold text-[hsl(var(--success))]">PRD Clarity 69%</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate(projectId ? `/project/${projectId}/phase/01` : "/dashboard")}
                className="h-8 rounded-lg text-xs gap-1.5 px-3 text-muted-foreground hover:text-foreground hidden sm:flex">
                <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
                Back to Persona Studio
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-8 rounded-lg text-xs gap-1.5 px-3 border-border/60 hidden sm:flex" disabled={stages.length === 0}>
                    <Download className="h-3 w-3" strokeWidth={1.5} />
                    Export
                    <ChevronDown className="h-3 w-3 opacity-40" strokeWidth={1.5} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl min-w-[160px]">
                  <DropdownMenuItem onClick={() => handleExport("word")} className="text-sm gap-2.5 cursor-pointer">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    Word (.doc)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")} className="text-sm gap-2.5 cursor-pointer">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    Excel (.csv)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")} className="text-sm gap-2.5 cursor-pointer">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    PDF (.pdf)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                disabled={stages.length === 0}
                onClick={handleProceed}
                className="h-8 rounded-lg text-xs gap-1.5 px-3 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
              >
                Proceed to Design Backlog
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </header>

          {/* ── Stage Tracker + Sub-step ── */}
          <div className="border-b border-border/60 px-6 py-3 space-y-3 shrink-0">
            <StageTracker current={1} />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <SubStepStepper current={1} />
              {stages.length > 0 && (
                <div className="flex items-center gap-3">
                  <p className="text-[11px] text-muted-foreground">
                    Avg emotion <span className="font-semibold text-foreground">{overallScore}/5</span>
                  </p>
                  {highFrictionCount > 0 && (
                    <p className="text-[11px] text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                      {highFrictionCount} high-friction stage{highFrictionCount > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Persona Selector ── */}
          <div className="border-b border-border/60 px-6 py-3 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {personas.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActivePersonaId(p.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl transition-all shrink-0 border",
                    activePersonaId === p.id
                      ? "bg-accent/[0.07] border-accent/20 shadow-soft"
                      : "border-transparent hover:bg-secondary/50"
                  )}
                >
                  <div className={cn("h-6 w-6 rounded-lg text-[10px] font-bold flex items-center justify-center shrink-0", p.avatarClass)}>
                    {p.initials}
                  </div>
                  <div className="text-left">
                    <p className={cn("text-[12px] font-medium leading-none", activePersonaId === p.id ? "text-foreground" : "text-foreground/70")}>
                      {p.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{p.tag}</p>
                  </div>
                  {activePersonaId === p.id && (
                    <div className="h-1.5 w-1.5 rounded-full bg-accent ml-1 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Journey Canvas ── */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {stages.length === 0 ? (
              <EmptyJourney onGenerate={handleRegenerate} onAdd={addStage} />
            ) : (
              <div className="flex-1 overflow-x-auto overflow-y-auto px-6 py-5">
                <div style={{ minWidth: CANVAS_MIN_W }}>

                  {/* Emotion Graph */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                        Emotional Journey — {activePersona.name}
                      </p>
                    </div>
                    <div style={{ height: 84 }}>
                      <EmotionGraph stages={stages} />
                    </div>
                  </div>

                  {/* Stage Cards */}
                  <AnimatePresence mode="popLayout">
                    <div className="flex items-start gap-3">
                      {stages.map((stage, i) => (
                        <JourneyStageCard
                          key={stage.id}
                          stage={stage}
                          index={i}
                          total={stages.length}
                          onUpdate={updated => updateStage(stage.id, updated)}
                          onDelete={() => deleteStage(stage.id)}
                          onDuplicate={() => duplicateStage(stage.id)}
                          onMoveLeft={() => moveStage(stage.id, -1)}
                          onMoveRight={() => moveStage(stage.id, 1)}
                        />
                      ))}
                      <AddStageCard onAdd={addStage} />
                    </div>
                  </AnimatePresence>

                </div>
              </div>
            )}

            {/* ── Bottom CTA ── */}
            <div className="border-t border-border bg-background/95 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  <span>{stages.length}</span> stages mapped · <span>{stages.reduce((n, s) => n + s.opportunities.length, 0)}</span> opportunities identified
                </p>
                {highFrictionCount > 0 && (
                  <p className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                    {highFrictionCount} high-friction stage{highFrictionCount > 1 ? "s" : ""} detected — review before proceeding
                  </p>
                )}
              </div>
              <Button
                disabled={stages.length === 0}
                onClick={handleProceed}
                className="h-10 rounded-xl text-sm gap-1.5 gradient-accent text-accent-foreground hover:brightness-110 shadow-soft"
              >
                Confirm Journey & Proceed to Design Backlog
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </div>

        </div>
      </div>
    </SidebarProvider>
  );
};

export default JourneyMapping;
