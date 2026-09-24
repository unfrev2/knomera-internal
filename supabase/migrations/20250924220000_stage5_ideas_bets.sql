-- Stage 5 — Ideas & Bets (non-destructive)
-- Ideas inbox, product bets, outcomes, and typed relationship tables.
-- Does not alter existing assumption/evidence rows beyond additive enum/FK.

DO $$ BEGIN
  CREATE TYPE idea_status AS ENUM (
    'inbox',
    'exploring',
    'parked',
    'promoted',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bet_status AS ENUM (
    'proposed',
    'active',
    'paused',
    'completed',
    'abandoned'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bet_assumption_relationship AS ENUM (
    'depends_on',
    'tests',
    'informed_by'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bet_outcome_result AS ENUM (
    'successful',
    'mixed',
    'unsuccessful',
    'inconclusive'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Additive evidence type for bet outcomes (safe if already present).
DO $$ BEGIN
  ALTER TYPE evidence_type ADD VALUE IF NOT EXISTS 'bet_outcome';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  seed_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status idea_status NOT NULL DEFAULT 'inbox',
  submitted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ideas_workspace_seed_key_unique UNIQUE (workspace_id, seed_key),
  CONSTRAINT ideas_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS idea_problems (
  idea_id UUID NOT NULL,
  problem_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  PRIMARY KEY (idea_id, problem_id),
  CONSTRAINT idea_problems_idea_fk
    FOREIGN KEY (idea_id, workspace_id)
    REFERENCES ideas (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT idea_problems_problem_fk
    FOREIGN KEY (problem_id, workspace_id)
    REFERENCES problems (id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS idea_assumptions (
  idea_id UUID NOT NULL,
  assumption_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  PRIMARY KEY (idea_id, assumption_id),
  CONSTRAINT idea_assumptions_idea_fk
    FOREIGN KEY (idea_id, workspace_id)
    REFERENCES ideas (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT idea_assumptions_assumption_fk
    FOREIGN KEY (assumption_id, workspace_id)
    REFERENCES assumptions (id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  seed_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  status bet_status NOT NULL DEFAULT 'proposed',
  owner TEXT,
  started_at DATE,
  target_date DATE,
  success_criteria TEXT,
  expected_outcome TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bets_workspace_seed_key_unique UNIQUE (workspace_id, seed_key),
  CONSTRAINT bets_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS bet_problems (
  bet_id UUID NOT NULL,
  problem_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  PRIMARY KEY (bet_id, problem_id),
  CONSTRAINT bet_problems_bet_fk
    FOREIGN KEY (bet_id, workspace_id)
    REFERENCES bets (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT bet_problems_problem_fk
    FOREIGN KEY (problem_id, workspace_id)
    REFERENCES problems (id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bet_assumptions (
  bet_id UUID NOT NULL,
  assumption_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  relationship_type bet_assumption_relationship NOT NULL DEFAULT 'tests',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  PRIMARY KEY (bet_id, assumption_id),
  CONSTRAINT bet_assumptions_bet_fk
    FOREIGN KEY (bet_id, workspace_id)
    REFERENCES bets (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT bet_assumptions_assumption_fk
    FOREIGN KEY (assumption_id, workspace_id)
    REFERENCES assumptions (id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bet_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  bet_id UUID NOT NULL,
  summary TEXT NOT NULL,
  result bet_outcome_result NOT NULL,
  learning TEXT,
  outcome_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bet_outcomes_id_workspace_unique UNIQUE (id, workspace_id),
  CONSTRAINT bet_outcomes_bet_fk
    FOREIGN KEY (bet_id, workspace_id)
    REFERENCES bets (id, workspace_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS decision_bets (
  decision_id UUID NOT NULL,
  bet_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  PRIMARY KEY (decision_id, bet_id),
  CONSTRAINT decision_bets_decision_fk
    FOREIGN KEY (decision_id, workspace_id)
    REFERENCES decisions (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT decision_bets_bet_fk
    FOREIGN KEY (bet_id, workspace_id)
    REFERENCES bets (id, workspace_id)
    ON DELETE CASCADE
);

-- Optional provenance: evidence created from a bet outcome.
ALTER TABLE evidence
  ADD COLUMN IF NOT EXISTS bet_outcome_id UUID;

DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_bet_outcome_fk
    FOREIGN KEY (bet_outcome_id)
    REFERENCES bet_outcomes (id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS ideas_workspace_id_idx ON ideas (workspace_id, status);
CREATE INDEX IF NOT EXISTS idea_problems_problem_id_idx ON idea_problems (problem_id);
CREATE INDEX IF NOT EXISTS idea_assumptions_assumption_id_idx ON idea_assumptions (assumption_id);
CREATE INDEX IF NOT EXISTS bets_workspace_id_idx ON bets (workspace_id, status);
CREATE INDEX IF NOT EXISTS bet_problems_problem_id_idx ON bet_problems (problem_id);
CREATE INDEX IF NOT EXISTS bet_assumptions_assumption_id_idx ON bet_assumptions (assumption_id);
CREATE INDEX IF NOT EXISTS bet_outcomes_bet_id_idx ON bet_outcomes (bet_id, outcome_date DESC);
CREATE INDEX IF NOT EXISTS decision_bets_bet_id_idx ON decision_bets (bet_id);
CREATE INDEX IF NOT EXISTS evidence_bet_outcome_id_idx
  ON evidence (bet_outcome_id)
  WHERE bet_outcome_id IS NOT NULL;

DROP TRIGGER IF EXISTS ideas_set_updated_at ON ideas;
CREATE TRIGGER ideas_set_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS bets_set_updated_at ON bets;
CREATE TRIGGER bets_set_updated_at
  BEFORE UPDATE ON bets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

REVOKE ALL ON TABLE ideas FROM anon, authenticated;
REVOKE ALL ON TABLE idea_problems FROM anon, authenticated;
REVOKE ALL ON TABLE idea_assumptions FROM anon, authenticated;
REVOKE ALL ON TABLE bets FROM anon, authenticated;
REVOKE ALL ON TABLE bet_problems FROM anon, authenticated;
REVOKE ALL ON TABLE bet_assumptions FROM anon, authenticated;
REVOKE ALL ON TABLE bet_outcomes FROM anon, authenticated;
REVOKE ALL ON TABLE decision_bets FROM anon, authenticated;

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_ideas ON ideas;
CREATE POLICY deny_all_ideas ON ideas FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_idea_problems ON idea_problems;
CREATE POLICY deny_all_idea_problems ON idea_problems FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_idea_assumptions ON idea_assumptions;
CREATE POLICY deny_all_idea_assumptions ON idea_assumptions FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_bets ON bets;
CREATE POLICY deny_all_bets ON bets FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_bet_problems ON bet_problems;
CREATE POLICY deny_all_bet_problems ON bet_problems FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_bet_assumptions ON bet_assumptions;
CREATE POLICY deny_all_bet_assumptions ON bet_assumptions FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_bet_outcomes ON bet_outcomes;
CREATE POLICY deny_all_bet_outcomes ON bet_outcomes FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_decision_bets ON decision_bets;
CREATE POLICY deny_all_decision_bets ON decision_bets FOR ALL TO anon, authenticated USING (false);
