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

DO $$ BEGIN
  CREATE TYPE organisation_type AS ENUM (
    'prospect',
    'customer',
    'partner',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE decision_status AS ENUM (
    'active',
    'superseded',
    'revisiting'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

DO $$ BEGIN
  ALTER TYPE evidence_type ADD VALUE IF NOT EXISTS 'bet_outcome';
EXCEPTION
  WHEN duplicate_object THEN NULL;
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
  discovery_session_id UUID,
  bet_outcome_id UUID,
  CONSTRAINT evidence_workspace_assumption_fk
    FOREIGN KEY (assumption_id, workspace_id)
    REFERENCES assumptions (id, workspace_id),
  CONSTRAINT evidence_id_workspace_unique UNIQUE (id, workspace_id)
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

-- Evidence may optionally point at a discovery session (set after sessions exist).
-- Single-column FK: composite ON DELETE SET NULL would also null workspace_id.
DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_discovery_session_fk
    FOREIGN KEY (discovery_session_id)
    REFERENCES discovery_sessions (id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE evidence
    ADD CONSTRAINT evidence_bet_outcome_fk
    FOREIGN KEY (bet_outcome_id)
    REFERENCES bet_outcomes (id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

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

DROP TRIGGER IF EXISTS decisions_set_updated_at ON decisions;
CREATE TRIGGER decisions_set_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

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
REVOKE ALL ON TABLE organisations FROM anon, authenticated;
REVOKE ALL ON TABLE contacts FROM anon, authenticated;
REVOKE ALL ON TABLE discovery_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE discovery_problems FROM anon, authenticated;
REVOKE ALL ON TABLE decisions FROM anon, authenticated;
REVOKE ALL ON TABLE decision_assumptions FROM anon, authenticated;
REVOKE ALL ON TABLE decision_evidence FROM anon, authenticated;
REVOKE ALL ON TABLE decision_problems FROM anon, authenticated;
REVOKE ALL ON TABLE ideas FROM anon, authenticated;
REVOKE ALL ON TABLE idea_problems FROM anon, authenticated;
REVOKE ALL ON TABLE idea_assumptions FROM anon, authenticated;
REVOKE ALL ON TABLE bets FROM anon, authenticated;
REVOKE ALL ON TABLE bet_problems FROM anon, authenticated;
REVOKE ALL ON TABLE bet_assumptions FROM anon, authenticated;
REVOKE ALL ON TABLE bet_outcomes FROM anon, authenticated;
REVOKE ALL ON TABLE decision_bets FROM anon, authenticated;

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
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_bets ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS deny_all_organisations ON organisations;
CREATE POLICY deny_all_organisations ON organisations FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_contacts ON contacts;
CREATE POLICY deny_all_contacts ON contacts FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_discovery_sessions ON discovery_sessions;
CREATE POLICY deny_all_discovery_sessions ON discovery_sessions FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_discovery_problems ON discovery_problems;
CREATE POLICY deny_all_discovery_problems ON discovery_problems FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_decisions ON decisions;
CREATE POLICY deny_all_decisions ON decisions FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_decision_assumptions ON decision_assumptions;
CREATE POLICY deny_all_decision_assumptions ON decision_assumptions FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_decision_evidence ON decision_evidence;
CREATE POLICY deny_all_decision_evidence ON decision_evidence FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS deny_all_decision_problems ON decision_problems;
CREATE POLICY deny_all_decision_problems ON decision_problems FOR ALL TO anon, authenticated USING (false);

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
