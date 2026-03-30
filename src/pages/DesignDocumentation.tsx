import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, FileText, ChevronDown,
  Layers, Monitor, GitBranch, MousePointer,
  AlertTriangle, CheckCircle2, Database, ToggleLeft, Type,
  Cpu, Brain, BookOpen, Search, Sparkles,
  FolderOpen, Eye, FileSpreadsheet, LayoutGrid,
  Users, Flag, CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocPhase = "preview" | "generating" | "complete";

interface DocElement    { name: string; elType: string; function: string; conditions?: string; }
interface Interaction   { trigger: string; result: string; navigation?: string; }
interface StateVar      { state: string; description: string; }
interface ValidationRule{ field: string; required: boolean; format?: string; constraints?: string; errorBehavior?: string; }
interface CopyRef       { text: string; kind: "static" | "dynamic"; purpose: string; }
interface NavMap        { entry: string[]; exit: string[]; conditional?: string[]; }

interface ScreenDoc {
  id: string; name: string; screenType: string; personas: string[]; purpose: string;
  elements: DocElement[]; interactions: Interaction[]; states: StateVar[];
  validation?: ValidationRule[]; navigation: NavMap;
  edgeCases: string[]; copyRefs: CopyRef[]; dependencies: string[];
  flags?: string[]; completeness: number;
}
interface ModuleDoc  { id: string; name: string; purpose: string; flows: string[]; screens: ScreenDoc[]; }
interface PersonaDoc { id: string; name: string; role: string; initial: string; context: string; goals: string[]; modules: ModuleDoc[]; }

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PROJECT = { name: "Design System Redesign", personas: 3, modules: 5, screens: 8, flows: 8, copyReviewed: 16, auditIssues: 24 };

const MOCK_DOC: PersonaDoc[] = [
  {
    id: "p1", name: "Sarah Chen", role: "Product Manager", initial: "SC",
    context: "Primary user managing daily product operations, roadmap tracking, and cross-functional alignment across a B2B SaaS platform.",
    goals: ["Track feature delivery in real time", "Align team around roadmap priorities", "Reduce overhead through async updates"],
    modules: [
      {
        id: "m1", name: "Dashboard & Analytics", purpose: "Central workspace for daily monitoring and reporting",
        flows: ["Login → Dashboard", "Dashboard → Analytics Detail", "Dashboard → Project Management"],
        screens: [
          {
            id: "s1", name: "Dashboard Overview", screenType: "Dashboard / Command Centre",
            personas: ["Sarah Chen"], completeness: 94,
            purpose: "Provides Sarah with a real-time snapshot of all active projects, pending actions, and key metrics.",
            elements: [
              { name: "Project Status Cards",  elType: "Card Grid",          function: "Shows project name, phase, completion %, last-updated", conditions: "Visible when ≥1 project exists" },
              { name: "Phase Progress Bar",    elType: "Progress Indicator", function: "Visualises pipeline progression per project card", conditions: "Always visible inside card" },
              { name: "Generate Report CTA",   elType: "Primary Button",     function: "Triggers report generation for selected project", conditions: "Enabled only when project is selected" },
              { name: "Recent Activity Feed",  elType: "List / Feed",        function: "Chronological changes without navigating to individual projects", conditions: "Shows last 10 entries" },
            ],
            interactions: [
              { trigger: "Click project card",      result: "Opens Project Detail",              navigation: "→ /project/:id"       },
              { trigger: "Click 'Generate Report'", result: "Initiates report; button loads",    navigation: "Stays on page"        },
              { trigger: "Click 'View all'",        result: "Expands activity feed",             navigation: "In-page expansion"    },
              { trigger: "Hover project card",      result: "Card elevates; quick actions appear", navigation: "No navigation"     },
            ],
            states: [
              { state: "Default",          description: "All project cards visible; Generate Report disabled" },
              { state: "Loading",          description: "Skeleton cards; activity feed shows placeholders" },
              { state: "Empty",            description: "'No projects yet — create your first' with CTA" },
              { state: "Error",            description: "'Couldn't load your projects — try again'" },
              { state: "Project Selected", description: "Selected card highlighted; Generate Report enabled" },
            ],
            navigation: {
              entry: ["Login success → redirect here", "Sidebar 'Dashboard' link"],
              exit:  ["Project card → /project/:id", "Sidebar navigation → any page"],
              conditional: ["No projects: prompt redirects to /project/intake after 3s"],
            },
            edgeCases: [
              "User has 0 projects → empty state with onboarding CTA",
              "User has >20 projects → paginate at 10 per page",
              "Report generation fails → inline error; auto-retry once",
              "Session expired during generation → auth prompt without losing context",
            ],
            copyRefs: [
              { text: "Generate Report",                                    kind: "static",  purpose: "Primary CTA" },
              { text: "No projects yet — create your first to get started", kind: "static",  purpose: "Empty state" },
              { text: "Generating…",                                        kind: "dynamic", purpose: "Loading CTA label" },
            ],
            dependencies: ["GET /api/projects", "GET /api/activity", "POST /api/reports/generate", "Supabase auth session"],
          },
          {
            id: "s2", name: "Analytics Detail", screenType: "Detail View / Dashboard",
            personas: ["Sarah Chen"], completeness: 78,
            flags: ["Missing validation rules", "No edge cases defined for empty chart state"],
            purpose: "Deep-dive metrics for a selected project: phase-level analytics and trend data.",
            elements: [
              { name: "Phase Completion Chart", elType: "Bar Chart",        function: "Shows completion % per phase", conditions: "Requires project selection" },
              { name: "Date Range Picker",      elType: "Date Input",       function: "Filters all chart data to a specific period" },
              { name: "Export Chart CTA",       elType: "Secondary Button", function: "Exports chart as PNG or CSV", conditions: "Enabled when data present" },
            ],
            interactions: [
              { trigger: "Select date range",  result: "All charts re-render for period",          navigation: "No navigation" },
              { trigger: "Click Export Chart", result: "Export format picker (PNG / CSV) appears", navigation: "No navigation" },
            ],
            states: [
              { state: "Default", description: "Charts populated with last 30 days of data" },
              { state: "Loading", description: "Charts show skeleton while data fetches" },
              { state: "Empty",   description: "'No data for this period' on each empty chart" },
              { state: "Error",   description: "Error banner with retry" },
            ],
            navigation: { entry: ["Dashboard → Analytics tab"], exit: ["Back → Dashboard", "Sidebar navigation"] },
            edgeCases: [],
            copyRefs: [{ text: "No data for this period", kind: "static", purpose: "Empty chart state" }],
            dependencies: ["GET /api/analytics/:projectId", "Supabase auth session"],
          },
        ],
      },
      {
        id: "m2", name: "Project Management", purpose: "End-to-end project creation and lifecycle management",
        flows: ["Dashboard → Project List", "Project List → Project Creation", "Project Creation → Intake"],
        screens: [
          {
            id: "s3", name: "Project Creation", screenType: "Multi-step Form",
            personas: ["Sarah Chen"], completeness: 71,
            flags: ["Missing validation rules"],
            purpose: "Guided form to create a new project, upload a PRD, and enter the Phase 01 pipeline.",
            elements: [
              { name: "Project Name Input", elType: "Text Input",     function: "Sets the project identifier used across all phases", conditions: "Required" },
              { name: "PRD Upload Zone",    elType: "File Drop Zone", function: "Uploads the PRD that drives all 6 phases", conditions: "Required" },
              { name: "Industry Selector",  elType: "Dropdown",       function: "Informs persona and copy tone defaults", conditions: "Optional; defaults to 'General'" },
              { name: "Start Pipeline CTA", elType: "Primary Button", function: "Submits project and enters Phase 01", conditions: "Enabled only when name + PRD provided" },
            ],
            interactions: [
              { trigger: "File dropped",           result: "Validated, previewed; CTA may enable",  navigation: "No navigation"       },
              { trigger: "Click 'Start Pipeline'", result: "Submits; transitions to Phase 01",      navigation: "→ /project/phase/01" },
              { trigger: "Invalid file type",      result: "Drop zone shows specific error message", navigation: "No navigation"       },
            ],
            states: [
              { state: "Default",          description: "Empty form; Start CTA disabled" },
              { state: "Partially Filled", description: "Name OR PRD provided but not both; CTA disabled" },
              { state: "Complete",         description: "Name + PRD provided; CTA enabled" },
              { state: "Loading",          description: "CTA loading; form inputs disabled" },
              { state: "Error",            description: "Inline errors on failed validation or submission" },
            ],
            validation: [
              { field: "Project Name", required: true,  format: "Text",              constraints: "1–120 characters; no special chars except hyphens", errorBehavior: "'Project name is required'" },
              { field: "PRD Upload",   required: true,  format: "PDF, DOCX, or DOC", constraints: "Max 25 MB; max 1 file",                              errorBehavior: "'Invalid file type' or 'File exceeds 25 MB'" },
              { field: "Industry",     required: false, format: "Dropdown selection", constraints: "One of predefined list",                             errorBehavior: "No error — defaults to 'General'" },
            ],
            navigation: {
              entry: ["Project List → 'New Project'", "Dashboard → 'Start New Project'"],
              exit:  ["Success → /project/phase/01", "Cancel → /projects"],
              conditional: ["Duplicate name → warn inline; still allow creation", "Upload failure → stay; show retry"],
            },
            edgeCases: [
              "Duplicate project name → warning; still allow creation",
              "Upload interrupted → retry option",
              "Navigate away mid-form → 'Unsaved changes — leave?' confirm",
              "Password-protected PDF → specific error message",
            ],
            copyRefs: [
              { text: "Start Pipeline",                                  kind: "static",  purpose: "Primary CTA" },
              { text: "Drop your PRD here, or click to browse",          kind: "static",  purpose: "Upload zone instruction" },
              { text: "Invalid file type — upload a PDF, DOCX, or DOC", kind: "static",  purpose: "Validation error" },
            ],
            dependencies: ["POST /api/projects", "POST /api/upload/prd", "Supabase auth session", "Client-side file validation"],
          },
        ],
      },
    ],
  },
  {
    id: "p2", name: "Marcus Webb", role: "Enterprise Admin", initial: "MW",
    context: "Manages user accounts, permissions, and platform configuration across a large enterprise deployment.",
    goals: ["Control user access and roles across departments", "Configure platform for compliance", "Audit system activity"],
    modules: [
      {
        id: "m3", name: "User Management", purpose: "Create, manage, and audit user accounts and role assignments",
        flows: ["Settings → User Management", "User Management → Role Configuration"],
        screens: [
          {
            id: "s4", name: "User Directory", screenType: "List / Data Table",
            personas: ["Marcus Webb"], completeness: 84,
            purpose: "Browse, search, filter, and manage all user accounts in the workspace.",
            elements: [
              { name: "User Table",      elType: "Data Table",      function: "Primary interface for all user records", conditions: "Paginated at 25 rows" },
              { name: "Invite User CTA", elType: "Primary Button",  function: "Opens user invitation modal", conditions: "Always enabled for admin" },
              { name: "Role Filter",     elType: "Dropdown Filter", function: "Narrows list to specific role groups" },
              { name: "Bulk Action Bar", elType: "Action Bar",      function: "Bulk role change, deactivation, or export", conditions: "Hidden; appears on row selection" },
            ],
            interactions: [
              { trigger: "Click user row",      result: "Opens user detail side panel", navigation: "Side panel overlay" },
              { trigger: "Click 'Invite User'", result: "Opens invitation modal",       navigation: "Modal overlay"     },
              { trigger: "Select rows",         result: "Bulk action bar appears",      navigation: "No navigation"     },
            ],
            states: [
              { state: "Default",          description: "Table populated; no rows selected" },
              { state: "Loading",          description: "Table rows show skeleton placeholders" },
              { state: "Empty",            description: "'No users yet — invite your first team member'" },
              { state: "Selection Active", description: "Bulk action bar visible; selected rows highlighted" },
            ],
            navigation: { entry: ["Settings → User Management tab"], exit: ["User row → side panel", "Roles → /admin/roles"] },
            edgeCases: [
              "0 users → empty state with invite CTA",
              "Deactivate own account → block: 'You cannot deactivate your own account'",
              "Bulk deactivate all admins → block with warning dialog",
            ],
            copyRefs: [
              { text: "Invite User",                                   kind: "static", purpose: "Primary CTA" },
              { text: "No users yet — invite your first team member",  kind: "static", purpose: "Empty state" },
            ],
            dependencies: ["GET /api/admin/users", "POST /api/admin/invite", "Admin role permission required"],
          },
          {
            id: "s5", name: "Role Configuration", screenType: "Settings / Permission Matrix",
            personas: ["Marcus Webb"], completeness: 65,
            flags: ["Incomplete state variations", "No edge cases defined"],
            purpose: "Define and assign permission sets to user roles across the platform.",
            elements: [
              { name: "Role List",         elType: "Sidebar List",       function: "Navigation between role definitions" },
              { name: "Permission Matrix", elType: "Toggle Grid / Table",function: "Granular per-permission toggles per role", conditions: "Populated when a role is selected" },
              { name: "Save Role CTA",     elType: "Primary Button",     function: "Persists role permission changes", conditions: "Enabled only when unsaved changes exist" },
            ],
            interactions: [
              { trigger: "Click role",        result: "Matrix updates to show selected role", navigation: "No navigation" },
              { trigger: "Toggle permission", result: "Permission updates; Save CTA enables",  navigation: "No navigation" },
              { trigger: "Click 'Save Role'", result: "Changes persisted",                    navigation: "No navigation" },
            ],
            states: [
              { state: "Default",         description: "First role selected; matrix populated" },
              { state: "Unsaved Changes", description: "Unsaved indicator visible; Save CTA enabled" },
              { state: "Saving",          description: "CTA loading; all toggles disabled" },
            ],
            navigation: { entry: ["User Management → Roles tab"], exit: ["Back → User Management"] },
            edgeCases: [],
            copyRefs: [{ text: "Save Role", kind: "static", purpose: "Persist permission changes CTA" }],
            dependencies: ["GET /api/admin/roles", "PATCH /api/admin/roles/:id", "Admin role permission required"],
          },
        ],
      },
      {
        id: "m4", name: "System Configuration", purpose: "Global platform settings, integrations, and compliance controls",
        flows: ["Settings → System Configuration"],
        screens: [
          {
            id: "s6", name: "Global Settings", screenType: "Settings Page",
            personas: ["Marcus Webb"], completeness: 90,
            purpose: "Configure platform-wide behaviour: notifications, integrations, data retention, compliance.",
            elements: [
              { name: "Settings Sections", elType: "Accordion",      function: "Grouped panels: Notifications, Integrations, Data Retention, Compliance" },
              { name: "Save Preferences",  elType: "Primary Button", function: "Saves all changes across sections", conditions: "Enabled only when unsaved changes exist" },
            ],
            interactions: [
              { trigger: "Toggle setting",         result: "Unsaved indicator; Save enables",      navigation: "No navigation" },
              { trigger: "Click 'Save Preferences'", result: "All settings saved; success toast", navigation: "No navigation" },
            ],
            states: [
              { state: "Default",         description: "Current values; Save CTA disabled" },
              { state: "Unsaved Changes", description: "Save CTA enabled; unsaved badge visible" },
              { state: "Saving",          description: "CTA loading; all inputs disabled" },
              { state: "Success",         description: "Toast: 'Settings saved'; unsaved badge clears" },
              { state: "Error",           description: "Toast: 'Couldn't save settings — try again'" },
            ],
            validation: [
              { field: "Data Retention Period", required: false, format: "Number (days)", constraints: "Min: 30, Max: 3650", errorBehavior: "'Must be between 30 and 3650 days'" },
            ],
            navigation: { entry: ["Sidebar → Settings", "Admin panel → Global Settings tab"], exit: ["Sidebar navigation → any page"] },
            edgeCases: ["Unsaved changes + navigate away → confirm dialog", "Integration OAuth fails → inline provider-specific error"],
            copyRefs: [
              { text: "Save account preferences",                       kind: "static", purpose: "Primary CTA" },
              { text: "Settings saved",                                 kind: "static", purpose: "Success toast" },
              { text: "Couldn't save settings — try again",             kind: "static", purpose: "Error toast" },
            ],
            dependencies: ["GET /api/settings", "PATCH /api/settings", "Admin role permission", "Integration OAuth flows"],
          },
        ],
      },
    ],
  },
  {
    id: "p3", name: "Priya Nair", role: "Support Agent", initial: "PN",
    context: "Handles inbound support tickets, escalations, and customer communication in a high-volume environment.",
    goals: ["Resolve tickets efficiently", "Identify escalation triggers early", "Maintain SLA targets"],
    modules: [
      {
        id: "m5", name: "Support Operations", purpose: "Queue management, ticket processing, and escalation workflows",
        flows: ["Login → Support Queue", "Support Queue → Ticket Detail", "Ticket Detail → Escalation"],
        screens: [
          {
            id: "s7", name: "Support Queue", screenType: "Queue / List View",
            personas: ["Priya Nair"], completeness: 82,
            purpose: "Prioritised view of all open tickets with SLA indicators for efficient triage.",
            elements: [
              { name: "Ticket Queue Table", elType: "Data Table",       function: "Sorted list: priority, SLA countdown, subject, requester, assignee", conditions: "Real-time SLA updates" },
              { name: "Priority Filter",    elType: "Tab Filter",       function: "Filters queue: All / High / Medium / Low" },
              { name: "Claim Ticket CTA",   elType: "Secondary Button", function: "Assigns unassigned ticket to logged-in agent", conditions: "Unassigned tickets only" },
            ],
            interactions: [
              { trigger: "Click ticket row",     result: "Opens Ticket Detail",            navigation: "→ /support/ticket/:id" },
              { trigger: "Click 'Claim Ticket'", result: "Ticket assigned; row updates",   navigation: "No navigation"         },
              { trigger: "Filter tab change",    result: "Queue re-filters by priority",   navigation: "No navigation"         },
            ],
            states: [
              { state: "Default",     description: "Queue sorted by SLA — most urgent first" },
              { state: "Empty Queue", description: "'All caught up — no open tickets'" },
              { state: "Overdue",     description: "SLA-overdue rows highlighted red; counter shows negative time" },
            ],
            navigation: { entry: ["Login → redirect for Support role"], exit: ["Ticket row → /support/ticket/:id"] },
            edgeCases: [
              "Empty queue → 'All caught up' state",
              "Ticket claimed simultaneously → 'This ticket was just claimed by {name}'",
              "SLA breach → row turns red; manager notification triggered",
            ],
            copyRefs: [
              { text: "All caught up — no open tickets",        kind: "static",  purpose: "Empty queue state" },
              { text: "Claim Ticket",                           kind: "static",  purpose: "Per-row CTA" },
              { text: "This ticket was just claimed by {name}", kind: "dynamic", purpose: "Concurrency conflict message" },
            ],
            dependencies: ["GET /api/support/queue", "PATCH .../claim", "WebSocket for real-time SLA", "Supabase auth session"],
          },
          {
            id: "s8", name: "Ticket Detail", screenType: "Detail View / Workspace",
            personas: ["Priya Nair"], completeness: 76,
            flags: ["No edge cases defined for attachment handling"],
            purpose: "Full ticket view with conversation thread, response composer, and escalation controls.",
            elements: [
              { name: "Conversation Thread", elType: "Message List",    function: "Chronological thread between customer and agents", conditions: "Locked when resolved" },
              { name: "Response Composer",   elType: "Rich Text Input", function: "Multi-line reply input with formatting and attachments" },
              { name: "Escalate CTA",        elType: "Secondary Button",function: "Routes ticket to senior agent or specialist team", conditions: "Triggers confirmation modal" },
              { name: "Resolve CTA",         elType: "Primary Button",  function: "Marks ticket resolved; triggers satisfaction prompt", conditions: "Enabled when ≥1 reply sent" },
            ],
            interactions: [
              { trigger: "Click 'Escalate'",  result: "Confirmation modal with reason + target team", navigation: "Modal overlay"         },
              { trigger: "Click 'Resolve'",   result: "Ticket resolved; survey sent; return to queue", navigation: "→ /support/queue"     },
              { trigger: "Submit reply",       result: "Message appended; customer notified",           navigation: "No navigation"        },
            ],
            states: [
              { state: "Default",   description: "Thread populated; Resolve CTA disabled" },
              { state: "Replied",   description: "Resolve CTA enabled once reply has been sent" },
              { state: "Escalated", description: "'Escalated' badge; Escalate CTA hidden; Resolve needs manager approval" },
              { state: "Resolved",  description: "Thread locked; composer hidden; resolution banner shown" },
            ],
            navigation: {
              entry: ["Support Queue → ticket row"],
              exit:  ["Resolve → /support/queue", "Back → /support/queue"],
              conditional: ["Escalated → Resolve requires manager approval"],
            },
            edgeCases: [],
            copyRefs: [
              { text: "Escalate", kind: "static", purpose: "Secondary CTA — escalation flow" },
              { text: "Resolve",  kind: "static", purpose: "Primary CTA — closes ticket lifecycle" },
            ],
            dependencies: ["GET /api/support/tickets/:id", "POST .../reply", "POST .../escalate", "PATCH .../resolve", "WebSocket for thread updates"],
          },
        ],
      },
    ],
  },
];

// ─── Derived helpers ──────────────────────────────────────────────────────────

interface Warning { screenId: string; screenName: string; persona: string; message: string; severity: "high" | "medium"; }

function collectWarnings(data: PersonaDoc[]): Warning[] {
  const out: Warning[] = [];
  data.forEach(p => p.modules.forEach(m => m.screens.forEach(s => {
    s.flags?.forEach(f => out.push({ screenId: s.id, screenName: s.name, persona: p.name, message: f, severity: "high" }));
    if (!s.edgeCases.length && !s.flags?.some(f => f.toLowerCase().includes("edge"))) {
      out.push({ screenId: s.id, screenName: s.name, persona: p.name, message: "No edge cases documented", severity: "medium" });
    }
  })));
  return out;
}

function overallCompleteness(data: PersonaDoc[]): number {
  const screens = data.flatMap(p => p.modules.flatMap(m => m.screens));
  return Math.round(screens.reduce((a, s) => a + s.completeness, 0) / screens.length);
}

// ─── Export utilities ─────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportDocx(data: PersonaDoc[]) {
  const body = data.map(p => {
    const mods = p.modules.map(m => {
      const scrs = m.screens.map(s => `
        <h3 style="font-size:14pt;margin-top:16pt;">${s.name}</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:10pt;font-size:10pt;">
          <tr><td style="padding:5pt;border:1pt solid #e5e7eb;font-weight:bold;width:130pt;">Screen Type</td><td style="padding:5pt;border:1pt solid #e5e7eb;">${s.screenType}</td></tr>
          <tr><td style="padding:5pt;border:1pt solid #e5e7eb;font-weight:bold;">Persona(s)</td><td style="padding:5pt;border:1pt solid #e5e7eb;">${s.personas.join(", ")}</td></tr>
          <tr><td style="padding:5pt;border:1pt solid #e5e7eb;font-weight:bold;">Purpose</td><td style="padding:5pt;border:1pt solid #e5e7eb;">${s.purpose}</td></tr>
        </table>
        <h4 style="font-size:11pt;margin-top:8pt;">Elements</h4>
        <table style="border-collapse:collapse;width:100%;margin-bottom:10pt;font-size:10pt;">
          <tr style="background:#f9fafb;"><th style="padding:4pt;border:1pt solid #e5e7eb;text-align:left;">Element</th><th style="padding:4pt;border:1pt solid #e5e7eb;text-align:left;">Type</th><th style="padding:4pt;border:1pt solid #e5e7eb;text-align:left;">Function</th></tr>
          ${s.elements.map(el => `<tr><td style="padding:4pt;border:1pt solid #e5e7eb;">${el.name}</td><td style="padding:4pt;border:1pt solid #e5e7eb;">${el.elType}</td><td style="padding:4pt;border:1pt solid #e5e7eb;">${el.function}</td></tr>`).join("")}
        </table>
        <h4 style="font-size:11pt;margin-top:8pt;">State Variations</h4>
        <table style="border-collapse:collapse;width:100%;margin-bottom:10pt;font-size:10pt;">
          ${s.states.map(st => `<tr><td style="padding:4pt;border:1pt solid #e5e7eb;font-weight:bold;width:110pt;">${st.state}</td><td style="padding:4pt;border:1pt solid #e5e7eb;">${st.description}</td></tr>`).join("")}
        </table>
        ${s.validation?.length ? `<h4 style="font-size:11pt;margin-top:8pt;">Validation Rules</h4><table style="border-collapse:collapse;width:100%;margin-bottom:10pt;font-size:10pt;"><tr style="background:#f9fafb;"><th style="padding:4pt;border:1pt solid #e5e7eb;text-align:left;">Field</th><th style="padding:4pt;border:1pt solid #e5e7eb;text-align:left;">Required</th><th style="padding:4pt;border:1pt solid #e5e7eb;text-align:left;">Format</th><th style="padding:4pt;border:1pt solid #e5e7eb;text-align:left;">Error Behavior</th></tr>${s.validation.map(v => `<tr><td style="padding:4pt;border:1pt solid #e5e7eb;">${v.field}</td><td style="padding:4pt;border:1pt solid #e5e7eb;">${v.required ? "Yes" : "No"}</td><td style="padding:4pt;border:1pt solid #e5e7eb;">${v.format ?? "—"}</td><td style="padding:4pt;border:1pt solid #e5e7eb;">${v.errorBehavior ?? "—"}</td></tr>`).join("")}</table>` : ""}
        <h4 style="font-size:11pt;margin-top:8pt;">Edge Cases</h4><ul>${s.edgeCases.map(e => `<li style="font-size:10pt;margin-bottom:3pt;">${e}</li>`).join("") || "<li style='font-size:10pt;color:#9ca3af;'>None documented</li>"}</ul>
        <h4 style="font-size:11pt;margin-top:8pt;">Dependencies</h4><ul>${s.dependencies.map(d => `<li style="font-size:10pt;margin-bottom:3pt;">${d}</li>`).join("")}</ul>
      `).join("");
      return `<h2 style="font-size:16pt;margin-top:20pt;">${m.name}</h2><p style="color:#6b7280;font-size:11pt;">${m.purpose}</p>${scrs}`;
    }).join("");
    return `<h1 style="font-size:20pt;margin-top:30pt;border-bottom:2pt solid #e5e7eb;padding-bottom:8pt;">${p.name} — ${p.role}</h1><p style="font-size:11pt;"><strong>Context:</strong> ${p.context}</p>${mods}`;
  }).join("");
  downloadBlob(
    `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8"><style>body{font-family:Calibri,sans-serif;font-size:11pt;color:#1f2937;margin:60pt;}h1{color:#111827;}h2{color:#374151;}h3{color:#4b5563;}h4{color:#374151;margin-top:12pt;}</style></head><body><h1 style="font-size:26pt;border-bottom:2pt solid #111827;padding-bottom:12pt;">Aether — Design Documentation</h1><p style="color:#6b7280;margin-bottom:24pt;">Generated by Aether Design Intelligence Pipeline</p>${body}</body></html>`,
    "Aether_Design_Documentation.doc", "application/msword"
  );
}

function exportJSON(data: PersonaDoc[]) {
  downloadBlob(JSON.stringify({ version: "1.0", generated: new Date().toISOString(), project: PROJECT, documentation: data }, null, 2), "Aether_Design_Documentation.json", "application/json");
}

function exportPDF(data: PersonaDoc[]) {
  const body = data.map(p => `
    <h1>${p.name} — ${p.role}</h1>
    ${p.modules.map(m => `<h2>${m.name}</h2>${m.screens.map(s => `
      <div class="screen"><h3>${s.name}</h3>
      <p><span class="lbl">Type:</span> ${s.screenType}</p>
      <p><span class="lbl">Purpose:</span> ${s.purpose}</p>
      <p><span class="lbl">Elements:</span> ${s.elements.length} &nbsp;·&nbsp; <span class="lbl">States:</span> ${s.states.length} &nbsp;·&nbsp; <span class="lbl">Dependencies:</span> ${s.dependencies.length}</p>
      </div>`).join("")}`).join("")}
  `).join("");
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<html><head><title>Aether Documentation</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1f2937;line-height:1.6;}h1{font-size:20px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;margin-top:32px;}h2{font-size:16px;color:#374151;margin-top:24px;}h3{font-size:13px;color:#111827;margin-top:16px;}.screen{border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:10px;}.lbl{font-weight:600;color:#374151;}p{font-size:12px;color:#4b5563;margin:3px 0;}</style></head><body><h1 style="margin-top:0;font-size:24px;">Aether — Design Documentation</h1>${body}<script>window.onload=function(){window.print();}<\/script></body></html>`);
  win.document.close();
}

// ─── Stage Tracker ────────────────────────────────────────────────────────────

function StageTracker({ current }: { current: number }) {
  const stages = [
    { label: "Upload",    icon: ({ className }: any) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
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
            {i < stages.length - 1 && <div className={cn("w-4 h-px mx-0.5", i < current ? "bg-foreground/30" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Screen Preview Card ──────────────────────────────────────────────────────

function ScreenPreviewCard({ screen }: { screen: ScreenDoc }) {
  const [open, setOpen] = useState(false);
  const hasWarnings = (screen.flags?.length ?? 0) > 0 || screen.edgeCases.length === 0;

  return (
    <div className={cn("rounded-xl border bg-background overflow-hidden transition-colors",
      hasWarnings ? "border-amber-200/60 dark:border-amber-800/40" : "border-border"
    )}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-secondary/20 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Monitor className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium">{screen.name}</span>
              <span className="text-[10px] bg-secondary text-muted-foreground rounded px-1.5 py-0.5">{screen.screenType}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{screen.purpose}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[10px] bg-secondary text-muted-foreground rounded px-2 py-0.5">{screen.elements.length} el</span>
            <span className="text-[10px] bg-secondary text-muted-foreground rounded px-2 py-0.5">{screen.states.length} states</span>
            {screen.edgeCases.length > 0
              ? <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded px-2 py-0.5">edge ✓</span>
              : <span className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded px-2 py-0.5">edge ⚠</span>
            }
            {screen.validation?.length
              ? <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded px-2 py-0.5">val ✓</span>
              : null
            }
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0", open && "rotate-180")} strokeWidth={1.5} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/50"
          >
            <div className="px-5 py-4 space-y-4">

              {/* Flags */}
              {screen.flags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {screen.flags.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5">
                      <Flag className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />{f}
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Two-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Interactions */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <MousePointer className="h-3 w-3" strokeWidth={1.5} />Interactions
                  </p>
                  {screen.interactions.map((ir, i) => (
                    <div key={i} className="text-[11px] leading-relaxed">
                      <span className="font-medium">{ir.trigger}</span>
                      <span className="text-muted-foreground"> → {ir.result}</span>
                    </div>
                  ))}
                </div>

                {/* States */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <ToggleLeft className="h-3 w-3" strokeWidth={1.5} />States
                  </p>
                  {screen.states.map((st, i) => (
                    <div key={i} className="flex gap-2 text-[11px]">
                      <span className="font-medium w-24 flex-shrink-0">{st.state}</span>
                      <span className="text-muted-foreground">{st.description}</span>
                    </div>
                  ))}
                </div>

                {/* Validation */}
                {screen.validation?.length ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />Validation
                    </p>
                    {screen.validation.map((v, i) => (
                      <div key={i} className="text-[11px]">
                        <span className="font-medium">{v.field}</span>
                        <span className={cn("ml-1.5 text-[10px] rounded px-1 py-0.5", v.required ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400" : "bg-secondary text-muted-foreground")}>
                          {v.required ? "required" : "optional"}
                        </span>
                        {v.errorBehavior && <p className="text-muted-foreground mt-0.5">{v.errorBehavior}</p>}
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Dependencies */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Database className="h-3 w-3" strokeWidth={1.5} />Dependencies
                  </p>
                  {screen.dependencies.map((d, i) => (
                    <p key={i} className="text-[11px] font-mono text-muted-foreground">{d}</p>
                  ))}
                </div>

              </div>

              {/* Navigation */}
              <div className="rounded-xl bg-secondary/30 border border-border/50 px-4 py-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <GitBranch className="h-3 w-3" strokeWidth={1.5} />Navigation
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Entry: </span>
                    <span className="text-[11px]">{screen.navigation.entry.join("  ·  ")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Exit: </span>
                    <span className="text-[11px]">{screen.navigation.exit.join("  ·  ")}</span>
                  </div>
                </div>
              </div>

              {/* Edge cases */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />Edge Cases
                </p>
                {screen.edgeCases.length
                  ? screen.edgeCases.map((e, i) => <p key={i} className="text-[11px] text-muted-foreground">· {e}</p>)
                  : <p className="text-[11px] text-amber-600 dark:text-amber-400">No edge cases documented — review before handoff</p>
                }
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Module Block ─────────────────────────────────────────────────────────────

function ModuleBlock({ mod }: { mod: ModuleDoc }) {
  const [open, setOpen] = useState(true);
  const warnings = mod.screens.filter(s => (s.flags?.length ?? 0) > 0 || s.edgeCases.length === 0).length;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-3.5 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <FolderOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <div>
            <p className="text-[13px] font-semibold">{mod.name}</p>
            <p className="text-[11px] text-muted-foreground">{mod.purpose}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground bg-background/80 rounded px-1.5 py-0.5 border border-border">{mod.screens.length} screens</span>
          {warnings > 0 && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-1.5 py-0.5 border border-amber-200 dark:border-amber-800">{warnings} review</span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} strokeWidth={1.5} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
            <div className="px-4 pt-2 pb-4 space-y-2 border-t border-border/50">
              <div className="flex flex-wrap gap-1.5 py-2">
                {mod.flows.map((f, i) => <span key={i} className="text-[10px] font-mono bg-secondary text-muted-foreground rounded px-2 py-0.5 border border-border">{f}</span>)}
              </div>
              {mod.screens.map(s => <ScreenPreviewCard key={s.id} screen={s} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Export Menu ──────────────────────────────────────────────────────────────

function ExportMenu({ size = "sm" }: { size?: "sm" | "default" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} className={cn("gradient-accent text-accent-foreground hover:brightness-110 shadow-soft gap-1.5", size === "sm" && "h-8 rounded-lg text-xs")}>
          <Download className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={1.5} />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>BA Handoff</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => exportDocx(MOCK_DOC)}>
          <FileText className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />Download .docx
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Other Formats</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => exportJSON(MOCK_DOC)}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />Export JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportPDF(MOCK_DOC)}>
          <Eye className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const GENERATING_LABELS = [
  "Compiling persona documentation…",
  "Structuring screen annotations…",
  "Mapping interaction rules…",
  "Finalising validation logic…",
  "Assembling BA handoff document…",
];

export default function DesignDocumentation() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();

  const [docPhase,      setDocPhase]      = useState<DocPhase>("preview");
  const [activePersona, setActivePersona] = useState(MOCK_DOC[0].id);
  const [genLabel,      setGenLabel]      = useState(0);
  const [warningsOpen,  setWarningsOpen]  = useState(true);

  const warnings    = collectWarnings(MOCK_DOC);
  const completeness = overallCompleteness(MOCK_DOC);
  const activeData  = MOCK_DOC.find(p => p.id === activePersona) ?? MOCK_DOC[0];

  function handleGenerate() {
    setDocPhase("generating");
    if (projectId) {
      supabase.from("agent_runs").insert({
        project_id: projectId, phase: 6, status: "running",
        input_json: { personas: MOCK_DOC.length, completeness },
      });
    }
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i < GENERATING_LABELS.length) setGenLabel(i);
      else {
        clearInterval(iv);
        setTimeout(async () => {
          setDocPhase("complete");
          if (projectId) {
            await supabase.from("projects")
              .update({ status: "completed", current_phase: 9, updated_at: new Date().toISOString() })
              .eq("id", projectId);
            await supabase.from("agent_runs")
              .update({ status: "completed", output_json: { screens: PROJECT.screens, personas: PROJECT.personas } })
              .eq("project_id", projectId).eq("phase", 6);
          }
        }, 300);
      }
    }, 380);
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className="shrink-0 h-14 flex items-center justify-between px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="h-4 w-px bg-border" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{PROJECT.name}</span>
                  <span className="hidden sm:inline text-[10px] text-muted-foreground bg-secondary rounded px-1.5 py-0.5 flex-shrink-0">Phase 06</span>
                </div>
                <p className="text-[10px] text-muted-foreground hidden sm:block">Final structured handoff generated from your design system</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {(docPhase === "preview" || docPhase === "complete") && <ExportMenu size="sm" />}
              <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs gap-1.5" onClick={() => navigate(projectId ? `/project/${projectId}/phase/05` : "/dashboard")}>
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">UX Copywriting</span>
              </Button>
            </div>
          </header>

          {/* ── Stage tracker strip ─────────────────────────────────────────── */}
          <div className="shrink-0 border-b border-border bg-secondary/20 px-6 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <StageTracker current={6} />
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span><span className="font-semibold text-foreground">{PROJECT.personas}</span> personas</span>
                <span><span className="font-semibold text-foreground">{PROJECT.modules}</span> modules</span>
                <span><span className="font-semibold text-foreground">{PROJECT.screens}</span> screens</span>
                <span><span className="font-semibold text-foreground">{PROJECT.flows}</span> flows</span>
                <span className={cn("font-semibold", completeness >= 85 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{completeness}%</span>
              </div>
            </div>
          </div>

          {/* ── Scrollable body ─────────────────────────────────────────────── */}
          <main className="flex-1 overflow-y-auto">
            <div className="px-6 py-8 max-w-4xl mx-auto w-full space-y-6">

              <AnimatePresence mode="wait">

                {/* ── Generating ── */}
                {docPhase === "generating" && (
                  <motion.div key="gen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center py-32 gap-8">
                    <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}>
                        <Cpu className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                      </motion.div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm font-medium">Generating Documentation</p>
                      <div className="h-5 overflow-hidden">
                        <AnimatePresence mode="wait">
                          <motion.p key={genLabel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="text-xs text-muted-foreground">
                            {GENERATING_LABELS[genLabel]}
                          </motion.p>
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {GENERATING_LABELS.map((_, i) => (
                        <motion.div key={i} className={cn("h-1 rounded-full", i <= genLabel ? "bg-foreground" : "bg-border")}
                          animate={{ width: i <= genLabel ? 20 : 8 }} transition={{ duration: 0.3 }} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── Preview + Complete ── */}
                {(docPhase === "preview" || docPhase === "complete") && (
                  <motion.div key="content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="space-y-6">

                    {/* Complete banner */}
                    <AnimatePresence>
                      {docPhase === "complete" && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                          className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-5 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <CircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" strokeWidth={1.5} />
                            <div>
                              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Documentation generated</p>
                              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                                {PROJECT.screens} screens · {PROJECT.personas} personas · {PROJECT.modules} modules — ready for BA and engineering handoff
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs gap-1.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30" onClick={() => navigate("/dashboard")}>
                              <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />Dashboard
                            </Button>
                            <ExportMenu size="sm" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Project Summary */}
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-sm font-semibold">Project Summary</h2>
                          <p className="text-xs text-muted-foreground mt-0.5">Compiled from all previous phases</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-lg border",
                            completeness >= 85
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                              : "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                          )}>
                            {completeness}% ready
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { label: "Personas",     value: PROJECT.personas     },
                          { label: "Modules",      value: PROJECT.modules      },
                          { label: "Screens",      value: PROJECT.screens      },
                          { label: "Flows",        value: PROJECT.flows        },
                          { label: "Copy items",   value: PROJECT.copyReviewed },
                          { label: "Audit issues", value: PROJECT.auditIssues  },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-xl bg-secondary/50 border border-border p-3 text-center">
                            <p className="text-xl font-bold">{value}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Validation panel */}
                    {warnings.length > 0 && (
                      <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10 overflow-hidden">
                        <button
                          onClick={() => setWarningsOpen(o => !o)}
                          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
                            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Quality Check — {warnings.length} items to review</span>
                          </div>
                          <ChevronDown className={cn("h-3.5 w-3.5 text-amber-600 dark:text-amber-400 transition-transform", warningsOpen && "rotate-180")} strokeWidth={1.5} />
                        </button>
                        <AnimatePresence initial={false}>
                          {warningsOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18, ease: "easeInOut" }} className="overflow-hidden border-t border-amber-200 dark:border-amber-800">
                              <div className="px-5 py-3 space-y-1.5">
                                {warnings.map((w, i) => (
                                  <div key={i} className="flex items-start gap-3 py-1.5">
                                    <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0", w.severity === "high" ? "bg-rose-500" : "bg-amber-400")} />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-[12px] font-medium text-amber-900 dark:text-amber-100">{w.screenName}</span>
                                      <span className="text-[11px] text-amber-700 dark:text-amber-400"> · {w.persona}</span>
                                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">{w.message}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Documentation preview */}
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold">Documentation Preview</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Review before generating the final handoff document</p>
                      </div>

                      {/* Persona tabs */}
                      <div className="flex gap-1.5 flex-wrap">
                        {MOCK_DOC.map(p => (
                          <button key={p.id} onClick={() => setActivePersona(p.id)} className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-medium transition-all",
                            activePersona === p.id
                              ? "border-foreground bg-foreground text-background"
                              : "border-border hover:border-foreground/30 text-muted-foreground hover:text-foreground"
                          )}>
                            <span className="h-5 w-5 rounded-full bg-current/10 flex items-center justify-center text-[9px] font-bold">{p.initial}</span>
                            {p.name}
                            <span className={cn("text-[10px] rounded px-1 py-0.5", activePersona === p.id ? "bg-white/20" : "bg-secondary")}>
                              {p.modules.flatMap(m => m.screens).length}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Active persona */}
                      <AnimatePresence mode="wait">
                        <motion.div key={activePersona} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }} className="space-y-3">

                          {/* Persona context */}
                          <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-start gap-4">
                            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-[13px] font-bold flex-shrink-0">
                              {activeData.initial}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold">{activeData.name}</p>
                                <span className="text-[10px] text-muted-foreground bg-secondary rounded px-1.5 py-0.5">{activeData.role}</span>
                              </div>
                              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{activeData.context}</p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {activeData.goals.map((g, i) => (
                                  <span key={i} className="text-[10px] bg-secondary text-muted-foreground rounded-lg px-2 py-1 border border-border">· {g}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Modules */}
                          {activeData.modules.map(mod => <ModuleBlock key={mod.id} mod={mod} />)}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Generate CTA — only in preview state */}
                    {docPhase === "preview" && (
                      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-4 text-center">
                        <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Ready to generate</p>
                          <p className="text-xs text-muted-foreground mt-1">All phases are complete. This will compile the final structured handoff document.</p>
                        </div>
                        <Button onClick={handleGenerate} className="gradient-accent text-accent-foreground hover:brightness-110 shadow-soft h-11 px-8 rounded-xl font-medium">
                          Generate Final Documentation
                        </Button>
                        <p className="text-[11px] text-muted-foreground">Ready for BA and engineering handoff</p>
                      </div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

          {/* ── Bottom CTA bar (complete only) ─────────────────────────────── */}
          <AnimatePresence>
            {docPhase === "complete" && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.2 }}
                className="shrink-0 border-t border-border bg-background/95 backdrop-blur px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Phase 06 complete</p>
                  <p className="text-xs text-muted-foreground">Project saved · All phases complete · Ready for handoff</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-9 rounded-xl text-xs gap-1.5" onClick={() => navigate("/dashboard")}>
                    <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />Go to Dashboard
                  </Button>
                  <ExportMenu size="default" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </SidebarProvider>
  );
}
