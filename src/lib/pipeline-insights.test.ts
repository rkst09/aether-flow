import { describe, expect, it } from "vitest";

import {
  computeStageCoverage,
  deriveBacklogInsights,
  derivePersonaCatalog,
  deriveRelationFlowLanes,
} from "@/lib/pipeline-insights";

describe("pipeline insights", () => {
  it("derives backlog questions and clarity from real gaps", () => {
    const result = deriveBacklogInsights(
      [
        {
          id: "m1",
          name: "Onboarding",
          description: "",
          items: [
            {
              id: "i1",
              featureName: "Guided setup",
              personaIds: ["Sarah Chen"],
              journeyStage: "Onboarding",
              opportunityDirection: "",
              priority: "High",
              effort: "High",
              dependencies: [],
              edgeCases: [],
              warning: "The setup path is ambiguous for enterprise teams",
            },
          ],
        },
      ],
      [
        {
          db_id: "p1",
          name: "Sarah Chen",
          tag: "Primary",
          archetype: "",
          confidence: 90,
          identity: { role: "", context: "", accessLevel: "", device: "" },
          goals: { primary: [], secondary: [], emotional: [] },
          painPoints: { functional: ["Repeated setup"], emotional: [], systemGaps: [] },
          behavior: { frequency: "", techProficiency: "", decisionStyle: "", triggers: [] },
          psychographics: { traits: [], riskTolerance: "", trustFactors: [], values: [] },
          journey: { entryPoint: "", keyActions: [], dropOffRisks: [], successDefinition: "" },
          businessValue: { revenueImpact: "", retentionImportance: "", priorityScore: 0 },
          missingData: ["success metric"],
          aiRecommendations: ["Shorten the setup path for repeat teams."],
        },
      ],
      [],
    );

    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions.some(question => question.question.includes("success metric"))).toBe(true);
    expect(result.clarityScore).toBeLessThan(92);
    expect(result.personas[0].opportunity).toContain("Shorten");
  });

  it("derives relation lanes from real screen modules", () => {
    const lanes = deriveRelationFlowLanes([
      {
        id: "mod-1",
        name: "Core Workflow",
        screens: [
          { id: "s1", name: "Dashboard", personas: ["Sarah Chen"], journeyStage: "Discovery", backlogRef: "B1" },
          { id: "s2", name: "Project Detail", personas: ["Sarah Chen"], journeyStage: "Core Workflow", backlogRef: "B2" },
        ],
      },
    ]);

    expect(lanes).toHaveLength(1);
    expect(lanes[0].label).toBe("Core Workflow");
    expect(lanes[0].nodes.map(node => node.name)).toEqual(["Dashboard", "Project Detail"]);
  });

  it("computes coverage against the actual stage set", () => {
    const coverage = computeStageCoverage(
      ["Discovery", "Onboarding"],
      ["Discovery", "Onboarding", "Review"],
    );

    expect(coverage.found).toBe(2);
    expect(coverage.total).toBe(3);
    expect(coverage.percent).toBe(67);
  });

  it("builds a persona catalog from screen data when rich personas are unavailable", () => {
    const personas = derivePersonaCatalog([], ["Sarah Chen", "Alex Rivera", "Sarah Chen"]);
    expect(personas).toHaveLength(2);
    expect(personas[0].initials).toBe("SC");
    expect(personas[1].initials).toBe("AR");
  });
});
