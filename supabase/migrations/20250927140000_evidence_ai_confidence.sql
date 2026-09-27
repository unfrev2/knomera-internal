-- Carry research AI confidence onto accepted evidence rows.

ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(4, 3);

-- Backfill from accepted research findings.
UPDATE evidence e
SET
  ai_confidence = rf.ai_confidence,
  ai_assisted = true
FROM research_findings rf
WHERE e.research_finding_id = rf.id
  AND e.workspace_id = rf.workspace_id
  AND (e.ai_confidence IS NULL OR e.ai_assisted = false);
