-- Stage 1 — Foundation (non-destructive)
--
-- Introduces migration tracking only. Does not alter assumptions, evidence,
-- assumption_history, or workspaces. Safe to run against the existing
-- Knomera production database.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep PostgREST / anon API closed for the new table (matches existing model).
REVOKE ALL ON TABLE schema_migrations FROM anon, authenticated;

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_schema_migrations ON schema_migrations;
CREATE POLICY deny_all_schema_migrations ON schema_migrations
  FOR ALL TO anon, authenticated
  USING (false);
