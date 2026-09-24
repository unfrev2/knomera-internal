-- Entity change history for problems, decisions, bets, and opportunities.
-- Additive. Does not alter existing assumption_history.

CREATE TABLE IF NOT EXISTS entity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entity_history_type_check CHECK (
    entity_type IN ('problem', 'decision', 'bet', 'opportunity')
  )
);

CREATE INDEX IF NOT EXISTS entity_history_entity_idx
  ON entity_history (workspace_id, entity_type, entity_id, changed_at DESC);

CREATE OR REPLACE FUNCTION record_entity_history()
RETURNS TRIGGER AS $$
DECLARE
  entity_type TEXT := TG_ARGV[0];
  tracked TEXT[] := string_to_array(TG_ARGV[1], ',');
  field TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOREACH field IN ARRAY tracked LOOP
    EXECUTE format('SELECT ($1).%I::text', field) INTO old_val USING OLD;
    EXECUTE format('SELECT ($1).%I::text', field) INTO new_val USING NEW;

    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO entity_history (
        workspace_id,
        entity_type,
        entity_id,
        field_changed,
        old_value,
        new_value,
        changed_by
      ) VALUES (
        NEW.workspace_id,
        entity_type,
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

DROP TRIGGER IF EXISTS problems_record_history ON problems;
CREATE TRIGGER problems_record_history
  AFTER UPDATE ON problems
  FOR EACH ROW
  EXECUTE FUNCTION record_entity_history('problem', 'status,confidence,severity,owner');

DROP TRIGGER IF EXISTS decisions_record_history ON decisions;
CREATE TRIGGER decisions_record_history
  AFTER UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION record_entity_history('decision', 'status,decided_by,decision_date,revisit_date');

DROP TRIGGER IF EXISTS bets_record_history ON bets;
CREATE TRIGGER bets_record_history
  AFTER UPDATE ON bets
  FOR EACH ROW
  EXECUTE FUNCTION record_entity_history('bet', 'status,owner,target_date');

DROP TRIGGER IF EXISTS opportunities_record_history ON opportunities;
CREATE TRIGGER opportunities_record_history
  AFTER UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION record_entity_history('opportunity', 'stage,owner,next_action,next_action_date');

REVOKE ALL ON TABLE entity_history FROM anon, authenticated;
ALTER TABLE entity_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all_entity_history ON entity_history;
CREATE POLICY deny_all_entity_history ON entity_history
  FOR ALL TO anon, authenticated USING (false);
