-- ─── Aether — Run this once in Supabase SQL Editor ────────────────────────────

-- Enable RLS on all tables
ALTER TABLE projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_maps   ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlog_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs     ENABLE ROW LEVEL SECURITY;

-- Projects: user owns their own projects
CREATE POLICY "Users own their projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Personas: accessible if user owns the parent project
CREATE POLICY "Users access their personas" ON personas
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Journey Maps
CREATE POLICY "Users access their journey maps" ON journey_maps
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Backlog Items
CREATE POLICY "Users access their backlog items" ON backlog_items
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Screens
CREATE POLICY "Users access their screens" ON screens
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Agent Runs
CREATE POLICY "Users access their agent runs" ON agent_runs
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- ─── Storage bucket for PRD uploads ────────────────────────────────────────────
-- Run this only if the bucket doesn't exist yet
INSERT INTO storage.buckets (id, name, public)
VALUES ('prd-uploads', 'prd-uploads', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users upload their own PRDs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'prd-uploads' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read their own PRDs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'prd-uploads' AND auth.uid()::text = (storage.foldername(name))[1]
  );
