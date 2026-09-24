-- Stage 3 — Discovery (non-destructive)
-- Organisations, contacts, discovery sessions, problem links,
-- and optional evidence provenance via discovery_session_id.
-- Does not drop or truncate existing tables. Existing evidence remains valid.

DO $$ BEGIN
  CREATE TYPE organisation_type AS ENUM (
    'prospect',
    'customer',
    'partner',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  organisation_type organisation_type NOT NULL DEFAULT 'prospect',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organisations_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contacts_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT contacts_organisation_fk
    FOREIGN KEY (organisation_id, workspace_id)
    REFERENCES organisations (id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL,
  contact_id UUID,
  title TEXT NOT NULL,
  session_date DATE NOT NULL,
  conducted_by TEXT,
  summary TEXT,
  raw_notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discovery_sessions_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT discovery_sessions_organisation_fk
    FOREIGN KEY (organisation_id, workspace_id)
    REFERENCES organisations (id, workspace_id),
  CONSTRAINT discovery_sessions_contact_fk
    FOREIGN KEY (contact_id, workspace_id)
    REFERENCES contacts (id, workspace_id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS discovery_problems (
  discovery_session_id UUID NOT NULL,
  problem_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  PRIMARY KEY (discovery_session_id, problem_id),
  CONSTRAINT discovery_problems_session_fk
    FOREIGN KEY (discovery_session_id, workspace_id)
    REFERENCES discovery_sessions (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT discovery_problems_problem_fk
    FOREIGN KEY (problem_id, workspace_id)
    REFERENCES problems (id, workspace_id)
    ON DELETE CASCADE
);

-- Additive provenance column on existing evidence (nullable; existing rows stay valid).
ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS discovery_session_id UUID;

DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_discovery_session_fk
    FOREIGN KEY (discovery_session_id)
    REFERENCES discovery_sessions (id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS organisations_workspace_id_idx
  ON organisations (workspace_id);
CREATE INDEX IF NOT EXISTS organisations_name_idx
  ON organisations (workspace_id, name);
CREATE INDEX IF NOT EXISTS contacts_workspace_id_idx ON contacts (workspace_id);
CREATE INDEX IF NOT EXISTS contacts_organisation_id_idx
  ON contacts (organisation_id);
CREATE INDEX IF NOT EXISTS discovery_sessions_workspace_id_idx
  ON discovery_sessions (workspace_id, session_date DESC);
CREATE INDEX IF NOT EXISTS discovery_sessions_organisation_id_idx
  ON discovery_sessions (organisation_id);
CREATE INDEX IF NOT EXISTS discovery_problems_problem_id_idx
  ON discovery_problems (problem_id);
CREATE INDEX IF NOT EXISTS evidence_discovery_session_id_idx
  ON evidence (discovery_session_id)
  WHERE discovery_session_id IS NOT NULL;

DROP TRIGGER IF EXISTS organisations_set_updated_at ON organisations;
CREATE TRIGGER organisations_set_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS contacts_set_updated_at ON contacts;
CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS discovery_sessions_set_updated_at ON discovery_sessions;
CREATE TRIGGER discovery_sessions_set_updated_at
  BEFORE UPDATE ON discovery_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

REVOKE ALL ON TABLE organisations FROM anon, authenticated;
REVOKE ALL ON TABLE contacts FROM anon, authenticated;
REVOKE ALL ON TABLE discovery_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE discovery_problems FROM anon, authenticated;

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_organisations ON organisations;
CREATE POLICY deny_all_organisations ON organisations
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_contacts ON contacts;
CREATE POLICY deny_all_contacts ON contacts
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_discovery_sessions ON discovery_sessions;
CREATE POLICY deny_all_discovery_sessions ON discovery_sessions
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_discovery_problems ON discovery_problems;
CREATE POLICY deny_all_discovery_problems ON discovery_problems
  FOR ALL TO anon, authenticated USING (false);
