-- Stage 3 cleanup: record which web search provider handled each research run.

ALTER TABLE research_runs
  ADD COLUMN IF NOT EXISTS search_provider TEXT;
