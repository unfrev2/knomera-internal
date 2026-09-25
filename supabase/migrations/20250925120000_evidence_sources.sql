-- Structured evidence provenance (non-destructive)
-- Adds organisation/contact attribution, reusable standalone sources,
-- and backfills organisation/contact from existing discovery sessions.
-- Does not drop evidence.source or change existing IDs.

DO $$ BEGIN
  CREATE TYPE evidence_source_type AS ENUM ('link', 'free_text');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  type evidence_source_type NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT evidence_sources_id_workspace_unique UNIQUE (id, workspace_id)
);

ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS organisation_id UUID;
ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS contact_id UUID;
ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS evidence_source_id UUID;

DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_organisation_fk
    FOREIGN KEY (organisation_id, workspace_id)
    REFERENCES organisations (id, workspace_id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_contact_fk
    FOREIGN KEY (contact_id, workspace_id)
    REFERENCES contacts (id, workspace_id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_source_fk
    FOREIGN KEY (evidence_source_id, workspace_id)
    REFERENCES evidence_sources (id, workspace_id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS evidence_sources_workspace_id_idx
  ON evidence_sources (workspace_id);
CREATE INDEX IF NOT EXISTS evidence_organisation_id_idx
  ON evidence (workspace_id, organisation_id)
  WHERE organisation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS evidence_contact_id_idx
  ON evidence (workspace_id, contact_id)
  WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS evidence_workspace_discovery_session_id_idx
  ON evidence (workspace_id, discovery_session_id)
  WHERE discovery_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS evidence_source_id_idx
  ON evidence (workspace_id, evidence_source_id)
  WHERE evidence_source_id IS NOT NULL;

DROP TRIGGER IF EXISTS evidence_sources_set_updated_at ON evidence_sources;
CREATE TRIGGER evidence_sources_set_updated_at
  BEFORE UPDATE ON evidence_sources
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Preserve existing discovery provenance and copy unambiguous org/contact.
UPDATE evidence e
SET
  organisation_id = COALESCE(e.organisation_id, s.organisation_id),
  contact_id = COALESCE(e.contact_id, s.contact_id)
FROM discovery_sessions s
WHERE e.discovery_session_id = s.id
  AND e.workspace_id = s.workspace_id
  AND (e.organisation_id IS NULL OR (e.contact_id IS NULL AND s.contact_id IS NOT NULL));

REVOKE ALL ON TABLE evidence_sources FROM anon, authenticated;
ALTER TABLE evidence_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all_evidence_sources ON evidence_sources;
CREATE POLICY deny_all_evidence_sources ON evidence_sources
  FOR ALL TO anon, authenticated USING (false);
