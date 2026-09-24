-- Proactive experimentation coworker content revision (no schema changes).
--
-- Canonical content definitions live in:
--   src/lib/seed/{strategy,problems,assumptions,ideas,bets,decisions}.ts
--   scripts/seed-proactive-content.ts
--
-- Apply content with:
--   npm run db:seed:proactive
--
-- This migration records that the content package is part of the deployment
-- history. The TypeScript seed is idempotent and is the authoritative applicator
-- (seed_key upserts, relationship corrections, decisions/focus without seed_key).

DO $$
BEGIN
  -- Intentionally empty: content is applied by db:seed:proactive.
  -- Keeping a SQL migration entry preserves ordered history alongside schema migrations.
  NULL;
END $$;
