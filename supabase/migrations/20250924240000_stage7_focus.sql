-- Stage 7 — Focus (non-destructive)
-- Lightweight weekly focus for Jon and Ahmed. Not project management.

DO $$ BEGIN
  CREATE TYPE focus_item_status AS ENUM (
    'planned',
    'active',
    'done',
    'dropped'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS focus_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  owner TEXT NOT NULL,
  week_start DATE NOT NULL,
  status focus_item_status NOT NULL DEFAULT 'planned',
  linked_assumption_id UUID,
  linked_bet_id UUID,
  linked_opportunity_id UUID,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT focus_items_id_workspace_unique UNIQUE (id, workspace_id)
);

-- Single-column FKs with SET NULL (avoid composite SET NULL nulling workspace_id).
DO $$ BEGIN
  ALTER TABLE focus_items
    ADD CONSTRAINT focus_items_assumption_fk
    FOREIGN KEY (linked_assumption_id)
    REFERENCES assumptions (id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE focus_items
    ADD CONSTRAINT focus_items_bet_fk
    FOREIGN KEY (linked_bet_id)
    REFERENCES bets (id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE focus_items
    ADD CONSTRAINT focus_items_opportunity_fk
    FOREIGN KEY (linked_opportunity_id)
    REFERENCES opportunities (id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS focus_items_workspace_week_idx
  ON focus_items (workspace_id, week_start DESC, owner);
CREATE INDEX IF NOT EXISTS focus_items_status_idx
  ON focus_items (workspace_id, status);

REVOKE ALL ON TABLE focus_items FROM anon, authenticated;
ALTER TABLE focus_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_focus_items ON focus_items;
CREATE POLICY deny_all_focus_items ON focus_items
  FOR ALL TO anon, authenticated USING (false);
