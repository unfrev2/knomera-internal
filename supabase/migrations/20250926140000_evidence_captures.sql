-- Stage 2: intelligent evidence matching foundation.
-- Preserves founder-authored raw capture; AI assistance does not change authorship.

CREATE TABLE IF NOT EXISTS evidence_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  captured_by TEXT NOT NULL,
  organisation_id UUID,
  contact_id UUID,
  discovery_session_id UUID,
  evidence_source_id UUID,
  ai_assisted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT evidence_captures_id_workspace_unique UNIQUE (id, workspace_id)
);

DO $$ BEGIN
  ALTER TABLE evidence_captures
    ADD CONSTRAINT evidence_captures_organisation_fk
    FOREIGN KEY (organisation_id, workspace_id)
    REFERENCES organisations (id, workspace_id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evidence_captures
    ADD CONSTRAINT evidence_captures_contact_fk
    FOREIGN KEY (contact_id, workspace_id)
    REFERENCES contacts (id, workspace_id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evidence_captures
    ADD CONSTRAINT evidence_captures_discovery_fk
    FOREIGN KEY (discovery_session_id, workspace_id)
    REFERENCES discovery_sessions (id, workspace_id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evidence_captures
    ADD CONSTRAINT evidence_captures_source_fk
    FOREIGN KEY (evidence_source_id, workspace_id)
    REFERENCES evidence_sources (id, workspace_id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS evidence_capture_id UUID;

ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS ai_assisted BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_capture_fk
    FOREIGN KEY (evidence_capture_id, workspace_id)
    REFERENCES evidence_captures (id, workspace_id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS evidence_capture_id_idx
  ON evidence (evidence_capture_id)
  WHERE evidence_capture_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS evidence_captures_workspace_created_idx
  ON evidence_captures (workspace_id, created_at DESC);

-- Lightweight AI usage telemetry (no prompt content).
CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_role TEXT NOT NULL,
  model_name TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_workspace_created_idx
  ON ai_usage_events (workspace_id, created_at DESC);

REVOKE ALL ON TABLE evidence_captures FROM anon, authenticated;
REVOKE ALL ON TABLE ai_usage_events FROM anon, authenticated;

ALTER TABLE evidence_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_evidence_captures ON evidence_captures;
CREATE POLICY deny_all_evidence_captures ON evidence_captures
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_ai_usage_events ON ai_usage_events;
CREATE POLICY deny_all_ai_usage_events ON ai_usage_events
  FOR ALL TO anon, authenticated USING (false);
