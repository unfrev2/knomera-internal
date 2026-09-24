-- Fix: composite FK ON DELETE SET NULL also nulls workspace_id.
-- Use a single-column FK so only discovery_session_id is cleared.

ALTER TABLE evidence DROP CONSTRAINT IF EXISTS evidence_discovery_session_fk;

ALTER TABLE evidence
  ADD CONSTRAINT evidence_discovery_session_fk
  FOREIGN KEY (discovery_session_id)
  REFERENCES discovery_sessions (id)
  ON DELETE SET NULL;
