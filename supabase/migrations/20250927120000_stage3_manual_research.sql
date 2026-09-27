-- Stage 3: manual external research support (additive).
-- Competitor org type + evidence provenance for accepted research findings.

DO $$ BEGIN
  ALTER TYPE organisation_type ADD VALUE IF NOT EXISTS 'competitor';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS research_finding_id UUID;

ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_research_finding_fk
    FOREIGN KEY (research_finding_id, workspace_id)
    REFERENCES research_findings (id, workspace_id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS evidence_research_finding_idx
  ON evidence (workspace_id, research_finding_id)
  WHERE research_finding_id IS NOT NULL;
