import type { RichJourneyMap, RichPersona } from "@/lib/api";

const PERSONA_STYLE_PALETTE = [
  "bg-violet-500/15 text-violet-700",
  "bg-blue-500/15 text-blue-700",
  "bg-amber-500/15 text-amber-700",
  "bg-rose-500/15 text-rose-700",
  "bg-teal-500/15 text-teal-700",
  "bg-emerald-500/15 text-emerald-700",
];

const LANE_STYLE_PALETTE = [
  {
    labelColor: "text-violet-600 dark:text-violet-400",
    nodeColor: "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30",
  },
  {
    labelColor: "text-blue-600 dark:text-blue-400",
    nodeColor: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30",
  },
  {
    labelColor: "text-emerald-600 dark:text-emerald-400",
    nodeColor: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    labelColor: "text-amber-600 dark:text-amber-400",
    nodeColor: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30",
  },
  {
    labelColor: "text-rose-600 dark:text-rose-400",
    nodeColor: "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30",
  },
  {
    labelColor: "text-slate-500 dark:text-slate-400",
    nodeColor: "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40",
  },
];

export type Priority = "High" | "Medium" | "Low";

export interface BacklogModuleInsight {
  id: string;
  name: string;
  description: string;
  items: Array<{
    id: string;
    featureName: string;
    personaIds: string[];
    journeyStage: string;
    opportunityDirection: string;
    priority: Priority;
    effort: "High" | "Medium" | "Low";
    dependencies: string[];
    edgeCases: string[];
    warning?: string;
  }>;
}

export interface PersonaContextCard {
  id: string;
  name: string;
  initials: string;
  cls: string;
  tag: string;
  painPoints: string[];
  opportunity: string;
}

export interface FlowStep {
  label: string;
  type: "entry" | "action" | "decision" | "outcome";
}

export interface DerivedUserFlow {
  id: string;
  name: string;
  persona: string;
  steps: FlowStep[];
}

export interface DerivedIANode {
  id: string;
  label: string;
  tag?: string;
  children?: DerivedIANode[];
}

export interface DerivedOpenQuestion {
  id: string;
  question: string;
  context: string;
  priority: Priority;
  resolved: boolean;
}

export interface ScreenModuleInsight {
  id: string;
  name: string;
  screens: Array<{
    id: string;
    name: string;
    personas: string[];
    journeyStage: string;
    backlogRef: string;
  }>;
}

export interface PersonaCatalogEntry {
  name: string;
  initials: string;
  color: string;
  tag: string;
}

export interface RelationLane {
  id: string;
  label: string;
  labelColor: string;
  nodeColor: string;
  nodeType: "entry" | "hub" | "flow" | "current" | "utility";
  nodes: Array<{ name: string }>;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function titleCaseFromModuleName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

export function deriveBacklogInsights(
  modules: BacklogModuleInsight[],
  personasRich: RichPersona[] = [],
  journeysRich: RichJourneyMap[] = [],
) {
  const personaNamesFromModules = dedupeStrings(modules.flatMap(module => module.items.flatMap(item => item.personaIds)));
  const personasSource = personasRich.length
    ? personasRich
    : personaNamesFromModules.map((name) => ({
        db_id: name,
        name,
        tag: "Primary" as const,
        archetype: "",
        confidence: 70,
        identity: { role: "", context: "", accessLevel: "", device: "" },
        goals: { primary: [], secondary: [], emotional: [] },
        painPoints: { functional: [], emotional: [], systemGaps: [] },
        behavior: { frequency: "", techProficiency: "", decisionStyle: "", triggers: [] },
        psychographics: { traits: [], riskTolerance: "", trustFactors: [], values: [] },
        journey: { entryPoint: "", keyActions: [], dropOffRisks: [], successDefinition: "" },
        businessValue: { revenueImpact: "", retentionImportance: "", priorityScore: 0 },
        missingData: [],
        aiRecommendations: [],
      }));

  const personas = personasSource.map((persona, index) => ({
    id: persona.db_id || persona.name || `persona-${index}`,
    name: persona.name,
    initials: initials(persona.name),
    cls: PERSONA_STYLE_PALETTE[index % PERSONA_STYLE_PALETTE.length],
    tag: persona.tag || "Persona",
    painPoints: dedupeStrings([
      ...persona.painPoints.functional.slice(0, 2),
      ...persona.painPoints.emotional.slice(0, 1),
    ]).slice(0, 3),
    opportunity:
      persona.aiRecommendations[0]
      || persona.painPoints.systemGaps[0]
      || `${persona.name} needs clearer workflow support through this phase.`,
  }));

  const flows: DerivedUserFlow[] = journeysRich.length
    ? journeysRich.map((journey, index) => ({
        id: journey.db_id || `flow-${index}`,
        name: `${journey.persona_name} Journey Flow`,
        persona: journey.persona_name,
        steps: journey.stages.map((stage, stageIndex) => ({
          label: stage.title,
          type:
            stageIndex === 0
              ? "entry"
              : stageIndex === journey.stages.length - 1
                ? "outcome"
                : stage.opportunities.length > 0
                  ? "decision"
                  : "action",
        })),
      }))
    : modules.slice(0, 3).map((module, index) => ({
        id: module.id,
        name: `${module.name} Delivery Flow`,
        persona: module.items[0]?.personaIds[0] || "Core user",
        steps: [
          { label: "Enters workflow", type: "entry" as const },
          ...module.items.slice(0, 4).map((item, itemIndex, arr) => ({
            label: item.featureName,
            type: itemIndex === arr.length - 1 ? "outcome" as const : "action" as const,
          })),
        ],
      }));

  const iaTree: DerivedIANode[] = modules.map((module) => ({
    id: module.id,
    label: titleCaseFromModuleName(module.name),
    tag: `${module.items.length} items`,
    children: module.items.slice(0, 6).map((item) => ({
      id: item.id,
      label: item.featureName,
      tag: item.journeyStage || item.priority,
    })),
  }));

  const derivedQuestions: DerivedOpenQuestion[] = [];
  const seenQuestions = new Set<string>();

  personasRich.forEach((persona) => {
    persona.missingData.forEach((gap, index) => {
      const question = `What should define ${persona.name}'s "${gap}" more precisely?`;
      if (seenQuestions.has(question)) return;
      seenQuestions.add(question);
      derivedQuestions.push({
        id: `pq-${persona.db_id}-${index}`,
        question,
        context: gap,
        priority: "High",
        resolved: false,
      });
    });
  });

  modules.forEach((module) => {
    module.items.forEach((item, index) => {
      if (item.warning) {
        const question = item.warning.endsWith("?") ? item.warning : `How should we resolve: ${item.warning}?`;
        if (!seenQuestions.has(question)) {
          seenQuestions.add(question);
          derivedQuestions.push({
            id: `w-${item.id}-${index}`,
            question,
            context: `${module.name} → ${item.featureName}`,
            priority: item.priority,
            resolved: false,
          });
        }
      }

      if (item.priority === "High" && item.effort === "High" && item.dependencies.length === 0) {
        const question = `What dependencies must be clarified before shipping "${item.featureName}"?`;
        if (!seenQuestions.has(question)) {
          seenQuestions.add(question);
          derivedQuestions.push({
            id: `d-${item.id}`,
            question,
            context: "High-priority, high-effort work without explicit dependencies increases delivery risk.",
            priority: "Medium",
            resolved: false,
          });
        }
      }

      if (item.edgeCases.length === 0) {
        const question = `Which edge cases should "${item.featureName}" handle before screen design starts?`;
        if (!seenQuestions.has(question)) {
          seenQuestions.add(question);
          derivedQuestions.push({
            id: `e-${item.id}`,
            question,
            context: `${item.featureName} currently has no explicit edge-case coverage.`,
            priority: item.priority === "High" ? "High" : "Low",
            resolved: false,
          });
        }
      }
    });
  });

  const opportunityCount = journeysRich.reduce(
    (sum, journey) => sum + journey.stages.reduce((stageSum, stage) => stageSum + stage.opportunities.length, 0),
    0,
  );
  const warningCount = modules.reduce((sum, module) => sum + module.items.filter(item => item.warning).length, 0);
  const missingDataCount = personasRich.reduce((sum, persona) => sum + persona.missingData.length, 0);
  const clarityScore = clamp(92 - missingDataCount * 6 - warningCount * 4, 48, 96);

  return {
    personas,
    flows,
    iaTree,
    questions: derivedQuestions.slice(0, 12),
    clarityScore,
    opportunityCount,
  };
}

export function derivePersonaCatalog(personasRich: RichPersona[] = [], screenPersonaNames: string[] = []) {
  const names = personasRich.length
    ? personasRich.map(persona => persona.name)
    : dedupeStrings(screenPersonaNames);

  return names.map((name, index) => ({
    name,
    initials: initials(name),
    color: PERSONA_STYLE_PALETTE[index % PERSONA_STYLE_PALETTE.length].split(" ")[0].replace("/15", ""),
    tag: personasRich[index]?.tag || "Persona",
  }));
}

export function deriveRelationFlowLanes(modules: ScreenModuleInsight[]): RelationLane[] {
  return modules.map((module, index) => {
    const style = LANE_STYLE_PALETTE[index % LANE_STYLE_PALETTE.length];
    const visibleScreens = module.screens.slice(0, 6).map(screen => ({ name: screen.name }));
    if (module.screens.length > 6) {
      visibleScreens.push({ name: `+${module.screens.length - 6} more` });
    }

    return {
      id: module.id,
      label: module.name,
      labelColor: style.labelColor,
      nodeColor: style.nodeColor,
      nodeType: index === 0 ? "entry" : index === modules.length - 1 ? "current" : "flow",
      nodes: visibleScreens,
    };
  });
}

export function computeStageCoverage(foundStages: string[], totalStages: string[]) {
  const found = dedupeStrings(foundStages).length;
  const total = Math.max(dedupeStrings(totalStages).length, found, 1);
  return {
    found,
    total,
    percent: Math.round((found / total) * 100),
  };
}
