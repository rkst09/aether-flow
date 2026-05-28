# Aether Flow

Aether Flow is a design acceleration workspace for converting a PRD into UX strategy and handoff assets. The pipeline moves from personas and journey maps through backlog, screen derivation, prototype prompts, UX audit, copy review, and BA documentation.

## Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, TanStack React Query
- Backend: FastAPI
- Database/Auth: Supabase
- AI: OpenAI API, called from the backend only
- Deployment: Vercel for frontend, Render/Railway/Fly.io for backend

## Prerequisites

- Node.js 20+
- Python 3.12 recommended
- Supabase project
- OpenAI API key

## Environment Variables

Frontend `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8001
```

Backend `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
ENVIRONMENT=development
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` in frontend environment variables.

## Local Development

Install frontend dependencies:

```bash
npm install
```

Run the backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8001
```

Run the frontend in a second terminal:

```bash
cd C:\Users\raksh\aether-flow
$env:VITE_API_URL="http://localhost:8001"
npm run dev
```

Open:

```text
http://localhost:8080
```

Backend health check:

```text
http://localhost:8001/health
```

## Scripts

```bash
npm run dev        # Start Vite dev server on port 8080
npm run build      # Create production frontend build
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
npm run test       # Run Vitest once
```

Backend tests:

```bash
cd backend
pytest
```

## Deployment

Deploy the backend first. Recommended backend settings:

```text
Root directory: backend
Build command: pip install -r requirements.txt
Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Backend production environment:

```env
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
ENVIRONMENT=production
```

Deploy the frontend on Vercel:

```text
Framework: Vite
Build command: npm run build
Output directory: dist
Install command: npm install
```

Frontend production environment:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=https://your-backend-url
```

Do not use a localhost backend URL in production.

## Performance Checklist

- Always deploy with `npm run build`, not the dev server.
- Keep frontend, backend, and Supabase regions close together.
- Keep OpenAI calls server-side through FastAPI.
- Confirm `VITE_API_URL` points to the production backend.
- Test the full flow after deploy: login, personas, journey, backlog, screens, prototype, audit, copy, docs.
- Watch large assets in build output; optimize images if first load becomes slow.

## Project Structure

```text
backend/              FastAPI routes, services, generators, tests
src/pages/            Route-level React screens
src/components/       App and UI components
src/lib/              API client, Supabase client, helpers
src/hooks/            Shared React hooks
supabase/             Database schema and Supabase files
```

## Important Notes

- `src/lib/webhooks.ts` is deprecated; frontend API calls use `src/lib/api.ts`.
- Protected app routes use Supabase auth through `AuthContext`.
- Phase outputs are stored in Supabase and generated through backend API routes.
