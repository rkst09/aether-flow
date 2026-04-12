const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Phase 01 — Design Intake ──────────────────────────────────────────────────

export const runPersonas = (projectId: string, reRun = false) =>
  request<{ personas_rich: RichPersona[]; cached: boolean }>("/api/phase/01/personas", {
    project_id: projectId,
    re_run: reRun,
  });

export const savePersonas = (projectId: string, personasRich: RichPersona[]) =>
  request<{ saved: boolean }>("/api/phase/01/personas/save", {
    project_id: projectId,
    personas_rich: personasRich,
  });

export const runJourney = (projectId: string, reRun = false) =>
  request<{ journeys_rich: RichJourneyMap[]; cached: boolean }>("/api/phase/01/journey", {
    project_id: projectId,
    re_run: reRun,
  });

export const saveJourneys = (projectId: string, journeysRich: RichJourneyMap[]) =>
  request<{ saved: boolean }>("/api/phase/01/journey/save", {
    project_id: projectId,
    journeys_rich: journeysRich,
  });

export const runBacklog = (projectId: string, reRun = false) =>
  request<{ backlog_rich: RichBacklogModule[]; cached: boolean }>("/api/phase/01/backlog", {
    project_id: projectId,
    re_run: reRun,
  });

// ── Phase 02 — Screen Derivation ──────────────────────────────────────────────

export const runScreens = (projectId: string, reRun = false) =>
  request<{ screens_rich: RichScreenModule[]; cached: boolean }>("/api/phase/02/screens", {
    project_id: projectId,
    re_run: reRun,
  });

// ── Phase 03 — Prototype Prompts ──────────────────────────────────────────────

export const runPrompts = (projectId: string, reRun = false) =>
  request<{ prompts_rich: RichPersonaPrompt[]; system_prompt: RichSystemPrompt; cached: boolean }>("/api/phase/03/prompts", {
    project_id: projectId,
    re_run: reRun,
  });

// ── Phase 04 — UX Audit ───────────────────────────────────────────────────────

export const runAudit = (
  projectId: string,
  files: File[] = [],
  link: string = "",
  context: string = "",
  reRun = false,
): Promise<{ audit_rich: RichScreenAudit[]; cached: boolean }> => {
  const form = new FormData();
  form.append("project_id", projectId);
  files.forEach(f => form.append("screens", f));
  if (link) form.append("link", link);
  if (context) form.append("context", context);
  if (reRun) form.append("re_run", "true");
  return fetch(`${BASE_URL}/api/phase/04/audit`, { method: "POST", body: form })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
        throw new Error(detail || `Request failed: ${res.status}`);
      }
      return res.json();
    });
};

// ── Phase 05 — UX Copy Review ─────────────────────────────────────────────────

export const runCopyReview = (
  projectId: string,
  files: File[] = [],
  reRun = false,
): Promise<{ copy_rich: RichScreenCopyReview[]; cached: boolean }> => {
  const form = new FormData();
  form.append("project_id", projectId);
  files.forEach(f => form.append("screens", f));
  form.append("re_run", String(reRun));
  return fetch(`${BASE_URL}/api/phase/05/copy`, { method: "POST", body: form })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
        throw new Error(detail || `Request failed: ${res.status}`);
      }
      return res.json();
    });
};

// ── Phase 06 — Documentation ──────────────────────────────────────────────────

export const runDocs = (projectId: string, reRun = false) =>
  request<{ persona_docs: RichPersonaDoc[]; cached: boolean }>("/api/phase/06/docs", {
    project_id: projectId,
    re_run: reRun,
  });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RichPersona {
  db_id: string;
  name: string;
  tag: "Primary" | "Secondary" | "Edge" | "Admin";
  archetype: string;
  confidence: number;
  identity: {
    role: string;
    context: string;
    accessLevel: string;
    device: string;
  };
  goals: { primary: string[]; secondary: string[]; emotional: string[] };
  painPoints: { functional: string[]; emotional: string[]; systemGaps: string[] };
  behavior: { frequency: string; techProficiency: string; decisionStyle: string; triggers: string[] };
  psychographics: { traits: string[]; riskTolerance: string; trustFactors: string[]; values: string[] };
  journey: { entryPoint: string; keyActions: string[]; dropOffRisks: string[]; successDefinition: string };
  businessValue: { revenueImpact: string; retentionImportance: string; priorityScore: number };
  missingData: string[];
  aiRecommendations: string[];
}

export interface Persona {
  id: string;
  project_id: string;
  name: string;
  role: string | null;
  goals: string[] | null;
  pain_points: string[] | null;
  confidence_score: number | null;
  created_at: string;
}

export interface JourneyMap {
  id: string;
  project_id: string;
  persona_id: string | null;
  stages: RichJourneyStage[] | null;
  created_at: string;
}

export interface RichJourneyMap {
  db_id: string;
  persona_id: string | null;
  persona_name: string;
  stages: RichJourneyStage[];
}

export interface RichJourneyStage {
  id: string;
  title: string;
  emotionScore: number;
  actions: string[];
  thoughts: string[];
  painPoints: string[];
  systemGaps: string[];
  opportunities: { id: string; text: string; impact: "High" | "Medium" | "Low"; effort: "High" | "Medium" | "Low" }[];
}

export interface RichBacklogItem {
  id: string;
  featureName: string;
  problemStatement: string;
  personaNames: string[];
  journeyStage: string;
  opportunityDirection: string;
  priority: "High" | "Medium" | "Low";
  effort: "High" | "Medium" | "Low";
  impact: ("Retention" | "Conversion" | "Experience" | "Performance")[];
  dependencies: string[];
  edgeCases: string[];
  warning?: string | null;
}

export interface RichBacklogModule {
  id: string;
  name: string;
  description: string;
  items: RichBacklogItem[];
}

export interface BacklogItem {
  id: string;
  project_id: string;
  persona_id: string | null;
  task_name: string;
  priority: "high" | "medium" | "low" | null;
  type: "screen" | "flow" | "component" | null;
  sort_order: number;
  created_at: string;
}

export interface RichScreen {
  id: string;
  name: string;
  type: "Entry" | "Action" | "Detail" | "System" | "Feedback";
  personaNames: string[];
  purpose: string;
  journeyStage: string;
  backlogRef: string;
  entryPoints: string[];
  exitPoints: string[];
  componentHints: string[];
  states: ("Loading" | "Empty" | "Error" | "Success")[];
  complexity: "Simple" | "Medium" | "Complex";
  shared: boolean;
  warning?: string | null;
}

export interface RichScreenModule {
  id: string;
  name: string;
  screens: RichScreen[];
}

export interface Screen {
  id: string;
  project_id: string;
  persona_id: string | null;
  name: string;
  type: string | null;
  entry_points: string[] | null;
  exit_points: string[] | null;
  component_hints: string[] | null;
  sort_order: number;
  created_at: string;
}

export interface RichPromptSection {
  id: string;
  title: string;
  content: string;
  hint?: string;
}

export interface RichPersonaPrompt {
  id: string;
  name: string;
  role: string;
  tag: "Primary" | "Secondary" | "Edge";
  status: "generated" | "review";
  initial: string;
  quality: number;
  screensCount: number;
  sections: RichPromptSection[];
}

export interface RichSystemPromptSection {
  id: string;
  title: string;
  content: string;
}

export interface RichPersonaInfluence {
  name: string;
  role: string;
  tag: "Primary" | "Secondary" | "Edge";
  initial: string;
  keyGoal: string;
  behaviorTag: string;
  contributions: string[];
}

export interface RichSystemPrompt {
  quality: number;
  totalScreens: number;
  platform?: string;
  sections: RichSystemPromptSection[];
  personaInfluences: RichPersonaInfluence[];
}

export interface PromptGroup {
  persona_name: string;
  screen_name: string;
  screen_purpose: string;
  key_interactions: string[];
  ui_constraints: string[];
  component_suggestions: string[];
  prompt_text: string;
}

export interface RichAuditIssue {
  id: string;
  title: string;
  description: string;
  severity: "High" | "Medium" | "Low";
  recommendation: string;
}

export interface RichAuditCategory {
  type: "usability" | "cognitive" | "interaction" | "emotional" | "system";
  issues: RichAuditIssue[];
}

export interface RichScreenAudit {
  id: string;
  name: string;
  score: number;
  persona: string;
  categories: RichAuditCategory[];
}

export interface AuditFinding {
  title: string;
  description: string;
  screen_affected?: string;
  screens_affected?: string[];
  priority: "high" | "medium" | "low";
  heuristic?: string;
  wcag_criterion?: string;
  state_type?: string;
}

export interface AuditOutput {
  friction_points: AuditFinding[];
  accessibility_issues: AuditFinding[];
  missing_states: AuditFinding[];
  consistency_issues: AuditFinding[];
}

export interface RichCopyItem {
  id: string;
  copyType: "cta" | "error" | "empty" | "instructional" | "form" | "navigation" | "success";
  original: string;
  issue: string;
  issueType: "clarity" | "generic" | "guidance" | "tone" | "cognitive";
  severity: "High" | "Medium" | "Low";
  suggested: string;
  persona: string;
}

export interface RichScreenCopyReview {
  id: string;
  name: string;
  persona: string;
  items: RichCopyItem[];
}

export interface CopySuggestion {
  screen: string;
  category: "cta" | "error_message" | "empty_state" | "microcopy" | "tooltip" | "heading";
  original: string;
  suggested: string;
  rationale: string;
}

export interface RichDocElement { name: string; elType: string; function: string; conditions?: string; }
export interface RichDocInteraction { trigger: string; result: string; navigation?: string; }
export interface RichDocStateVar { state: string; description: string; }
export interface RichDocValidationRule { field: string; required: boolean; format?: string; constraints?: string; errorBehavior?: string; }
export interface RichDocCopyRef { text: string; kind: "static" | "dynamic"; purpose: string; }
export interface RichDocNavMap { entry: string[]; exit: string[]; conditional?: string[]; }
export interface RichScreenDoc {
  id: string; name: string; screenType: string; personas: string[]; purpose: string;
  elements: RichDocElement[]; interactions: RichDocInteraction[]; states: RichDocStateVar[];
  validation?: RichDocValidationRule[]; navigation: RichDocNavMap;
  edgeCases: string[]; copyRefs: RichDocCopyRef[]; dependencies: string[];
  flags?: string[]; completeness: number;
}
export interface RichModuleDoc { id: string; name: string; purpose: string; flows: string[]; screens: RichScreenDoc[]; }
export interface RichPersonaDoc { id: string; name: string; role: string; initial: string; context: string; goals: string[]; modules: RichModuleDoc[]; }

export interface DocScreen {
  name: string;
  type: string;
  persona: string;
  annotation: string;
  interaction_logic: string[];
  edge_cases: string[];
  validation_rules: string[];
  navigation_flows: string[];
}

export interface DocData {
  project_name: string;
  summary: string;
  screens: DocScreen[];
}
