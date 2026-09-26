-- Latency instrumentation for evidence matching (additive).

ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS handler_path TEXT;

ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS latency_candidate_ms INTEGER;

ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS latency_fast_ms INTEGER;

ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS latency_reasoning_ms INTEGER;

ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS latency_save_ms INTEGER;

ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS reasoning_effort TEXT;

CREATE INDEX IF NOT EXISTS ai_usage_events_feature_handler_idx
  ON ai_usage_events (workspace_id, feature, handler_path, created_at DESC);
