-- Stage 1 research foundation (additive, non-destructive).
-- AI identity is TEXT attribution only (created_by = 'ai') — not a login account.
-- Research findings are a review queue; they are not canonical Evidence until accepted.

-- ---------------------------------------------------------------------------
-- Evidence type + class
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER TYPE evidence_type ADD VALUE IF NOT EXISTS 'market_research';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE evidence_class AS ENUM ('direct', 'secondary', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS evidence_class evidence_class;

UPDATE evidence SET evidence_class = CASE
  WHEN evidence_type::text IN ('competitor_research', 'market_research') THEN 'secondary'::evidence_class
  WHEN evidence_type::text = 'founder_reasoning' THEN 'internal'::evidence_class
  ELSE 'direct'::evidence_class
END
WHERE evidence_class IS NULL;

ALTER TABLE evidence
  ALTER COLUMN evidence_class SET DEFAULT 'direct'::evidence_class;

ALTER TABLE evidence
  ALTER COLUMN evidence_class SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Evidence source metadata for public research provenance
-- ---------------------------------------------------------------------------

ALTER TABLE evidence_sources
  ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE evidence_sources
  ADD COLUMN IF NOT EXISTS published_at DATE;
ALTER TABLE evidence_sources
  ADD COLUMN IF NOT EXISTS retrieved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS evidence_sources_canonical_url_idx
  ON evidence_sources (workspace_id, canonical_url)
  WHERE canonical_url IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Research enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE research_type AS ENUM ('competitor', 'market', 'assumption');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE research_trigger_type AS ENUM ('manual', 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE research_run_status AS ENUM (
    'queued',
    'running',
    'completed',
    'partial',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE research_finding_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'duplicate'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Research runs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  research_type research_type NOT NULL,
  trigger_type research_trigger_type NOT NULL DEFAULT 'manual',
  status research_run_status NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  triggered_by TEXT,
  assumptions_considered INTEGER NOT NULL DEFAULT 0,
  sources_examined INTEGER NOT NULL DEFAULT 0,
  findings_created INTEGER NOT NULL DEFAULT 0,
  search_queries_used INTEGER NOT NULL DEFAULT 0,
  ai_calls INTEGER NOT NULL DEFAULT 0,
  search_calls INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(12, 6),
  error TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT research_runs_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE INDEX IF NOT EXISTS research_runs_workspace_created_idx
  ON research_runs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS research_runs_workspace_status_idx
  ON research_runs (workspace_id, status);

-- ---------------------------------------------------------------------------
-- Research findings (review queue — not canonical evidence)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS research_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  research_run_id UUID NOT NULL,
  research_type research_type NOT NULL,
  organisation_id UUID,
  claim TEXT NOT NULL,
  summary TEXT,
  status research_finding_status NOT NULL DEFAULT 'pending',
  ai_confidence NUMERIC(4, 3),
  suggested_strength INTEGER CHECK (
    suggested_strength IS NULL OR suggested_strength BETWEEN 1 AND 5
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  CONSTRAINT research_findings_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT research_findings_run_fk
    FOREIGN KEY (research_run_id, workspace_id)
    REFERENCES research_runs (id, workspace_id)
    ON DELETE CASCADE
);

DO $$ BEGIN
  ALTER TABLE research_findings
    ADD CONSTRAINT research_findings_organisation_fk
    FOREIGN KEY (organisation_id, workspace_id)
    REFERENCES organisations (id, workspace_id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS research_findings_workspace_status_idx
  ON research_findings (workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS research_findings_run_idx
  ON research_findings (workspace_id, research_run_id);

-- ---------------------------------------------------------------------------
-- Finding ↔ assumption relationships
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS research_finding_assumptions (
  research_finding_id UUID NOT NULL,
  assumption_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  direction evidence_direction NOT NULL DEFAULT 'neutral',
  relevance TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (research_finding_id, assumption_id),
  CONSTRAINT research_finding_assumptions_finding_fk
    FOREIGN KEY (research_finding_id, workspace_id)
    REFERENCES research_findings (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT research_finding_assumptions_assumption_fk
    FOREIGN KEY (assumption_id, workspace_id)
    REFERENCES assumptions (id, workspace_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS research_finding_assumptions_assumption_idx
  ON research_finding_assumptions (assumption_id);

-- ---------------------------------------------------------------------------
-- Finding ↔ evidence_sources (reuse structured sources)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS research_finding_sources (
  research_finding_id UUID NOT NULL,
  evidence_source_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (research_finding_id, evidence_source_id),
  CONSTRAINT research_finding_sources_finding_fk
    FOREIGN KEY (research_finding_id, workspace_id)
    REFERENCES research_findings (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT research_finding_sources_source_fk
    FOREIGN KEY (evidence_source_id, workspace_id)
    REFERENCES evidence_sources (id, workspace_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS research_finding_sources_source_idx
  ON research_finding_sources (evidence_source_id);

-- ---------------------------------------------------------------------------
-- Security: revoke API roles (app uses server Postgres only)
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE research_runs FROM anon, authenticated;
REVOKE ALL ON TABLE research_findings FROM anon, authenticated;
REVOKE ALL ON TABLE research_finding_assumptions FROM anon, authenticated;
REVOKE ALL ON TABLE research_finding_sources FROM anon, authenticated;

ALTER TABLE research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_finding_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_finding_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_research_runs ON research_runs;
CREATE POLICY deny_all_research_runs ON research_runs
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_research_findings ON research_findings;
CREATE POLICY deny_all_research_findings ON research_findings
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_research_finding_assumptions ON research_finding_assumptions;
CREATE POLICY deny_all_research_finding_assumptions ON research_finding_assumptions
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_research_finding_sources ON research_finding_sources;
CREATE POLICY deny_all_research_finding_sources ON research_finding_sources
  FOR ALL TO anon, authenticated USING (false);
