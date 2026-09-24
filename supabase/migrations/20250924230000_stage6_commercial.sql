-- Stage 6 — Commercial (non-destructive)
-- Opportunities reuse organisations/contacts. Commercial behaviour → evidence
-- only when founders explicitly interpret it (opportunity_id provenance).

DO $$ BEGIN
  CREATE TYPE opportunity_stage AS ENUM (
    'prospect',
    'discovery',
    'interested',
    'proposal',
    'pilot',
    'won',
    'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL,
  title TEXT NOT NULL,
  stage opportunity_stage NOT NULL DEFAULT 'prospect',
  potential_value NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'GBP',
  owner TEXT,
  next_action TEXT,
  next_action_date DATE,
  outcome_reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT opportunities_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT opportunities_organisation_fk
    FOREIGN KEY (organisation_id, workspace_id)
    REFERENCES organisations (id, workspace_id)
    ON DELETE CASCADE
);

-- Optional provenance: evidence created from commercial behaviour.
ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS opportunity_id UUID;

DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_opportunity_fk
    FOREIGN KEY (opportunity_id)
    REFERENCES opportunities (id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS opportunities_workspace_id_idx
  ON opportunities (workspace_id, stage);
CREATE INDEX IF NOT EXISTS opportunities_organisation_id_idx
  ON opportunities (organisation_id);
CREATE INDEX IF NOT EXISTS opportunities_next_action_date_idx
  ON opportunities (workspace_id, next_action_date)
  WHERE next_action_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS evidence_opportunity_id_idx
  ON evidence (opportunity_id)
  WHERE opportunity_id IS NOT NULL;

DROP TRIGGER IF EXISTS opportunities_set_updated_at ON opportunities;
CREATE TRIGGER opportunities_set_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

REVOKE ALL ON TABLE opportunities FROM anon, authenticated;

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_opportunities ON opportunities;
CREATE POLICY deny_all_opportunities ON opportunities
  FOR ALL TO anon, authenticated USING (false);
