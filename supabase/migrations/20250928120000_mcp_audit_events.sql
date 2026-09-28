CREATE TABLE IF NOT EXISTS mcp_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  mcp_client TEXT,
  tool_name TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  target_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  request_id TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS mcp_audit_events_workspace_created_idx
  ON mcp_audit_events (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mcp_audit_events_tool_idx
  ON mcp_audit_events (workspace_id, tool_name, created_at DESC);

REVOKE ALL ON TABLE mcp_audit_events FROM anon, authenticated;
ALTER TABLE mcp_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_mcp_audit_events ON mcp_audit_events;
CREATE POLICY deny_all_mcp_audit_events ON mcp_audit_events
  FOR ALL TO anon, authenticated USING (false);
