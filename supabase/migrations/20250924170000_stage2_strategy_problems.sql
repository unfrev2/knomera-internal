-- Stage 2 — Strategy & Problems (non-destructive)
-- Adds strategy_items, problems, and problem_assumptions.
-- Does not alter assumptions, evidence, or assumption_history rows.

DO $$ BEGIN
  CREATE TYPE strategy_item_type AS ENUM (
    'north_star',
    'positioning',
    'target_customer',
    'initial_wedge',
    'principle',
    'vision'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE strategy_item_status AS ENUM (
    'draft',
    'active',
    'retired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE problem_status AS ENUM (
    'observed',
    'validating',
    'validated',
    'deprioritised'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE problem_assumption_relationship AS ENUM (
    'supports_problem',
    'depends_on',
    'related'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS strategy_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  seed_key TEXT,
  type strategy_item_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status strategy_item_status NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT strategy_items_workspace_seed_key_unique UNIQUE (workspace_id, seed_key),
  CONSTRAINT strategy_items_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  seed_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status problem_status NOT NULL DEFAULT 'observed',
  severity importance_level NOT NULL DEFAULT 'medium',
  confidence confidence_level NOT NULL DEFAULT 'low',
  target_customer TEXT,
  owner TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT problems_workspace_seed_key_unique UNIQUE (workspace_id, seed_key),
  CONSTRAINT problems_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS problem_assumptions (
  problem_id UUID NOT NULL,
  assumption_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  relationship_type problem_assumption_relationship NOT NULL DEFAULT 'supports_problem',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  PRIMARY KEY (problem_id, assumption_id),
  CONSTRAINT problem_assumptions_problem_fk
    FOREIGN KEY (problem_id, workspace_id)
    REFERENCES problems (id, workspace_id)
    ON DELETE CASCADE,
  CONSTRAINT problem_assumptions_assumption_fk
    FOREIGN KEY (assumption_id, workspace_id)
    REFERENCES assumptions (id, workspace_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS strategy_items_workspace_id_idx
  ON strategy_items (workspace_id, sort_order, type);
CREATE INDEX IF NOT EXISTS problems_workspace_id_idx ON problems (workspace_id);
CREATE INDEX IF NOT EXISTS problems_status_idx ON problems (workspace_id, status);
CREATE INDEX IF NOT EXISTS problems_severity_idx ON problems (workspace_id, severity);
CREATE INDEX IF NOT EXISTS problem_assumptions_assumption_id_idx
  ON problem_assumptions (assumption_id);
CREATE INDEX IF NOT EXISTS problem_assumptions_workspace_id_idx
  ON problem_assumptions (workspace_id);

DROP TRIGGER IF EXISTS strategy_items_set_updated_at ON strategy_items;
CREATE TRIGGER strategy_items_set_updated_at
  BEFORE UPDATE ON strategy_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS problems_set_updated_at ON problems;
CREATE TRIGGER problems_set_updated_at
  BEFORE UPDATE ON problems
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

REVOKE ALL ON TABLE strategy_items FROM anon, authenticated;
REVOKE ALL ON TABLE problems FROM anon, authenticated;
REVOKE ALL ON TABLE problem_assumptions FROM anon, authenticated;

ALTER TABLE strategy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_assumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_strategy_items ON strategy_items;
CREATE POLICY deny_all_strategy_items ON strategy_items
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_problems ON problems;
CREATE POLICY deny_all_problems ON problems
  FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_problem_assumptions ON problem_assumptions;
CREATE POLICY deny_all_problem_assumptions ON problem_assumptions
  FOR ALL TO anon, authenticated USING (false);
