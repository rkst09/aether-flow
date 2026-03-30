export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  prd_url: string | null;
  prd_filename: string | null;
  status: "active" | "archived" | "completed";
  current_phase: number;
  tags: string[] | null;
  domain: string | null;
  product_type: string | null;
  market: string | null;
  created_at: string;
  updated_at: string;
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
  stages: Record<string, unknown> | null;
  created_at: string;
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

export interface AgentRun {
  id: string;
  project_id: string;
  phase: number;
  status: "pending" | "running" | "completed" | "failed";
  input_json: Record<string, unknown> | null;
  output_json: Record<string, unknown> | null;
  created_at: string;
}
