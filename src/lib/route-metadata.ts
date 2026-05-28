export interface RouteMetadata {
  title: string;
  description: string;
}

const DEFAULT_META: RouteMetadata = {
  title: "Aether",
  description: "Aether turns PRDs into personas, journeys, screen systems, prototype prompts, audits, and handoff-ready documentation.",
};

const ROUTE_META: Array<{ pattern: RegExp; meta: RouteMetadata }> = [
  { pattern: /^\/$/, meta: { title: "Aether | Design Intelligence Pipeline", description: "Launch the Aether design pipeline and transform product requirements into a structured design system." } },
  { pattern: /^\/login\/?$/, meta: { title: "Login | Aether", description: "Sign in to your Aether workspace." } },
  { pattern: /^\/signup\/?$/, meta: { title: "Sign Up | Aether", description: "Create your Aether account and start building your product system." } },
  { pattern: /^\/reset-password\/?$/, meta: { title: "Reset Password | Aether", description: "Reset your Aether password and regain access to your workspace." } },
  { pattern: /^\/dashboard\/?$/, meta: { title: "Dashboard | Aether", description: "Resume active projects and launch pipeline tools from the Aether dashboard." } },
  { pattern: /^\/projects\/?$/, meta: { title: "Projects | Aether", description: "Browse, filter, and resume your Aether design projects." } },
  { pattern: /^\/project\/intake\/?$/, meta: { title: "Project Intake | Aether", description: "Create a new project and upload the PRD that powers the Aether pipeline." } },
  { pattern: /^\/project\/[^/]+\/?$/, meta: { title: "Project Overview | Aether", description: "Review project progress, generated artifacts, and the next recommended step." } },
  { pattern: /^\/project\/[^/]+\/phase\/01\/?$/, meta: { title: "Persona Studio | Aether", description: "Review, refine, and confirm the personas generated from your PRD." } },
  { pattern: /^\/project\/[^/]+\/phase\/01\/journey\/?$/, meta: { title: "Journey Mapping | Aether", description: "Map persona journeys, emotional friction, and opportunity areas." } },
  { pattern: /^\/project\/[^/]+\/phase\/01\/backlog\/?$/, meta: { title: "Design Backlog | Aether", description: "Turn personas and journeys into a structured, prioritized design backlog." } },
  { pattern: /^\/project\/[^/]+\/phase\/02\/?$/, meta: { title: "Screen Derivation | Aether", description: "Derive a production-ready screen inventory from the approved backlog." } },
  { pattern: /^\/project\/[^/]+\/phase\/03\/?$/, meta: { title: "Prototype Prompts | Aether", description: "Generate prototype prompts and product-system guidance for builders." } },
  { pattern: /^\/project\/[^/]+\/phase\/04\/?$/, meta: { title: "UX Audit | Aether", description: "Audit your product flows for usability, interaction, cognitive, and trust issues." } },
  { pattern: /^\/project\/[^/]+\/phase\/05\/?$/, meta: { title: "UX Copywriting | Aether", description: "Review and improve microcopy across screens for clarity, tone, and guidance." } },
  { pattern: /^\/project\/[^/]+\/phase\/06\/?$/, meta: { title: "Design Documentation | Aether", description: "Generate structured BA and engineering handoff documentation from the full pipeline." } },
  { pattern: /^\/tools\/ux-audit\/?$/, meta: { title: "UX Audit Tool | Aether", description: "Run the standalone UX Audit tool on uploaded screens or linked experiences." } },
  { pattern: /^\/tools\/ux-copywriting\/?$/, meta: { title: "UX Copywriting Tool | Aether", description: "Run the standalone UX Copywriting tool to improve product microcopy and tone." } },
];

export function getRouteMetadata(pathname: string): RouteMetadata {
  return ROUTE_META.find((route) => route.pattern.test(pathname))?.meta ?? DEFAULT_META;
}
