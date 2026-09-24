-- Stage 4 — Decisions (non-destructive)
-- Decision log with typed links to assumptions, evidence and problems.
-- Does not alter or delete existing domain data.

DO $$ BEGIN
  CREATE TYPE decision_status AS ENUM (
    'active',
    'superseded',
    'revisiting'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Needed for composite workspace-scoped evidence FKs.
DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_id_workspace_unique UNIQUE (id, workspace_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  decision TEXT NOT NULL,
  context TEXT,
  rationale TEXT,
  status decision_status NOT NULL DEFAULT 'active',
  decision_date DATE NOT NULL DEFAULT CURRENT_DATE,
  decided_by TEXT,
  revisit_trigger TEXT,
  revisit_date DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT decisions_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS decision_assumptions (
  decision_id UUID NOT NULL,
  assumption_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  PRIMARY KEY (decision_id, assumption_id),
  CONSTRAINT decision_assumptions_decision_fk
    FOREIGN KEY (decision_id, workspace_id)
    REFERENCES decisions (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT decision_assumptions_assumption_fk
    FOREIGN KEY (assumption_id, workspace_id)
    REFERENCES assumptions (id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS decision_evidence (
  decision_id UUID NOT NULL,
  evidence_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  PRIMARY KEY (decision_id, evidence_id),
  CONSTRAINT decision_evidence_decision_fk
    FOREIGN KEY (decision_id, workspace_id)
    REFERENCES decisions (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT decision_evidence_evidence_fk
    FOREIGN KEY (evidence_id, workspace_id)
    REFERENCES evidence (id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS decision_problems (
  decision_id UUID NOT NULL,
  problem_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  PRIMARY KEY (decision_id, problem_id),
  CONSTRAINT decision_problems_decision_fk
    FOREIGN KEY (decision_id, workspace_id)
    REFERENCES decisions (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT decision_problems_problem_fk
    FOREIGN KEY (problem_id, workspace_id)
    REFERENCES problems (id, workspace_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS decisions_workspace_id_idx
  ON decisions (workspace_id, decision_date DESC);
CREATE INDEX IF NOT EXISTS decisions_status_idx
  ON decisions (workspace_id, status);
CREATE INDEX IF NOT EXISTS decision_assumptions_assumption_id_idx
  ON decision_assumptions (assumption_id);
CREATE INDEX IF NOT EXISTS decision_evidence_evidence_id_idx
  ON decision_evidence (evidence_id);
CREATE INDEX IF NOT EXISTS decision_problems_problem_id_idx
  ON decision_problems (problem_id);

DROP TRIGGER IF EXISTS decisions_set_updated_at ON decisions;
CREATE TRIGGER decisions_set_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

REVOKE ALL ON TABLE decisions FROM anon, authenticated;
REVOKE ALL ON TABLE decision_assumptions FROM anon, authenticated;
REVOKE ALL ON TABLE decision_evidence FROM anon, authenticated;
REVOKE ALL ON TABLE decision_problems FROM anon, authenticated;

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_decisions ON decisions;
CREATE POLICY deny_all_decisions ON decisions
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_decision_assumptions ON decision_assumptions;
CREATE POLICY deny_all_decision_assumptions ON decision_assumptions
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_decision_evidence ON decision_evidence;
CREATE POLICY deny_all_decision_evidence ON decision_evidence
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_decision_problems ON decision_problems;
CREATE POLICY deny_all_decision_problems ON decision_problems
  FOR ALL TO anon, authenticated USING (false);
