import { API_BASE_URL, RAW_API_BASE_URL, getApiBaseCandidates, hasProductionApiMisconfiguration } from "@/lib/env";
import { captureClientError, captureClientWarning } from "@/lib/telemetry";
import { supabase } from "@/lib/supabase";

const BASE_URL = API_BASE_URL;
const API_BASE_CANDIDATES = getApiBaseCandidates(RAW_API_BASE_URL);
const inflightRequests = new Map<string, Promise<unknown>>();

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const TIMEOUT_MS = 120_000;

function createTimeoutSignal() {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(TIMEOUT_MS);
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, TIMEOUT_MS);

  controller.signal.addEventListener("abort", () => globalThis.clearTimeout(timeoutId), { once: true });
  return controller.signal;
}

function withTimeout(signal?: AbortSignal): AbortSignal {
  const timeout = createTimeoutSignal();
  if (!signal) return timeout;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  timeout.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

function buildRequestUrl(baseUrl: string, path: string) {
  return `${baseUrl}${path}`;
}

function isLocalApiCandidate(url: string) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

async function authorizedFetch(path: string, init: RequestInit = {}, signal?: AbortSignal) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers ?? {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestInit = {
    ...init,
    headers,
    signal: withTimeout(signal ?? (init.signal as AbortSignal | undefined)),
  };

  let lastNetworkError: unknown = null;

  for (const baseUrl of API_BASE_CANDIDATES) {
    try {
      return await fetch(buildRequestUrl(baseUrl, path), requestInit);
    } catch (error) {
      if (error instanceof TypeError) {
        lastNetworkError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastNetworkError ?? new TypeError("Failed to reach any configured API base URL.");
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

function dedupeRequest<T>(key: string, signal: AbortSignal | undefined, requestFactory: () => Promise<T>) {
  if (signal) {
    return requestFactory();
  }

  const existing = inflightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = requestFactory().finally(() => inflightRequests.delete(key));
  inflightRequests.set(key, pending);
  return pending;
}

function fileSignature(files: File[]) {
  return files
    .map(file => `${file.name}:${file.size}:${file.lastModified}`)
    .sort()
    .join("|");
}

function normalizeRequestError(error: unknown, path: string) {
  if (error instanceof Error) {
    if (
      error.message === "Missing authorization header" ||
      error.message === "Invalid authorization header" ||
      error.message === "Invalid or expired session" ||
      error.message === "Session expired"
    ) {
      return new Error("Your session expired. Sign in again, then retry this step.");
    }

    if (error.message.startsWith("Auth validation unavailable:")) {
      return new Error("Unable to validate your session with Supabase right now. Check backend/.env, confirm the API can reach Supabase, then restart the backend.");
    }

    if (error.message === "Project not found") {
      return new Error("This project could not be found for your account. Open it again from Projects, or sign in with the correct workspace account.");
    }
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new Error("Request cancelled.");
  }

  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new Error("Request timed out after 2 minutes. Please try again.");
  }

  if (error instanceof TypeError) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return new Error("You appear to be offline. Reconnect and try again.");
    }
    if (API_BASE_CANDIDATES.some(isLocalApiCandidate)) {
      return new Error(`Local backend is not reachable for ${path}. Start the API server and confirm http://127.0.0.1:8000/health returns ok.`);
    }
    return new Error(`Unable to reach the backend for ${path}. Check your API configuration and deployment URL.`);
  }

  return error instanceof Error ? error : new Error("Request failed");
}

async function runRequest<T>(path: string, requestFactory: () => Promise<T>) {
  try {
    if (hasProductionApiMisconfiguration(RAW_API_BASE_URL)) {
      captureClientWarning("Production API URL was configured with localhost. Falling back to same-origin requests.", {
        raw_api_url: RAW_API_BASE_URL,
      });
    }
    return await requestFactory();
  } catch (error) {
    const normalized = normalizeRequestError(error, path);
    if (normalized.message !== "Request cancelled.") {
      captureClientError(normalized.message, { path, api_base_url: BASE_URL });
    }
    throw normalized;
  }
}

async function request<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const requestKey = `json:${path}:${JSON.stringify(body ?? {})}`;
  return runRequest(path, () =>
    dedupeRequest(requestKey, signal, async () => {
      const res = await authorizedFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      }, signal);
      return parseResponse<T>(res);
    }),
  );
}

// ── Phase 01 — Design Intake ──────────────────────────────────────────────────

export const runPersonas = (projectId: string, reRun = false, signal?: AbortSignal) =>
  request<{ personas_rich: RichPersona[]; cached: boolean }>("/api/phase/01/personas", {
    project_id: projectId,
    re_run: reRun,
  }, signal);

export const savePersonas = (projectId: string, personasRich: RichPersona[]) =>
  request<{ saved: boolean }>("/api/phase/01/personas/save", {
    project_id: projectId,
    personas_rich: personasRich,
  });

export const runJourney = (projectId: string, reRun = false, signal?: AbortSignal) =>
  request<{ journeys_rich: RichJourneyMap[]; cached: boolean }>("/api/phase/01/journey", {
    project_id: projectId,
    re_run: reRun,
  }, signal);

export const saveJourneys = (projectId: string, journeysRich: RichJourneyMap[]) =>
  request<{ saved: boolean }>("/api/phase/01/journey/save", {
    project_id: projectId,
    journeys_rich: journeysRich,
  });

export const runBacklog = (projectId: string, reRun = false, signal?: AbortSignal) =>
  request<{ backlog_rich: RichBacklogModule[]; cached: boolean }>("/api/phase/01/backlog", {
    project_id: projectId,
    re_run: reRun,
  }, signal);

// ── Phase 02 — Screen Derivation ──────────────────────────────────────────────

export const runScreens = (projectId: string, reRun = false, signal?: AbortSignal) =>
  request<{ screens_rich: RichScreenModule[]; cached: boolean }>("/api/phase/02/screens", {
    project_id: projectId,
    re_run: reRun,
  }, signal);

// ── Phase 03 — Prototype Prompts ──────────────────────────────────────────────

export const runPrompts = (projectId: string, reRun = false, signal?: AbortSignal) =>
  request<{ prompts_rich: RichPersonaPrompt[]; system_prompt: RichSystemPrompt; cached: boolean }>("/api/phase/03/prompts", {
    project_id: projectId,
    re_run: reRun,
  }, signal);

// ── Phase 04 — UX Audit ───────────────────────────────────────────────────────

export const runAudit = (
  projectId: string,
  files: File[] = [],
  link: string = "",
  context: string = "",
  reRun = false,
  signal?: AbortSignal,
): Promise<{ audit_rich: RichScreenAudit[]; cached: boolean }> => {
  const form = new FormData();
  form.append("project_id", projectId);
  files.forEach(f => form.append("screens", f));
  if (link) form.append("link", link);
  if (context) form.append("context", context);
  if (reRun) form.append("re_run", "true");
  const requestKey = `form:/api/phase/04/audit:${projectId}:${fileSignature(files)}:${link}:${context}:${String(reRun)}`;
  return runRequest("/api/phase/04/audit", () =>
    dedupeRequest(requestKey, signal, () =>
      authorizedFetch("/api/phase/04/audit", { method: "POST", body: form }, signal).then(parseResponse),
    ),
  );
};

// ── Phase 05 — UX Copy Review ─────────────────────────────────────────────────

export const runCopyReview = (
  projectId: string,
  files: File[] = [],
  link: string = "",
  context: string = "",
  reRun = false,
  signal?: AbortSignal,
): Promise<{ copy_rich: RichScreenCopyReview[]; cached: boolean }> => {
  const form = new FormData();
  form.append("project_id", projectId);
  files.forEach(f => form.append("screens", f));
  if (link) form.append("link", link);
  if (context) form.append("context", context);
  form.append("re_run", String(reRun));
  const requestKey = `form:/api/phase/05/copy:${projectId}:${fileSignature(files)}:${link}:${context}:${String(reRun)}`;
  return runRequest("/api/phase/05/copy", () =>
    dedupeRequest(requestKey, signal, () =>
      authorizedFetch("/api/phase/05/copy", { method: "POST", body: form }, signal).then(parseResponse),
    ),
  );
};

// ── Phase 06 — Documentation ──────────────────────────────────────────────────

export const runDocs = (projectId: string, reRun = false, signal?: AbortSignal) =>
  request<{ persona_docs: RichPersonaDoc[]; cached: boolean }>("/api/phase/06/docs", {
    project_id: projectId,
    re_run: reRun,
  }, signal);

export type PhaseReviewStatus = "reviewed" | "handoff_ready";

export const confirmPhaseReview = (
  projectId: string,
  phase: number,
  options?: {
    nextPhase?: number;
    summary?: string;
    metrics?: Record<string, unknown>;
    status?: PhaseReviewStatus;
  },
) =>
  request<{ ok: boolean; phase: number; next_phase: number; status: PhaseReviewStatus }>("/api/phase/confirm", {
    project_id: projectId,
    phase,
    next_phase: options?.nextPhase,
    summary: options?.summary ?? "",
    metrics: options?.metrics ?? {},
    status: options?.status ?? "reviewed",
  });

export const downloadDocsExport = async (projectId: string) => {
  const res = await authorizedFetch(
    `/api/phase/06/docs/export?project_id=${encodeURIComponent(projectId)}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
    throw new Error(detail || `Request failed: ${res.status}`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || "Aether_Design_Documentation.docx";
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

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
