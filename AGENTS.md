# Aether — Design Acceleration Agent

6-phase AI pipeline: PRD upload → Personas → Journey Maps → Design Backlog → Screen List → Prototype Prompts → UX Audit → Copy Review → BA Handoff (.docx).

---

## Commands

```bash
npm run dev        # Dev server on port 8080
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Vitest (once)
npm run test:watch # Vitest (watch)
npx vitest run src/path/to/file.test.ts
```

---

## Stack

**Frontend:** React 18, Vite + SWC, TypeScript, TailwindCSS, shadcn/ui, Framer Motion, TanStack React Query, React Hook Form + Zod  
**Backend:** FastAPI (`VITE_API_URL`) — Codex API is called server-side only, never from the frontend  
**Database:** Supabase (Postgres + Auth) — connected via `src/lib/supabase.ts`  
**Deployment:** Vercel (frontend)

---

## Routing (`src/App.tsx`)

```
/                          → Landing (public)
/login  /signup            → Auth (public)
/dashboard                 → Index
/projects                  → Projects list
/project/intake            → ProjectIntake
/project/:id               → ProjectDetail
/project/:id/phase/01      → PersonaStudio
/project/:id/phase/01/journey → JourneyMapping
/project/:id/phase/01/backlog → DesignBacklog
/project/:id/phase/02      → ScreenDerivation
/project/:id/phase/03      → PrototypePage
/project/:id/phase/04      → UXAudit
/project/:id/phase/05      → UXCopyReview
/project/:id/phase/06      → DesignDocumentation
/tools/ux-audit            → UXAuditTool (standalone)
/tools/ux-copywriting      → UXCopywritingTool (standalone)
```

All protected routes wrapped in `<ProtectedRoute>` via `AuthContext`.  
Provider order: `QueryClientProvider` → `AuthProvider` → `TooltipProvider` → `BrowserRouter`.

---

## Backend API Pattern

Mirror the pattern from the BA Agent (`invuric-insights`):

```ts
// src/lib/api.ts
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> { ... }

// Phase calls — POST to FastAPI, Codex runs server-side
export const runPhase01 = (projectId: string, prdText: string) =>
  request("/api/phase/01/personas", { method: "POST", body: JSON.stringify({ project_id: projectId, prd_text: prdText }) });

export const runPhase02 = (projectId: string) =>
  request("/api/phase/02/screens", { method: "POST", body: JSON.stringify({ project_id: projectId }) });
// ... same pattern for phases 03–06
```

`src/lib/webhooks.ts` (the old n8n file) is **deprecated** — replace calls with `src/lib/api.ts`.

---

## Component Structure

```
src/
  pages/          # Route-level components — own their page state
  components/
    dashboard/    # AppSidebar, HeroSection, WorkflowStepper, RecentProjects, QuickTools
    ui/           # shadcn/ui primitives — never modify directly
  lib/
    supabase.ts   # Supabase client
    database.types.ts  # Project, Persona, JourneyMap, BacklogItem, Screen, AgentRun
    api.ts        # FastAPI calls (to build/extend)
  hooks/          # useIsMobile, useToast
  contexts/       # AuthContext
```

---

## Layout Rule

Every page must use `SidebarProvider` + `AppSidebar` + main content area.  
Follow the exact structure in `Index.tsx`. No page outside this wrapper.

---

## Design System

| Token | Value |
|---|---|
| Spacing | 8px base grid |
| Border radius | 12–16px (`rounded-2xl` / `rounded-[20px]`) |
| Typography | Inter — sizes 11–22px |
| Primary | `#6366F1` (indigo) |
| Text primary | `#0F172A` |
| Text secondary | `#64748B` / `#94A3B8` |
| Border | `#E5E7EB` |
| Surface | `#FFFFFF` / bg `#FAFAFA` |
| Icons | `lucide-react`, thin stroke (`strokeWidth={1.75}`) |

Colors are CSS variable–based (HSL) in `src/index.css`. Use semantic tokens: `primary`, `muted`, `surface-elevated`, `surface-sunken`, `sidebar-*`.

---

## Phase Progression Rules

- Phases unlock sequentially — locked phases show `Lock` from `lucide-react`
- Each phase page structure: header (phase number + name) → review section → CTA button
- Phase state stored on `projects.current_phase` in Supabase

---

## Data Types (`src/lib/database.types.ts`)

`Project`, `Persona`, `JourneyMap`, `BacklogItem`, `Screen`, `AgentRun` — all defined, use these everywhere.

---

## State Management

- UI/page state: `useState`
- Forms: `react-hook-form` + `zod`
- Server state: TanStack React Query
- Toasts: `sonner` (preferred) or `useToast` hook

---

## TypeScript

Strict mode off (`strict: false`, `strictNullChecks: false`, `noImplicitAny: false`) — intentional.  
Path alias `@/` → `src/`.

---

## Component Rules

- shadcn/ui only — no new UI libraries
- Reuse components in `src/components/` before creating new ones
- Never modify `src/components/ui/` directly

---

## Quality Standard

Every page must feel **premium, structured, calm, and intelligent.**  
Handle all states: loading, error, empty, success.  
No decoration without information value. No template-like layouts.
