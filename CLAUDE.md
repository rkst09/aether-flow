# Aether — Design Acceleration Agent

Aether is a 6-phase AI-powered design intelligence pipeline that transforms a PRD or product document into a complete UX workflow output.

Designers upload a PRD (PDF, DOCX, DOC), and the system generates:
- Personas
- Journey Maps
- Design Backlog
- Screen Lists
- Prototype Prompts (Lovable-ready)
- UX Audit Reports
- UX Copywriting Reviews
- Final BA Handoff Document (.docx)

This is not a simple UI tool. It is a structured design intelligence pipeline. Build it accordingly.

---

## Engineering Stack

**Frontend:**
- React + Vite + TypeScript
- Tailwind CSS
- shadcn/ui (component library — no other UI libraries)

**Backend:**
- n8n Cloud (webhook-based automation)

**Database:**
- Supabase (Postgres) — not yet connected

**AI:**
- Claude API via n8n nodes — no direct frontend API calls

**Deployment:**
- Vercel

---

## Existing Pages — DO NOT Redesign

These pages are already implemented. All new pages must strictly follow their design system, layout patterns, and component usage.

### Dashboard
- Phase prompt cards
- Workflow progress stepper
- Quick tools panel

### Projects
- Project list view
- Each project card shows progress state
- **To implement:** Clicking a project card opens a Project Detail View (new page to build)

### Intake Start
- PRD upload trigger (Stage 0 entry point)
- Handles PDF, DOCX, DOC uploads

---

## Pages to Build — Strict Design Consistency Required

All new pages must match existing pages in: layout, spacing, typography, components, and interaction patterns.

---

### Project Detail View
- Opens when a project card is clicked from the Projects page
- Shows project metadata, current phase status, and phase progression
- Entry point to all 6 phases for that project

---

### Phase 01 — Design Intake

A 3-step sequential flow. Each step must be completed before the next unlocks.

**Step 1 — Persona Identification**
- AI extracts candidate personas from the uploaded PRD
- Each persona card shows: name, role, goals, pain points, confidence score
- Designer reviews and confirms/edits personas
- CTA: "Confirm Personas & Continue"

**Step 2 — Journey Mapping**
- One journey map per confirmed persona
- Shows: stages, actions, emotions, touchpoints, pain points
- Designer reviews and can annotate
- CTA: "Confirm Journey Maps & Continue"

**Step 3 — Design Backlog**
- Structured list of design tasks derived from personas + journeys
- Each item: task name, persona mapping, priority, type (screen / flow / component)
- Designer reviews and confirms
- CTA: "Finalise Backlog & Proceed to Phase 02"

---

### Phase 02 — Screen Derivation

- Structured screen list derived from the design backlog
- Each screen entry contains:
  - Screen name
  - Screen type (form / list / detail / modal / empty state / etc.)
  - Persona mapping
  - Entry points
  - Exit points
  - Component hints
- Designer can review, reorder, and confirm screens
- CTA: "Confirm Screen List & Proceed to Phase 03"

---

### Phase 03 — Prototype Prompt Generation

- Generates Lovable-ready prompts for each confirmed screen
- Outputs grouped by persona
- Each prompt includes:
  - Screen name and purpose
  - Key interactions
  - UI constraints
  - Component suggestions
- Designer can copy individual prompts or export all
- CTA: "Export Prompts & Proceed to Phase 04"

---

### Phase 04 — UX Audit

- Heuristic evaluation of the screen list and flows
- Output sections:
  - Friction points detected
  - Accessibility issues
  - Missing states (loading / empty / error)
  - Consistency issues
  - Priority ratings per issue (High / Medium / Low)
- Designer reviews findings
- CTA: "Acknowledge Audit & Proceed to Phase 05"

---

### Phase 05 — UX Copywriting Review

- Before and after comparison table for all copy across screens
- Covers:
  - CTA labels
  - Error messages
  - Empty state copy
  - Microcopy improvements
  - Tooltip and helper text
- Designer can accept, reject, or edit each suggestion
- CTA: "Confirm Copy & Proceed to Phase 06"

---

### Phase 06 — Design Documentation

- Generates a BA-ready structured document containing:
  - Screen annotations
  - Interaction logic
  - Edge cases
  - Validation rules
  - Navigation flows
- Preview rendered inside the page
- Output: downloadable Word document (.docx)
- CTA: "Download Documentation"

---

### Files Page

- Lists all uploaded files for the active project
- Shows: filename, type, upload date, size
- Future: version tracking and file history

---

### Customization Page

- Tone settings (formal / conversational / technical)
- Persona defaults (roles, archetypes to prioritise)
- Output preferences (verbosity level, format preferences)

---

### Independent Tools

These tools must work both inside a project flow AND as standalone utilities accessible from the sidebar:

**UX Audit Tool**
- Run a UX audit without going through the full pipeline
- Input: screen list or description
- Output: audit findings report

**UX Copywriting Tool**
- Run a copy review without going through the full pipeline
- Input: screen copy or paste-in text
- Output: before/after comparison table

---

### Authentication Pages

- Login page
- Signup page
- Must match the existing Aether design system exactly
- Use Supabase Auth (to be wired later — build UI now)

---

## Core Layout Rules

- Every page must use `SidebarProvider` + `AppSidebar`
- Follow the exact layout structure defined in `Index.tsx`
- Never build a page outside this layout wrapper

---

## Component Rules

- Use **only** existing shadcn/ui components
- Do **not** install new UI libraries
- Do **not** create inconsistent custom components
- Reuse components already present in `/src/components`

---

## Phase Progression Rules

- Phases unlock sequentially — a phase is locked until the previous one is completed
- Locked phases display a lock icon (use `Lock` from `lucide-react`)
- Each phase page has a consistent structure:
  - Header: phase number + phase name
  - Input / review section
  - Output / results section
  - Primary action button (CTA) to confirm and advance

---

## Data Handling

All data is mocked. No real API calls exist yet.

```ts
// Example mock pattern
const mockPersonas = [
  { id: "1", name: "Product Manager", role: "PM", goals: ["..."], confidence: 92 }
]
```

---

## Backend Integration (Future — Placeholder Only)

- Backend: n8n Cloud (webhook-based)
- Use placeholder strings for all webhook URLs

```ts
const WEBHOOK_URLS = {
  phase01: "https://placeholder-n8n/webhook/phase-01-intake",
  phase02: "https://placeholder-n8n/webhook/phase-02-screens",
  phase03: "https://placeholder-n8n/webhook/phase-03-prototype",
  phase04: "https://placeholder-n8n/webhook/phase-04-audit",
  phase05: "https://placeholder-n8n/webhook/phase-05-copy",
  phase06: "https://placeholder-n8n/webhook/phase-06-docs",
}
```

---

## Supabase Schema (Future — Not Yet Connected)

```sql
-- Core tables to implement later
projects        (id, user_id, name, prd_url, status, current_phase, created_at)
agent_runs      (id, project_id, phase, status, input_json, output_json, created_at)
personas        (id, project_id, name, role, goals, pain_points, confidence_score)
screens         (id, project_id, name, type, persona_id, entry_points, exit_points, component_hints)
```

---

## Design System Rules

Every page must follow:

| Token | Value |
|---|---|
| Spacing system | 8px base grid |
| Border radius | 12–16px |
| Typography | Inter or SF Pro |
| Color palette | Neutral, calm, low-saturation |
| Icons | Thin stroke only (lucide-react) |

---

## UX Principles

- Clarity over decoration
- Progressive disclosure — show only what is needed at each step
- Low cognitive load
- Strong visual hierarchy
- Consistent interaction patterns
- Clear feedback for every user action
- Proper handling of all states: loading, error, empty, success

---

## Product Thinking Rules

This is not a static UI implementation. Every page must:

- Represent a system state
- Reflect workflow progression
- Guide the user through a clear step-by-step experience

---

## Development Workflow — Required Before Every Build

Before building any new page or feature, you must confirm:

1. What exact feature is being built?
2. What is the expected output?
3. What inputs are required?
4. What states exist? (loading / error / empty / success)

**Do not assume requirements. Do not design without clear instructions.**

---

## Developer Mindset

Operate as:
- A top-tier UI/UX engineer
- A product thinker, not just an implementer
- A system designer, not just a component builder

---

## Final Quality Standard

Every page must feel: **premium, structured, calm, and intelligent.**

Avoid:
- Template-like or generic layouts
- Inconsistent component usage
- Unstructured UI decisions
- Decoration that adds no information value

Aether is a system. Build it as one.

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development mode build
npm run lint         # Run ESLint
npm run test         # Run all unit tests once (Vitest)
npm run test:watch   # Run tests in watch mode
```

Run a single test file:
```bash
npx vitest run src/path/to/file.test.ts
```

## Architecture

**Aether Flow** is a React + TypeScript SPA for managing a 6-phase design workflow: Intake → Screens → Prototype → Audit → Copy → Docs.

**Tech stack:** React 18, Vite + SWC, TailwindCSS, shadcn/ui (Radix UI), Framer Motion, TanStack React Query, React Hook Form, Zod.

### Routing (`src/App.tsx`)

```
/                → Index (dashboard)
/projects        → Projects listing
/project/intake  → ProjectIntake form
*                → NotFound
```

Providers wrap the app in this order: `QueryClientProvider` → `TooltipProvider` → `BrowserRouter`.

### Component structure

- `src/components/dashboard/` — Domain-specific dashboard components (sidebar, hero, workflow stepper, recent projects, quick tools)
- `src/components/ui/` — shadcn/ui primitives (~50 Radix-based components); never modify these directly
- `src/pages/` — Route-level components, own their page state
- `src/hooks/` — `useIsMobile()`, `useToast()`
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)

### Layout pattern

Every page uses `SidebarProvider` + `AppSidebar` + main content area. New pages should follow this same pattern seen in `Index.tsx` and `Projects.tsx`.

### Design system

Colors are CSS variable–based (HSL) in `src/index.css`. Tailwind references them as semantic tokens (`primary`, `secondary`, `muted`, `success`, `warning`, `surface-elevated`, `surface-sunken`, `sidebar-*`). Dark mode uses the `class` strategy via `next-themes`.

### State management

- **Local state** (`useState`) for UI and page-level state
- **Forms** via react-hook-form + Zod validation
- **Server state** via TanStack React Query (QueryClient initialized in App.tsx; no live API calls yet — data is currently mocked)
- **Toasts** via Sonner (`sonner` package); the legacy `useToast` hook also exists

### TypeScript

Strict mode is off (`strict: false`, `strictNullChecks: false`, `noImplicitAny: false`) — this is intentional for rapid iteration. Path alias `@/` maps to `src/`.

### Testing

- **Unit tests:** Vitest + Testing Library, located in `src/**/*.{test,spec}.{ts,tsx}`, setup in `src/test/setup.ts`
- **E2E tests:** Playwright (`playwright.config.ts`)
