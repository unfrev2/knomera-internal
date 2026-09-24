-- Knomera Assumption Log — schema
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS patterns where practical.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE importance_level AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE confidence_level AS ENUM ('low', 'medium', 'high', 'proven');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assumption_status AS ENUM (
    'untested',
    'testing',
    'supported',
    'challenged',
    'disproved'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE evidence_type AS ENUM (
    'founder_reasoning',
    'customer_interview',
    'data_analysis',
    'prototype',
    'competitor_research',
    'behavioural',
    'commercial',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE evidence_direction AS ENUM ('supports', 'challenges', 'neutral');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  seed_key TEXT,
  statement TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  importance importance_level NOT NULL,
  confidence confidence_level NOT NULL,
  status assumption_status NOT NULL DEFAULT 'untested',
  owner TEXT,
  next_action TEXT,
  target_date DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT assumptions_workspace_statement_unique UNIQUE (workspace_id, statement),
  CONSTRAINT assumptions_workspace_seed_key_unique UNIQUE (workspace_id, seed_key),
  CONSTRAINT assumptions_id_workspace_unique UNIQUE (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  assumption_id UUID NOT NULL REFERENCES assumptions (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  evidence_type evidence_type NOT NULL,
  strength INTEGER NOT NULL CHECK (strength BETWEEN 1 AND 5),
  direction evidence_direction NOT NULL,
  source TEXT,
  evidence_date DATE NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT evidence_workspace_assumption_fk
    FOREIGN KEY (assumption_id, workspace_id)
    REFERENCES assumptions (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS assumption_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  assumption_id UUID NOT NULL REFERENCES assumptions (id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tracks applied files from supabase/migrations/ (existing DBs use npm run db:migrate).
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS assumptions_workspace_id_idx ON assumptions (workspace_id);
CREATE INDEX IF NOT EXISTS assumptions_category_idx ON assumptions (workspace_id, category);
CREATE INDEX IF NOT EXISTS assumptions_importance_idx ON assumptions (workspace_id, importance);
CREATE INDEX IF NOT EXISTS assumptions_confidence_idx ON assumptions (workspace_id, confidence);
CREATE INDEX IF NOT EXISTS assumptions_status_idx ON assumptions (workspace_id, status);
CREATE INDEX IF NOT EXISTS assumptions_owner_idx ON assumptions (workspace_id, owner);
CREATE INDEX IF NOT EXISTS evidence_workspace_id_idx ON evidence (workspace_id);
CREATE INDEX IF NOT EXISTS evidence_assumption_id_idx ON evidence (assumption_id);
CREATE INDEX IF NOT EXISTS evidence_evidence_date_idx ON evidence (workspace_id, evidence_date DESC);
CREATE INDEX IF NOT EXISTS assumption_history_assumption_id_idx
  ON assumption_history (assumption_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS strategy_items_workspace_id_idx
  ON strategy_items (workspace_id, sort_order, type);
CREATE INDEX IF NOT EXISTS problems_workspace_id_idx ON problems (workspace_id);
CREATE INDEX IF NOT EXISTS problems_status_idx ON problems (workspace_id, status);
CREATE INDEX IF NOT EXISTS problems_severity_idx ON problems (workspace_id, severity);
CREATE INDEX IF NOT EXISTS problem_assumptions_assumption_id_idx
  ON problem_assumptions (assumption_id);
CREATE INDEX IF NOT EXISTS problem_assumptions_workspace_id_idx
  ON problem_assumptions (workspace_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assumptions_set_updated_at ON assumptions;
CREATE TRIGGER assumptions_set_updated_at
  BEFORE UPDATE ON assumptions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

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

-- ---------------------------------------------------------------------------
-- Assumption history trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION record_assumption_history()
RETURNS TRIGGER AS $$
DECLARE
  tracked TEXT[] := ARRAY[
    'confidence',
    'importance',
    'status',
    'owner',
    'next_action',
    'target_date'
  ];
  field TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOREACH field IN ARRAY tracked LOOP
    EXECUTE format('SELECT ($1).%I::text', field) INTO old_val USING OLD;
    EXECUTE format('SELECT ($1).%I::text', field) INTO new_val USING NEW;

    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO assumption_history (
        workspace_id,
        assumption_id,
        field_changed,
        old_value,
        new_value,
        changed_by
      ) VALUES (
        NEW.workspace_id,
        NEW.id,
        field,
        old_val,
        new_val,
        COALESCE(current_setting('app.changed_by', true), NEW.created_by)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assumptions_record_history ON assumptions;
CREATE TRIGGER assumptions_record_history
  AFTER UPDATE ON assumptions
  FOR EACH ROW
  EXECUTE FUNCTION record_assumption_history();

-- ---------------------------------------------------------------------------
-- Security: revoke direct API access for anon / authenticated
-- Application uses the Postgres connection (server-side only).
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE workspaces FROM anon, authenticated;
REVOKE ALL ON TABLE assumptions FROM anon, authenticated;
REVOKE ALL ON TABLE evidence FROM anon, authenticated;
REVOKE ALL ON TABLE assumption_history FROM anon, authenticated;
REVOKE ALL ON TABLE schema_migrations FROM anon, authenticated;
REVOKE ALL ON TABLE strategy_items FROM anon, authenticated;
REVOKE ALL ON TABLE problems FROM anon, authenticated;
REVOKE ALL ON TABLE problem_assumptions FROM anon, authenticated;

REVOKE ALL ON SCHEMA public FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO postgres, service_role;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE assumption_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_assumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_workspaces ON workspaces;
CREATE POLICY deny_all_workspaces ON workspaces FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_assumptions ON assumptions;
CREATE POLICY deny_all_assumptions ON assumptions FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_evidence ON evidence;
CREATE POLICY deny_all_evidence ON evidence FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_assumption_history ON assumption_history;
CREATE POLICY deny_all_assumption_history ON assumption_history FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_schema_migrations ON schema_migrations;
CREATE POLICY deny_all_schema_migrations ON schema_migrations FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_strategy_items ON strategy_items;
CREATE POLICY deny_all_strategy_items ON strategy_items FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_problems ON problems;
CREATE POLICY deny_all_problems ON problems FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_problem_assumptions ON problem_assumptions;
CREATE POLICY deny_all_problem_assumptions ON problem_assumptions FOR ALL TO anon, authenticated USING (false);
