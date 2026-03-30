import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Pencil,
  Trash2,
  Merge,
  AlertTriangle,
  Lightbulb,
  Download,
  ChevronDown,
  ChevronRight,
  User,
  Target,
  Frown,
  Activity,
  Brain,
  Map,
  TrendingUp,
  Gauge,
  Sparkles,
  X,
  Shield,
  Smartphone,
  Monitor,
  TabletSmartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// --- Types ---
interface Persona {
  id: string;
  name: string;
  tag: "Primary" | "Secondary" | "Edge" | "Admin";
  archetype: string;
  status: "confirmed" | "review" | "low-confidence";
  confidence: number;
  identity: {
    role: string;
    context: string;
    accessLevel: string;
    device: string;
  };
  goals: {
    primary: string[];
    secondary: string[];
    emotional: string[];
  };
  painPoints: {
    functional: string[];
    emotional: string[];
    systemGaps: string[];
  };
  behavior: {
    frequency: string;
    techProficiency: string;
    decisionStyle: string;
    triggers: string[];
  };
  psychographics: {
    traits: string[];
    riskTolerance: string;
    trustFactors: string[];
    values: string[];
  };
  journey: {
    entryPoint: string;
    keyActions: string[];
    dropOffRisks: string[];
    successDefinition: string;
  };
  businessValue: {
    revenueImpact: string;
    retentionImportance: string;
    priorityScore: number;
  };
  missingData: string[];
  aiRecommendations: string[];
}

type SectionKey = "identity" | "goals" | "painPoints" | "behavior" | "psychographics" | "journey" | "businessValue" | "confidence";

// --- Stage Tracker (reused from intake) ---
const STAGES = [
  { label: "Upload", short: "Upload" },
  { label: "Design Intake", short: "Intake" },
  { label: "Screens", short: "Screens" },
  { label: "Prototype", short: "Prototype" },
  { label: "Audit", short: "Audit" },
  { label: "Copy", short: "Copy" },
  { label: "Docs", short: "Docs" },
];

function StageTracker({ current }: { current: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isActive = i === current;
          const isDone = i < current;
          const isLast = i === STAGES.length - 1;
          return (
            <div key={stage.label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 relative">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-all duration-300 shrink-0 ${
                    isDone ? "gradient-accent text-accent-foreground" : ""
                  } ${isActive ? "bg-accent/10 text-accent ring-2 ring-accent/25" : ""} ${
                    !isDone && !isActive ? "bg-secondary text-muted-foreground/50" : ""
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <span>{i + 1}</span>}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap transition-colors duration-300 ${
                    isActive ? "text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/40"
                  }`}
                >
                  {stage.short}
                </span>
              </div>
              {!isLast && (
                <div className="flex-1 h-px mx-1.5 mt-[-18px]">
                  <div className={`h-full w-full rounded-full transition-colors duration-500 ${isDone ? "bg-accent/40" : "bg-border"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Mock Data ---
const MOCK_PERSONAS: Persona[] = [
  {
    id: "p1",
    name: "Sarah Chen",
    tag: "Primary",
    archetype: "The Empowered Manager",
    status: "confirmed",
    confidence: 92,
    identity: {
      role: "Product Manager leading a cross-functional design team",
      context: "Uses the platform daily to manage design sprints and coordinate deliverables across teams",
      accessLevel: "Full",
      device: "Desktop",
    },
    goals: {
      primary: ["Streamline design-to-dev handoff", "Reduce review cycles by 40%", "Centralize all design assets"],
      secondary: ["Track team velocity", "Generate stakeholder reports"],
      emotional: ["Feel in control of project timelines", "Confidence in design quality", "Reduce anxiety around missed deadlines"],
    },
    painPoints: {
      functional: ["Scattered feedback across tools", "Manual status updates", "No single source of truth"],
      emotional: ["Frustration with misaligned expectations", "Overwhelm from context-switching"],
      systemGaps: ["No integrated design review workflow", "Lack of automated progress tracking"],
    },
    behavior: {
      frequency: "Daily (5-7x per week)",
      techProficiency: "Advanced",
      decisionStyle: "Data-driven, collaborative",
      triggers: ["New sprint planning", "Design review deadlines", "Stakeholder presentations"],
    },
    psychographics: {
      traits: ["Organized", "Detail-oriented", "Collaborative", "Results-focused"],
      riskTolerance: "Moderate — prefers proven solutions with measurable outcomes",
      trustFactors: ["Social proof from similar teams", "Clear ROI metrics", "Transparent pricing"],
      values: ["Efficiency", "Quality", "Team empowerment", "Transparency"],
    },
    journey: {
      entryPoint: "Team recommendation or G2 review",
      keyActions: ["Onboard team", "Set up first project", "Run design review", "Generate report"],
      dropOffRisks: ["Complex onboarding", "Lack of integrations", "Team adoption resistance"],
      successDefinition: "50% reduction in design review cycle time within first quarter",
    },
    businessValue: {
      revenueImpact: "High — drives team-level subscription",
      retentionImportance: "Critical — primary decision maker for renewal",
      priorityScore: 95,
    },
    missingData: [],
    aiRecommendations: ["Strong persona — consider as primary design target"],
  },
  {
    id: "p2",
    name: "Alex Rivera",
    tag: "Primary",
    archetype: "The Hands-On Designer",
    status: "review",
    confidence: 78,
    identity: {
      role: "Senior UX Designer responsible for end-to-end product design",
      context: "Works in design tools all day, needs seamless integration with workflow platform",
      accessLevel: "Full",
      device: "Desktop",
    },
    goals: {
      primary: ["Faster iteration cycles", "Better design feedback collection", "Automated documentation"],
      secondary: ["Portfolio building", "Skill development tracking"],
      emotional: ["Creative freedom without process overhead", "Recognition for design impact"],
    },
    painPoints: {
      functional: ["Too many tool switches", "Manual annotation work", "Inconsistent design tokens"],
      emotional: ["Burnout from repetitive tasks", "Feeling unheard in product decisions"],
      systemGaps: ["No AI-assisted design suggestions", "Missing version comparison"],
    },
    behavior: {
      frequency: "Daily (5-7x per week)",
      techProficiency: "Expert",
      decisionStyle: "Intuitive, craft-focused",
      triggers: ["New feature request", "Design system update", "User research findings"],
    },
    psychographics: {
      traits: ["Creative", "Perfectionist", "Independent", "Empathetic"],
      riskTolerance: "High — willing to try experimental tools",
      trustFactors: ["Design community endorsement", "Beautiful UI/UX", "Fast performance"],
      values: ["Craft quality", "User advocacy", "Innovation", "Autonomy"],
    },
    journey: {
      entryPoint: "Dribbble/Twitter discovery or team mandate",
      keyActions: ["Import design files", "Create personas", "Run UX audit", "Export documentation"],
      dropOffRisks: ["Slow performance", "Limited Figma integration", "Steep learning curve"],
      successDefinition: "Reduce documentation time by 60% while maintaining quality",
    },
    businessValue: {
      revenueImpact: "Medium — influences team tool adoption",
      retentionImportance: "High — daily active user driving engagement metrics",
      priorityScore: 88,
    },
    missingData: ["Emotional drivers need more depth", "Missing salary/budget context"],
    aiRecommendations: ["Add more emotional driver detail", "Consider merging with 'Junior Designer' if overlap found"],
  },
  {
    id: "p3",
    name: "Jordan Patel",
    tag: "Secondary",
    archetype: "The Strategic Stakeholder",
    status: "review",
    confidence: 65,
    identity: {
      role: "VP of Product overseeing multiple product lines",
      context: "Reviews design work monthly, needs high-level visibility without operational detail",
      accessLevel: "Limited",
      device: "Hybrid",
    },
    goals: {
      primary: ["Quick visibility into design progress", "Alignment between design and business goals", "ROI on design investment"],
      secondary: ["Competitive analysis", "Board-ready design metrics"],
      emotional: ["Confidence in design direction", "Trust in team capability"],
    },
    painPoints: {
      functional: ["Too much detail in reports", "No executive summary view", "Calendar overload for reviews"],
      emotional: ["Disconnect from design process", "Anxiety about design-market fit"],
      systemGaps: ["No executive dashboard", "Missing business impact metrics"],
    },
    behavior: {
      frequency: "Weekly (1-2x per week)",
      techProficiency: "Moderate",
      decisionStyle: "Strategic, ROI-driven",
      triggers: ["Board meetings", "Quarterly planning", "Product launches"],
    },
    psychographics: {
      traits: ["Strategic", "Time-constrained", "Results-oriented", "Decisive"],
      riskTolerance: "Low — needs proven ROI before commitment",
      trustFactors: ["Case studies from similar companies", "Enterprise security compliance", "Executive references"],
      values: ["Business impact", "Time efficiency", "Strategic alignment", "Accountability"],
    },
    journey: {
      entryPoint: "Team demo or vendor evaluation",
      keyActions: ["Review executive dashboard", "Approve design direction", "Share with board"],
      dropOffRisks: ["Too operational", "No clear ROI view", "Poor mobile experience"],
      successDefinition: "Clear design-to-business alignment visible in under 5 minutes",
    },
    businessValue: {
      revenueImpact: "High — controls budget allocation",
      retentionImportance: "Critical — executive sponsor for enterprise deals",
      priorityScore: 82,
    },
    missingData: ["Needs more behavioral data", "Missing competitive context"],
    aiRecommendations: ["Low confidence — needs more behavioral data", "Consider if this overlaps with 'C-Suite' persona"],
  },
  {
    id: "p4",
    name: "Morgan Kim",
    tag: "Edge",
    archetype: "The External Reviewer",
    status: "low-confidence",
    confidence: 42,
    identity: {
      role: "Freelance consultant brought in for design audits",
      context: "Temporary access for specific project phases, needs quick onboarding",
      accessLevel: "Delegated",
      device: "Mobile",
    },
    goals: {
      primary: ["Quickly understand project context", "Provide actionable feedback", "Export findings easily"],
      secondary: ["Build portfolio of client work"],
      emotional: ["Feel professional and efficient", "Make a strong impression"],
    },
    painPoints: {
      functional: ["Complex onboarding for short engagements", "Limited access to full context"],
      emotional: ["Feeling like an outsider", "Pressure to deliver quickly"],
      systemGaps: ["No guest reviewer mode", "Missing quick-start guide"],
    },
    behavior: {
      frequency: "Monthly (2-4x per month)",
      techProficiency: "Advanced",
      decisionStyle: "Expert-driven, independent",
      triggers: ["Client engagement start", "Audit milestone"],
    },
    psychographics: {
      traits: ["Independent", "Efficient", "Expert", "Adaptable"],
      riskTolerance: "Moderate",
      trustFactors: ["Quick value demonstration", "Professional UX", "Easy export"],
      values: ["Professionalism", "Speed", "Flexibility"],
    },
    journey: {
      entryPoint: "Client invitation link",
      keyActions: ["Accept invite", "Review designs", "Add annotations", "Export report"],
      dropOffRisks: ["Too much friction to start", "Limited permissions blocking work"],
      successDefinition: "Complete audit and deliver findings within one session",
    },
    businessValue: {
      revenueImpact: "Low — indirect influence",
      retentionImportance: "Low — temporary engagement",
      priorityScore: 35,
    },
    missingData: ["Needs full behavioral mapping", "Missing pain point validation", "No psychographic data validated"],
    aiRecommendations: [
      "Low confidence — significant data gaps",
      "Consider if this persona is needed for MVP",
      "Similar to 'Guest User' pattern — validate need",
    ],
  },
];

// --- AI Insight Item ---
function InsightItem({ icon: Icon, label, type }: { icon: React.ElementType; label: string; type: "warning" | "suggestion" | "info" }) {
  const colors = {
    warning: "text-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))]",
    suggestion: "text-accent bg-accent/10",
    info: "text-muted-foreground bg-secondary",
  };
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border/50">
      <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${colors[type]}`}>
        <Icon className="h-3 w-3" strokeWidth={1.5} />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{label}</p>
    </div>
  );
}

// --- Persona Section Accordion ---
function PersonaSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-sm font-medium text-foreground flex-1 text-left">{title}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Detail Row ---
function DetailRow({ label, value }: { label: string; value: string | string[] }) {
  return (
    <div className="py-2">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      {Array.isArray(value) ? (
        <ul className="space-y-1">
          {value.map((v, i) => (
            <li key={i} className="text-sm text-foreground flex items-start gap-2">
              <span className="h-1 w-1 rounded-full bg-accent/50 shrink-0 mt-2" />
              {v}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}

// --- Status Badge ---
function StatusBadge({ status }: { status: Persona["status"] }) {
  const config = {
    confirmed: { color: "bg-[hsl(var(--success))]", label: "Confirmed" },
    review: { color: "bg-[hsl(var(--warning))]", label: "Needs Review" },
    "low-confidence": { color: "bg-destructive", label: "Low Confidence" },
  };
  const c = config[status];
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-1.5 w-1.5 rounded-full ${c.color}`} />
      <span className="text-[10px] text-muted-foreground">{c.label}</span>
    </div>
  );
}

// --- Tag Badge ---
function TagBadge({ tag }: { tag: Persona["tag"] }) {
  const colors: Record<string, string> = {
    Primary: "bg-accent/10 text-accent border-accent/20",
    Secondary: "bg-secondary text-muted-foreground border-border",
    Edge: "bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
    Admin: "bg-secondary text-foreground border-border",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${colors[tag]}`}>
      {tag}
    </span>
  );
}

// --- Device Icon ---
function DeviceIcon({ device }: { device: string }) {
  if (device === "Mobile") return <Smartphone className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />;
  if (device === "Hybrid") return <TabletSmartphone className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />;
  return <Monitor className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />;
}

// --- Main Page ---
const PersonaStudio = () => {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const [personas, setPersonas] = useState<Persona[]>(MOCK_PERSONAS);
  const [selectedId, setSelectedId] = useState<string>(MOCK_PERSONAS[0].id);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(["identity", "goals"]));
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loadingPersonas, setLoadingPersonas] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoadingPersonas(true);
    supabase
      .from("personas")
      .select("*")
      .eq("project_id", projectId)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mapped: Persona[] = data.map((row) => ({
            ...MOCK_PERSONAS[0],
            id: row.id,
            name: row.name,
            confidence: row.confidence_score ?? 80,
            identity: {
              ...MOCK_PERSONAS[0].identity,
              role: row.role ?? "",
            },
            goals: {
              ...MOCK_PERSONAS[0].goals,
              primary: Array.isArray(row.goals) ? row.goals : [],
            },
            painPoints: {
              ...MOCK_PERSONAS[0].painPoints,
              functional: Array.isArray(row.pain_points) ? row.pain_points : [],
            },
            status: "review" as const,
          }));
          setPersonas(mapped);
          setSelectedId(mapped[0].id);
        }
        setLoadingPersonas(false);
      });
  }, [projectId]);

  const selected = personas.find((p) => p.id === selectedId) || personas[0];

  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleDelete = (id: string) => {
    const updated = personas.filter((p) => p.id !== id);
    setPersonas(updated);
    if (selectedId === id && updated.length > 0) setSelectedId(updated[0].id);
    setDeleteDialogId(null);
  };

  const handleConfirmPersonas = async () => {
    setShowConfirmDialog(false);
    if (projectId) {
      await supabase
        .from("projects")
        .update({ current_phase: 2, updated_at: new Date().toISOString() })
        .eq("id", projectId);
      navigate(`/project/${projectId}/phase/01/journey`);
    }
  };

  const allConfirmed = personas.every((p) => p.status === "confirmed");
  const reviewCount = personas.filter((p) => p.status === "review").length;
  const lowConfCount = personas.filter((p) => p.status === "low-confidence").length;

  // AI insights for right panel
  const insights: { icon: React.ElementType; label: string; type: "warning" | "suggestion" | "info" }[] = [];
  personas.forEach((p) => {
    if (p.missingData.length > 0) {
      insights.push({ icon: AlertTriangle, label: `${p.name}: ${p.missingData[0]}`, type: "warning" });
    }
    p.aiRecommendations.forEach((r) => {
      insights.push({ icon: Lightbulb, label: `${p.name}: ${r}`, type: "suggestion" });
    });
  });
  // Check for potential merges
  const primaryPersonas = personas.filter((p) => p.tag === "Primary");
  if (primaryPersonas.length > 2) {
    insights.push({ icon: Merge, label: `${primaryPersonas.length} primary personas detected — consider merging overlapping roles`, type: "suggestion" });
  }

  const clarityScore = Math.round(personas.reduce((sum, p) => sum + p.confidence, 0) / personas.length);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="h-14 flex items-center border-b border-border px-4 shrink-0 gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-5 w-px bg-border" />

            {/* Project Name */}
            <span className="text-sm font-medium text-foreground truncate">Aether Project</span>

            {/* PRD Clarity Score */}
            <div className="flex items-center gap-1.5 ml-3">
              <Gauge className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">PRD Clarity</span>
              <span className={`text-xs font-semibold ${clarityScore >= 80 ? "text-[hsl(var(--success))]" : clarityScore >= 60 ? "text-[hsl(var(--warning))]" : "text-destructive"}`}>
                {clarityScore}%
              </span>
            </div>

            <div className="flex-1" />

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem className="text-xs">Word (.docx)</DropdownMenuItem>
                <DropdownMenuItem className="text-xs">Excel (.xlsx)</DropdownMenuItem>
                <DropdownMenuItem className="text-xs">PDF (.pdf)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Confirm CTA */}
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={personas.length === 0}
              className="rounded-xl h-8 text-xs gradient-accent text-accent-foreground gap-1.5 hover:brightness-110 transition-all"
            >
              Confirm Personas
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </header>

          {/* Stage Tracker */}
          <div className="px-6 pt-4 pb-3 border-b border-border/50">
            <StageTracker current={1} />
          </div>

          {/* 3-Panel Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT PANEL — Persona List */}
            <div className="w-72 border-r border-border/50 flex flex-col shrink-0">
              <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personas</h2>
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{personas.length}</span>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-3 pb-3 space-y-1">
                  {personas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group ${
                        selectedId === p.id
                          ? "bg-accent/5 border border-accent/15"
                          : "hover:bg-secondary/50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
                          selectedId === p.id ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"
                        }`}>
                          {p.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{p.archetype}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <TagBadge tag={p.tag} />
                            <StatusBadge status={p.status} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Add Persona */}
              <div className="p-3 border-t border-border/50">
                <Button
                  variant="outline"
                  className="w-full h-9 rounded-xl text-xs gap-1.5 border-dashed border-border hover:border-accent/30 hover:bg-accent/[0.02]"
                  onClick={() => {
                    const newId = `p${Date.now()}`;
                    const newPersona: Persona = {
                      id: newId,
                      name: "New Persona",
                      tag: "Secondary",
                      archetype: "Untitled Archetype",
                      status: "review",
                      confidence: 30,
                      identity: { role: "", context: "", accessLevel: "Limited", device: "Desktop" },
                      goals: { primary: [], secondary: [], emotional: [] },
                      painPoints: { functional: [], emotional: [], systemGaps: [] },
                      behavior: { frequency: "", techProficiency: "", decisionStyle: "", triggers: [] },
                      psychographics: { traits: [], riskTolerance: "", trustFactors: [], values: [] },
                      journey: { entryPoint: "", keyActions: [], dropOffRisks: [], successDefinition: "" },
                      businessValue: { revenueImpact: "", retentionImportance: "", priorityScore: 0 },
                      missingData: ["All sections need data"],
                      aiRecommendations: ["Fill in persona details to improve confidence score"],
                    };
                    setPersonas((prev) => [...prev, newPersona]);
                    setSelectedId(newId);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Add Persona
                </Button>
              </div>
            </div>

            {/* CENTER PANEL — Persona Canvas */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="max-w-3xl mx-auto px-8 py-6">
                  {/* Persona Header */}
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center text-lg font-semibold text-accent shrink-0">
                        {selected.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 mb-1">
                          <h1 className="text-xl font-semibold text-foreground">{selected.name}</h1>
                          <TagBadge tag={selected.tag} />
                        </div>
                        <p className="text-sm text-muted-foreground">{selected.archetype}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <StatusBadge status={selected.status} />
                          <div className="flex items-center gap-1.5">
                            <DeviceIcon device={selected.identity.device} />
                            <span className="text-[11px] text-muted-foreground">{selected.identity.device}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                            <span className="text-[11px] text-muted-foreground">{selected.identity.accessLevel}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={selected.tag}
                        onValueChange={(v) => {
                          setPersonas((prev) =>
                            prev.map((p) => (p.id === selected.id ? { ...p, tag: v as Persona["tag"] } : p))
                          );
                        }}
                      >
                        <SelectTrigger className="h-7 w-auto rounded-lg text-[11px] border-border/50 px-2 gap-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Primary" className="text-xs">Primary</SelectItem>
                          <SelectItem value="Secondary" className="text-xs">Secondary</SelectItem>
                          <SelectItem value="Edge" className="text-xs">Edge</SelectItem>
                          <SelectItem value="Admin" className="text-xs">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => setDeleteDialogId(selected.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="mb-8 p-4 rounded-xl border border-border/50 bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Confidence Score</span>
                      <span className={`text-sm font-semibold ${
                        selected.confidence >= 80 ? "text-[hsl(var(--success))]" : selected.confidence >= 60 ? "text-[hsl(var(--warning))]" : "text-destructive"
                      }`}>
                        {selected.confidence}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          selected.confidence >= 80 ? "bg-[hsl(var(--success))]" : selected.confidence >= 60 ? "bg-[hsl(var(--warning))]" : "bg-destructive"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${selected.confidence}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    {selected.missingData.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Missing: {selected.missingData.join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* Accordion Sections */}
                  <div className="space-y-3">
                    <PersonaSection
                      title="Core Definition"
                      icon={User}
                      isOpen={openSections.has("identity")}
                      onToggle={() => toggleSection("identity")}
                    >
                      <div className="space-y-0 divide-y divide-border/30">
                        <DetailRow label="Role & Responsibilities" value={selected.identity.role} />
                        <DetailRow label="Context of Use" value={selected.identity.context} />
                        <DetailRow label="Access Level" value={selected.identity.accessLevel} />
                        <DetailRow label="Device Preference" value={selected.identity.device} />
                      </div>
                    </PersonaSection>

                    <PersonaSection
                      title="Goals & Motivations"
                      icon={Target}
                      isOpen={openSections.has("goals")}
                      onToggle={() => toggleSection("goals")}
                    >
                      <div className="space-y-0 divide-y divide-border/30">
                        <DetailRow label="Primary Goals" value={selected.goals.primary} />
                        <DetailRow label="Secondary Goals" value={selected.goals.secondary} />
                        <DetailRow label="Emotional Drivers" value={selected.goals.emotional} />
                      </div>
                    </PersonaSection>

                    <PersonaSection
                      title="Pain Points"
                      icon={Frown}
                      isOpen={openSections.has("painPoints")}
                      onToggle={() => toggleSection("painPoints")}
                    >
                      <div className="space-y-0 divide-y divide-border/30">
                        <DetailRow label="Functional Issues" value={selected.painPoints.functional} />
                        <DetailRow label="Emotional Frustrations" value={selected.painPoints.emotional} />
                        <DetailRow label="System Gaps" value={selected.painPoints.systemGaps} />
                      </div>
                    </PersonaSection>

                    <PersonaSection
                      title="Behavior & Patterns"
                      icon={Activity}
                      isOpen={openSections.has("behavior")}
                      onToggle={() => toggleSection("behavior")}
                    >
                      <div className="space-y-0 divide-y divide-border/30">
                        <DetailRow label="Usage Frequency" value={selected.behavior.frequency} />
                        <DetailRow label="Tech Proficiency" value={selected.behavior.techProficiency} />
                        <DetailRow label="Decision-Making Style" value={selected.behavior.decisionStyle} />
                        <DetailRow label="Triggers" value={selected.behavior.triggers} />
                      </div>
                    </PersonaSection>

                    <PersonaSection
                      title="Psychographics"
                      icon={Brain}
                      isOpen={openSections.has("psychographics")}
                      onToggle={() => toggleSection("psychographics")}
                    >
                      <div className="space-y-0 divide-y divide-border/30">
                        <DetailRow label="Personality Traits" value={selected.psychographics.traits} />
                        <DetailRow label="Risk Tolerance" value={selected.psychographics.riskTolerance} />
                        <DetailRow label="Trust Factors" value={selected.psychographics.trustFactors} />
                        <DetailRow label="Values" value={selected.psychographics.values} />
                      </div>
                    </PersonaSection>

                    <PersonaSection
                      title="Journey Snapshot"
                      icon={Map}
                      isOpen={openSections.has("journey")}
                      onToggle={() => toggleSection("journey")}
                    >
                      <div className="space-y-0 divide-y divide-border/30">
                        <DetailRow label="Entry Point" value={selected.journey.entryPoint} />
                        <DetailRow label="Key Actions" value={selected.journey.keyActions} />
                        <DetailRow label="Drop-off Risks" value={selected.journey.dropOffRisks} />
                        <DetailRow label="Success Definition" value={selected.journey.successDefinition} />
                      </div>
                    </PersonaSection>

                    <PersonaSection
                      title="Business Value"
                      icon={TrendingUp}
                      isOpen={openSections.has("businessValue")}
                      onToggle={() => toggleSection("businessValue")}
                    >
                      <div className="space-y-0 divide-y divide-border/30">
                        <DetailRow label="Revenue Impact" value={selected.businessValue.revenueImpact} />
                        <DetailRow label="Retention Importance" value={selected.businessValue.retentionImportance} />
                        <div className="py-2">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Priority Score</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full gradient-accent"
                                style={{ width: `${selected.businessValue.priorityScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-foreground">{selected.businessValue.priorityScore}</span>
                          </div>
                        </div>
                      </div>
                    </PersonaSection>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* RIGHT PANEL — AI Insights */}
            <div className="w-72 border-l border-border/50 flex flex-col shrink-0">
              <div className="px-4 pt-4 pb-3 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Insights</h2>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-3 pb-4 space-y-2">
                  {/* Summary */}
                  <div className="p-3 rounded-xl bg-accent/5 border border-accent/10 mb-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">{personas.length} personas</span> identified.{" "}
                      {reviewCount > 0 && <><span className="text-[hsl(var(--warning))] font-medium">{reviewCount} need review</span>. </>}
                      {lowConfCount > 0 && <><span className="text-destructive font-medium">{lowConfCount} low confidence</span>. </>}
                      {allConfirmed && <span className="text-[hsl(var(--success))] font-medium">All confirmed ✓</span>}
                    </p>
                  </div>

                  {insights.map((insight, i) => (
                    <InsightItem key={i} icon={insight.icon} label={insight.label} type={insight.type} />
                  ))}

                  {insights.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">No issues detected. All personas look good.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteDialogId} onOpenChange={() => setDeleteDialogId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this persona?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The persona and all its data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialogId && handleDelete(deleteDialogId)}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm all personas?</AlertDialogTitle>
            <AlertDialogDescription>
              {!allConfirmed
                ? `${reviewCount + lowConfCount} persona(s) still need review. Are you sure you want to proceed?`
                : "All personas are confirmed. Ready to proceed to Journey Mapping."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Review Again</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPersonas}
              className="rounded-xl gradient-accent text-accent-foreground hover:brightness-110"
            >
              Confirm & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default PersonaStudio;
