import bcrypt from "bcryptjs";
import { normalizePasswordHash } from "../src/lib/auth/passwords";
import { createAssumption, updateAssumption, listAssumptions, getAssumption } from "../src/lib/db/assumptions";
import { createEvidence, listEvidenceForAssumption } from "../src/lib/db/evidence";
import { listAssumptionHistory } from "../src/lib/db/history";
import { getWorkspaceBySlug } from "../src/lib/db/workspaces";
import { rankAssumptionsForValidation } from "../src/lib/domain/priority";
import { listEvidenceByAssumptionIds } from "../src/lib/db/evidence";
import { searchWorkspaceObjects } from "../src/lib/db/search";
import { getDb } from "../src/lib/db/client";
import { createSessionToken, readSessionToken } from "../src/lib/auth/session";
import type postgres from "postgres";

async function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`  ✓ ${message}`);
}

/**
 * Remove leftover smoke-test rows by naming conventions.
 * Safe to run at start/end/on failure — only matches smoke prefixes/patterns.
 */
async function cleanupSmokeArtifacts(
  sql: postgres.Sql,
  workspaceId: string,
): Promise<void> {
  const assumptionIds = (
    await sql<{ id: string }[]>`
      SELECT id FROM assumptions
      WHERE workspace_id = ${workspaceId}
        AND (
          statement ILIKE 'Smoke test assumption %'
          OR statement ILIKE 'Research foundation smoke %'
          OR statement ILIKE 'Stage 3 research smoke %'
        )
    `
  ).map((r) => r.id);

  const orgIds = (
    await sql<{ id: string }[]>`
      SELECT id FROM organisations
      WHERE workspace_id = ${workspaceId}
        AND (
          name ILIKE 'Smoke Org %'
          OR name ILIKE 'Smoke Competitor %'
        )
    `
  ).map((r) => r.id);

  const decisionIds = (
    await sql<{ id: string }[]>`
      SELECT id FROM decisions
      WHERE workspace_id = ${workspaceId}
        AND title ILIKE 'Smoke decision %'
    `
  ).map((r) => r.id);

  const betIds = (
    await sql<{ id: string }[]>`
      SELECT id FROM bets
      WHERE workspace_id = ${workspaceId}
        AND title ILIKE 'Smoke bet %'
    `
  ).map((r) => r.id);

  const opportunityIds = (
    await sql<{ id: string }[]>`
      SELECT id FROM opportunities
      WHERE workspace_id = ${workspaceId}
        AND title ILIKE 'Smoke opportunity %'
    `
  ).map((r) => r.id);

  const runIds = (
    await sql<{ id: string }[]>`
      SELECT id FROM research_runs
      WHERE workspace_id = ${workspaceId}
        AND (notes ILIKE '%smoke%' OR notes ILIKE 'Smoke %')
    `
  ).map((r) => r.id);

  const focusIds = (
    await sql<{ id: string }[]>`
      SELECT id FROM focus_items
      WHERE workspace_id = ${workspaceId}
        AND title ILIKE 'Smoke focus %'
    `
  ).map((r) => r.id);

  const sessionIds = (
    await sql<{ id: string }[]>`
      SELECT id FROM discovery_sessions
      WHERE workspace_id = ${workspaceId}
        AND title ILIKE 'Smoke discovery%'
    `
  ).map((r) => r.id);

  const sourceIds = (
    await sql<{ id: string }[]>`
      SELECT id FROM evidence_sources
      WHERE workspace_id = ${workspaceId}
        AND (
          url ILIKE 'https://example.com/releases/smoke-%'
          OR url ILIKE 'https://example.com/rumour-%'
          OR description ILIKE '%smoke%'
        )
    `
  ).map((r) => r.id);

  const captureIds = (
    await sql<{ id: string }[]>`
      SELECT id FROM evidence_captures
      WHERE workspace_id = ${workspaceId}
        AND (
          raw_text ILIKE '%smoke%'
          OR raw_text ILIKE 'Ahmed capture smoke%'
        )
    `
  ).map((r) => r.id);

  if (runIds.length > 0) {
    await sql`
      DELETE FROM evidence
      WHERE workspace_id = ${workspaceId}
        AND research_finding_id IN (
          SELECT id FROM research_findings
          WHERE workspace_id = ${workspaceId}
            AND research_run_id IN ${sql(runIds)}
        )
    `;
    await sql`
      DELETE FROM research_findings
      WHERE workspace_id = ${workspaceId}
        AND research_run_id IN ${sql(runIds)}
    `;
    await sql`
      DELETE FROM research_runs
      WHERE workspace_id = ${workspaceId}
        AND id IN ${sql(runIds)}
    `;
  }

  await sql`
    DELETE FROM evidence
    WHERE workspace_id = ${workspaceId}
      AND (
        title ILIKE '%smoke%'
        OR title = 'Company signed a £20k pilot'
        OR title = 'Smoke market research claim'
        OR title = 'Competitor capacity planning announcement'
      )
  `;

  if (assumptionIds.length > 0) {
    await sql`
      DELETE FROM evidence
      WHERE workspace_id = ${workspaceId}
        AND assumption_id IN ${sql(assumptionIds)}
    `;
    await sql`
      DELETE FROM assumption_history
      WHERE workspace_id = ${workspaceId}
        AND assumption_id IN ${sql(assumptionIds)}
    `;
  }

  if (captureIds.length > 0) {
    await sql`
      DELETE FROM evidence_captures
      WHERE workspace_id = ${workspaceId}
        AND id IN ${sql(captureIds)}
    `;
  }

  if (focusIds.length > 0) {
    await sql`
      DELETE FROM focus_items
      WHERE workspace_id = ${workspaceId}
        AND id IN ${sql(focusIds)}
    `;
  }

  if (opportunityIds.length > 0) {
    await sql`
      DELETE FROM opportunities
      WHERE workspace_id = ${workspaceId}
        AND id IN ${sql(opportunityIds)}
    `;
  }

  if (betIds.length > 0) {
    await sql`
      DELETE FROM bets
      WHERE workspace_id = ${workspaceId}
        AND id IN ${sql(betIds)}
    `;
  }

  if (decisionIds.length > 0) {
    await sql`
      DELETE FROM decisions
      WHERE workspace_id = ${workspaceId}
        AND id IN ${sql(decisionIds)}
    `;
  }

  if (assumptionIds.length > 0) {
    await sql`
      DELETE FROM assumptions
      WHERE workspace_id = ${workspaceId}
        AND id IN ${sql(assumptionIds)}
    `;
  }

  if (sessionIds.length > 0) {
    await sql`
      DELETE FROM discovery_sessions
      WHERE workspace_id = ${workspaceId}
        AND id IN ${sql(sessionIds)}
    `;
  }

  if (orgIds.length > 0) {
    await sql`
      DELETE FROM organisations
      WHERE workspace_id = ${workspaceId}
        AND id IN ${sql(orgIds)}
    `;
  }

  if (sourceIds.length > 0) {
    await sql`
      DELETE FROM evidence_sources
      WHERE workspace_id = ${workspaceId}
        AND id IN ${sql(sourceIds)}
    `;
  }

  const historyIds = [
    ...assumptionIds,
    ...orgIds,
    ...decisionIds,
    ...betIds,
    ...opportunityIds,
    ...focusIds,
    ...sessionIds,
  ];
  if (historyIds.length > 0) {
    await sql`
      DELETE FROM entity_history
      WHERE workspace_id = ${workspaceId}
        AND entity_id IN ${sql(historyIds)}
    `;
  }

  const leftoverOrgs = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM organisations
    WHERE workspace_id = ${workspaceId}
      AND (name ILIKE 'Smoke Org %' OR name ILIKE 'Smoke Competitor %')
  `;
  const leftoverAssumptions = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM assumptions
    WHERE workspace_id = ${workspaceId}
      AND (
        statement ILIKE 'Smoke test assumption %'
        OR statement ILIKE 'Research foundation smoke %'
        OR statement ILIKE 'Stage 3 research smoke %'
      )
  `;

  console.log(
    `  ✓ Smoke cleanup (orgs left=${leftoverOrgs[0]?.count ?? 0}, assumptions left=${leftoverAssumptions[0]?.count ?? 0})`,
  );
}

async function main() {
  console.log("Auth env");
  const jonHash = normalizePasswordHash(process.env.JON_PASSWORD_HASH) ?? "";
  const ahmedHash = normalizePasswordHash(process.env.AHMED_PASSWORD_HASH) ?? "";
  await assert(jonHash.startsWith("$2"), "JON_PASSWORD_HASH loaded with bcrypt prefix");
  await assert(ahmedHash.startsWith("$2"), "AHMED_PASSWORD_HASH loaded with bcrypt prefix");
  // Local smoke uses whatever password is configured in .env.local.
  // Default local setup uses 12345 after the base64 hash migration.
  const candidatePasswords = ["12345", "jon-dev-password"];
  let jonOk = false;
  for (const password of candidatePasswords) {
    if (await bcrypt.compare(password, jonHash)) {
      jonOk = true;
      break;
    }
  }
  await assert(jonOk, "Jon password verifies against configured hash");
  await assert(!(await bcrypt.compare("wrong-password-xyz", jonHash)), "Wrong password rejected");

  console.log("Sessions");
  const token = await createSessionToken("jon");
  const session = await readSessionToken(token);
  await assert(session?.id === "jon", "Session token round-trips for Jon");
  const ahmedToken = await createSessionToken("ahmed");
  const ahmedSession = await readSessionToken(ahmedToken);
  await assert(ahmedSession?.id === "ahmed", "Session token round-trips for Ahmed");

  console.log("Workspace + seed");
  const workspace = await getWorkspaceBySlug("knomera");
  await assert(workspace.slug === "knomera", "Knomera workspace exists");
  const sql = getDb();

  console.log("Pre-run smoke cleanup");
  await cleanupSmokeArtifacts(sql, workspace.id);

  const assumptions = await listAssumptions(workspace.id);
  await assert(assumptions.length === 122, `122 assumptions present (got ${assumptions.length})`);
  const categories = new Set(assumptions.map((a) => a.category));
  await assert(categories.size === 11, "11 categories present");

  console.log("Stage 1 migration tracking");
  const migrationTable = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'schema_migrations'
    ) AS exists
  `;
  await assert(migrationTable[0]?.exists === true, "schema_migrations table exists");
  const migrations = await sql<{ version: string; name: string }[]>`
    SELECT version, name FROM schema_migrations ORDER BY version
  `;
  await assert(
    migrations.some((row) => row.version === "20250924163500"),
    "Stage 1 foundation migration recorded",
  );
  await assert(
    migrations.some((row) => row.version === "20250924170000"),
    "Stage 2 strategy/problems migration recorded",
  );
  await assert(
    migrations.some((row) => row.version === "20250924200000"),
    "Stage 3 discovery migration recorded",
  );

  const preserved = await sql<{ assumptions: number; evidence: number }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id = ${workspace.id}) AS assumptions,
      (SELECT COUNT(*)::int FROM evidence WHERE workspace_id = ${workspace.id}) AS evidence
  `;
  await assert(preserved[0]?.assumptions === 122, "Assumptions count preserved after migrate");
  await assert(
    typeof preserved[0]?.evidence === "number",
    `Evidence rows preserved (count=${preserved[0]?.evidence})`,
  );

  console.log("Stage 2 strategy + problems");
  const stage2 = await sql<{
    strategy: number;
    problems: number;
    links: number;
  }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM strategy_items WHERE workspace_id = ${workspace.id}) AS strategy,
      (SELECT COUNT(*)::int FROM problems WHERE workspace_id = ${workspace.id}) AS problems,
      (SELECT COUNT(*)::int FROM problem_assumptions WHERE workspace_id = ${workspace.id}) AS links
  `;
  await assert(stage2[0]?.strategy >= 3, `Strategy items present (got ${stage2[0]?.strategy})`);
  await assert(stage2[0]?.problems >= 7, `Problems present (got ${stage2[0]?.problems})`);
  await assert(stage2[0]?.links > 0, `Problem–assumption links present (got ${stage2[0]?.links})`);

  console.log("Stage 3 discovery schema");
  const discoveryTables = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'discovery_sessions'
    ) AS exists
  `;
  await assert(discoveryTables[0]?.exists === true, "discovery_sessions table exists");
  const evidenceCol = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'evidence' AND column_name = 'discovery_session_id'
    ) AS exists
  `;
  await assert(evidenceCol[0]?.exists === true, "evidence.discovery_session_id column exists");

  console.log("Stage 4 decisions schema");
  const decisionsTable = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'decisions'
    ) AS exists
  `;
  await assert(decisionsTable[0]?.exists === true, "decisions table exists");
  await assert(
    migrations.some((row) => row.version === "20250924210000"),
    "Stage 4 decisions migration recorded",
  );

  console.log("Stage 5 ideas & bets schema");
  const betsTable = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'bets'
    ) AS exists
  `;
  await assert(betsTable[0]?.exists === true, "bets table exists");
  const ideasTable = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ideas'
    ) AS exists
  `;
  await assert(ideasTable[0]?.exists === true, "ideas table exists");
  const betOutcomeCol = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'evidence' AND column_name = 'bet_outcome_id'
    ) AS exists
  `;
  await assert(
    betOutcomeCol[0]?.exists === true,
    "evidence.bet_outcome_id column exists",
  );
  await assert(
    migrations.some((row) => row.version === "20250924220000"),
    "Stage 5 ideas/bets migration recorded",
  );
  const seededBets = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM bets
    WHERE workspace_id = ${workspace.id} AND seed_key IS NOT NULL
  `;
  await assert(
    (seededBets[0]?.count ?? 0) >= 3,
    `Seeded bets present (got ${seededBets[0]?.count})`,
  );

  console.log("Stage 6 commercial schema");
  const opportunitiesTable = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'opportunities'
    ) AS exists
  `;
  await assert(opportunitiesTable[0]?.exists === true, "opportunities table exists");
  const oppCol = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'evidence' AND column_name = 'opportunity_id'
    ) AS exists
  `;
  await assert(
    oppCol[0]?.exists === true,
    "evidence.opportunity_id column exists",
  );
  await assert(
    migrations.some((row) => row.version === "20250924230000"),
    "Stage 6 commercial migration recorded",
  );

  console.log("Evidence sources schema");
  const evidenceSourcesTable = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'evidence_sources'
    ) AS exists
  `;
  await assert(evidenceSourcesTable[0]?.exists === true, "evidence_sources table exists");
  const orgCol = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'evidence' AND column_name = 'organisation_id'
    ) AS exists
  `;
  await assert(orgCol[0]?.exists === true, "evidence.organisation_id column exists");
  const contactCol = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'evidence' AND column_name = 'contact_id'
    ) AS exists
  `;
  await assert(contactCol[0]?.exists === true, "evidence.contact_id column exists");
  await assert(
    migrations.some((row) => row.version === "20250925120000"),
    "Evidence sources migration recorded",
  );

  console.log("Stage 7 focus schema");
  const focusTable = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'focus_items'
    ) AS exists
  `;
  await assert(focusTable[0]?.exists === true, "focus_items table exists");
  await assert(
    migrations.some((row) => row.version === "20250924240000"),
    "Stage 7 focus migration recorded",
  );

  console.log("Entity history schema");
  const entityHistoryTable = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'entity_history'
    ) AS exists
  `;
  await assert(
    entityHistoryTable[0]?.exists === true,
    "entity_history table exists",
  );
  await assert(
    migrations.some((row) => row.version === "20250924250000"),
    "Entity history migration recorded",
  );

  console.log("Proactive content migration");
  await assert(
    migrations.some((row) => row.version === "20250924260000"),
    "Proactive content migration recorded",
  );
  const proactiveCounts = await sql<
    {
      problems: number;
      strategy: number;
      ideas: number;
      bets: number;
      decisions: number;
    }[]
  >`
    SELECT
      (SELECT COUNT(*)::int FROM problems WHERE workspace_id = ${workspace.id}) AS problems,
      (SELECT COUNT(*)::int FROM strategy_items WHERE workspace_id = ${workspace.id}) AS strategy,
      (SELECT COUNT(*)::int FROM ideas WHERE workspace_id = ${workspace.id}) AS ideas,
      (SELECT COUNT(*)::int FROM bets WHERE workspace_id = ${workspace.id}) AS bets,
      (SELECT COUNT(*)::int FROM decisions WHERE workspace_id = ${workspace.id}) AS decisions
  `;
  await assert(proactiveCounts[0].problems === 11, "11 problems present");
  await assert(proactiveCounts[0].strategy === 7, "7 strategy items present");
  await assert(proactiveCounts[0].ideas === 5, "5 ideas present");
  await assert(proactiveCounts[0].bets === 4, "4 bets present");
  await assert(proactiveCounts[0].decisions === 2, "2 decisions present");

  console.log("Workspace object search");
  const searchHits = await searchWorkspaceObjects(workspace.id, {
    query: "experiment",
    types: ["assumption"],
    limit: 5,
  });
  await assert(searchHits.length > 0, "Assumption search returns matches");
  await assert(
    searchHits.every((hit) => hit.type === "assumption" && hit.href.startsWith("/assumptions/")),
    "Search results are typed assumptions with hrefs",
  );
  const problemHits = await searchWorkspaceObjects(workspace.id, {
    query: "capacity",
    types: ["problem"],
    limit: 5,
  });
  await assert(problemHits.length > 0, "Problem search returns matches");

  console.log("Priority ranking");
  const evidence = await listEvidenceByAssumptionIds(
    workspace.id,
    assumptions.map((a) => a.id),
  );
  const byAssumption = new Map<string, typeof evidence>();
  for (const item of evidence) {
    const list = byAssumption.get(item.assumption_id) ?? [];
    list.push(item);
    byAssumption.set(item.assumption_id, list);
  }
  const ranked = rankAssumptionsForValidation(
    assumptions.map((assumption) => ({
      assumption,
      evidence: byAssumption.get(assumption.id) ?? [],
    })),
  );
  await assert(ranked.length === 122, "Priority ranking covers all assumptions");
  const topStatements = ranked.slice(0, 10).map((r) => r.statement);
  console.log("  Top priorities:");
  for (const s of topStatements.slice(0, 5)) {
    console.log(`    - ${s.slice(0, 80)}…`);
  }
  await assert(
    topStatements.some((s) => s.includes("pay specifically for experimentation intelligence")),
    "Commercial willingness-to-pay surfaces near the top naturally",
  );

  console.log("CRUD + history + evidence");
  const created = await createAssumption(workspace.id, "ahmed", {
    statement: `Smoke test assumption ${Date.now()}`,
    category: "Founder & Execution",
    importance: "high",
    confidence: "low",
    status: "untested",
    owner: "Jon",
    next_action: "Delete after smoke test",
  });
  await assert(created.created_by === "ahmed", "Created assumption records Ahmed");

  const updated = await updateAssumption(workspace.id, created.id, "jon", {
    confidence: "medium",
    status: "testing",
  });
  await assert(updated?.confidence === "medium", "Confidence updated");
  await assert(updated?.status === "testing", "Status updated");

  const history = await listAssumptionHistory(workspace.id, created.id);
  await assert(
    history.some((h) => h.field_changed === "confidence" && h.new_value === "medium"),
    "History records confidence change",
  );
  await assert(
    history.some((h) => h.changed_by === "jon"),
    "History records Jon as changed_by",
  );

  const supporting = await createEvidence(workspace.id, "jon", {
    assumption_id: created.id,
    title: "Supporting smoke evidence",
    evidence_type: "customer_interview",
    strength: 3,
    direction: "supports",
    evidence_date: new Date().toISOString().slice(0, 10),
    description: "Smoke test supporting note",
  });
  const challenging = await createEvidence(workspace.id, "ahmed", {
    assumption_id: created.id,
    title: "Challenging smoke evidence",
    evidence_type: "data_analysis",
    strength: 2,
    direction: "challenges",
    evidence_date: new Date().toISOString().slice(0, 10),
  });
  await assert(supporting.direction === "supports", "Supporting evidence created");
  await assert(challenging.direction === "challenges", "Challenging evidence created");

  console.log("Discovery → evidence provenance");
  const orgRows = await sql<{ id: string }[]>`
    INSERT INTO organisations (workspace_id, name, organisation_type, created_by)
    VALUES (${workspace.id}, ${`Smoke Org ${Date.now()}`}, 'prospect', 'jon')
    RETURNING id
  `;
  const sessionRows = await sql<{ id: string }[]>`
    INSERT INTO discovery_sessions (
      workspace_id, organisation_id, title, session_date, conducted_by, created_by
    ) VALUES (
      ${workspace.id},
      ${orgRows[0].id},
      'Smoke discovery session',
      ${new Date().toISOString().slice(0, 10)},
      'jon',
      'jon'
    )
    RETURNING id
  `;
  const fromDiscovery = await createEvidence(workspace.id, "jon", {
    assumption_id: created.id,
    title: "Discovery-sourced smoke evidence",
    evidence_type: "customer_interview",
    strength: 3,
    direction: "supports",
    evidence_date: new Date().toISOString().slice(0, 10),
    source: "Smoke discovery session",
    discovery_session_id: sessionRows[0].id,
  });
  await assert(
    fromDiscovery.discovery_session_id === sessionRows[0].id,
    "Evidence records discovery_session_id provenance",
  );

  console.log("Decisions + links");
  const { createDecision, linkDecisionAssumption, linkDecisionEvidence, getDecision } =
    await import("../src/lib/db/decisions");
  const decision = await createDecision(workspace.id, "jon", {
    title: `Smoke decision ${Date.now()}`,
    decision: "Use capacity intelligence as the initial wedge.",
    rationale: "Smoke test rationale",
    status: "active",
    decision_date: new Date().toISOString().slice(0, 10),
    decided_by: "jon",
    revisit_trigger: "If capacity is not painful enough in discovery",
  });
  await linkDecisionAssumption(workspace.id, decision.id, created.id, "jon");
  await linkDecisionEvidence(workspace.id, decision.id, fromDiscovery.id, "jon");
  const loadedDecision = await getDecision(workspace.id, decision.id);
  await assert(
    (loadedDecision?.linked_assumption_count ?? 0) === 1,
    "Decision links one assumption",
  );
  await assert(
    (loadedDecision?.linked_evidence_count ?? 0) === 1,
    "Decision links one evidence record",
  );

  const { updateDecision } = await import("../src/lib/db/decisions");
  const { listEntityHistory } = await import("../src/lib/db/history");
  await updateDecision(workspace.id, decision.id, "ahmed", {
    status: "revisiting",
  });
  const decisionHistory = await listEntityHistory(
    workspace.id,
    "decision",
    decision.id,
  );
  await assert(
    decisionHistory.some(
      (h) =>
        h.field_changed === "status" &&
        h.new_value === "revisiting" &&
        h.changed_by === "ahmed",
    ),
    "Decision status change recorded with actor",
  );

  console.log("Bets + outcomes + evidence provenance");
  const {
    createBet,
    createBetOutcome,
    linkBetAssumption,
    getBet,
  } = await import("../src/lib/db/bets");
  const bet = await createBet(workspace.id, "jon", {
    title: `Smoke bet ${Date.now()}`,
    hypothesis: "Smoke hypothesis",
    status: "active",
    owner: "jon",
  });
  await linkBetAssumption(workspace.id, bet.id, created.id, "tests", "jon");
  const outcome = await createBetOutcome(workspace.id, "jon", bet.id, {
    summary: "Smoke outcome",
    result: "mixed",
    learning: "Outcomes are not evidence until interpreted.",
    outcome_date: new Date().toISOString().slice(0, 10),
  });
  const fromOutcome = await createEvidence(workspace.id, "jon", {
    assumption_id: created.id,
    title: "Bet-outcome smoke evidence",
    evidence_type: "bet_outcome",
    strength: 3,
    direction: "supports",
    evidence_date: new Date().toISOString().slice(0, 10),
    source: bet.title,
    bet_outcome_id: outcome.id,
  });
  await assert(
    fromOutcome.bet_outcome_id === outcome.id,
    "Evidence records bet_outcome_id provenance",
  );
  const loadedBet = await getBet(workspace.id, bet.id);
  await assert(
    (loadedBet?.linked_assumption_count ?? 0) === 1,
    "Bet links one assumption",
  );
  await assert(
    (loadedBet?.outcome_count ?? 0) === 1,
    "Bet has one outcome",
  );

  console.log("Opportunities + commercial evidence provenance");
  const { createOpportunity, getOpportunity } = await import(
    "../src/lib/db/opportunities"
  );
  const opportunity = await createOpportunity(workspace.id, "jon", {
    organisation_id: orgRows[0].id,
    title: `Smoke opportunity ${Date.now()}`,
    stage: "proposal",
    potential_value: 20000,
    currency: "GBP",
    owner: "jon",
    next_action: "Send pilot proposal",
  });
  const fromOpportunity = await createEvidence(workspace.id, "jon", {
    assumption_id: created.id,
    title: "Company signed a £20k pilot",
    evidence_type: "commercial",
    strength: 5,
    direction: "supports",
    evidence_date: new Date().toISOString().slice(0, 10),
    source: opportunity.title,
    opportunity_id: opportunity.id,
  });
  await assert(
    fromOpportunity.opportunity_id === opportunity.id,
    "Evidence records opportunity_id provenance",
  );
  const loadedOpp = await getOpportunity(workspace.id, opportunity.id);
  await assert(
    (loadedOpp?.evidence_count ?? 0) === 1,
    "Opportunity shows linked evidence count",
  );

  console.log("Focus items");
  const { createFocusItem, listFocusItems, deleteFocusItem } = await import(
    "../src/lib/db/focus"
  );
  const { weekStartISO } = await import("../src/lib/format");
  const week = weekStartISO();
  const focus = await createFocusItem(workspace.id, "jon", {
    title: `Smoke focus ${Date.now()}`,
    owner: "jon",
    week_start: week,
    status: "active",
    linked_assumption_id: created.id,
  });
  const focusList = await listFocusItems(workspace.id, {
    week_start: week,
    owner: "jon",
  });
  await assert(
    focusList.some((item) => item.id === focus.id),
    "Focus item listed for week",
  );
  await deleteFocusItem(workspace.id, focus.id);

  console.log("Organisation history");
  const { getOrganisationDetail } = await import("../src/lib/db/organisations");
  const {
    getAssumptionRelationshipCounts,
    getProblemRelationshipCounts,
  } = await import("../src/lib/db/relationship-counts");
  const orgDetail = await getOrganisationDetail(workspace.id, orgRows[0].id);
  await assert(orgDetail !== null, "Organisation detail loads");
  await assert(
    orgDetail!.sessions.some((s) => s.id === sessionRows[0].id),
    "Organisation detail lists discovery sessions",
  );
  await assert(
    orgDetail!.opportunities.some((o) => o.id === opportunity.id),
    "Organisation detail lists opportunities",
  );

  const assumptionCounts = await getAssumptionRelationshipCounts(
    workspace.id,
    created.id,
  );
  await assert(
    assumptionCounts.supporting_evidence >= 1,
    "Assumption relationship counts include supporting evidence",
  );
  await assert(
    assumptionCounts.active_bets >= 1,
    "Assumption relationship counts include active bets",
  );

  const seededProblem = await sql<{ id: string }[]>`
    SELECT id FROM problems WHERE workspace_id = ${workspace.id} LIMIT 1
  `;
  if (seededProblem[0]) {
    const problemCounts = await getProblemRelationshipCounts(
      workspace.id,
      seededProblem[0].id,
    );
    await assert(
      typeof problemCounts.linked_assumptions === "number",
      "Problem relationship counts load",
    );
  }

  const timeline = await listEvidenceForAssumption(workspace.id, created.id);
  await assert(timeline.length === 5, "Evidence timeline has all five items");

  const after = await getAssumption(workspace.id, created.id);
  await assert(after?.confidence === "medium", "Confidence unchanged by evidence add");

  // Cleanup smoke data (assumption/evidence before organisations — composite FKs)
  await sql`DELETE FROM entity_history WHERE entity_id IN (${decision.id}, ${bet.id}, ${opportunity.id})`;
  await sql`DELETE FROM opportunities WHERE id = ${opportunity.id}`;
  await sql`DELETE FROM bets WHERE id = ${bet.id}`;
  await sql`DELETE FROM decisions WHERE id = ${decision.id}`;
  await sql`DELETE FROM assumptions WHERE id = ${created.id}`;
  await sql`DELETE FROM discovery_sessions WHERE id = ${sessionRows[0].id}`;
  await sql`DELETE FROM organisations WHERE id = ${orgRows[0].id}`;
  console.log("  ✓ Cleaned up smoke-test focus + commercial + bet + decision + discovery + assumption");

  console.log("Home dashboard");
  const { getHomeDashboard } = await import("../src/lib/db/home");
  const home = await getHomeDashboard(workspace.id);
  await assert(Array.isArray(home.attention), "Home attention section loads");
  await assert(Array.isArray(home.learning), "Home learning section loads");
  await assert(typeof home.closer.discovery_sessions === "number", "Home closer metrics load");

  console.log("Stage 1 research foundation");
  const {
    createResearchRun,
    markResearchRunRunning,
    completeResearchRun,
    getResearchRun,
    listResearchFindings,
  } = await import("../src/lib/db/research");
  const { displayName } = await import("../src/lib/labels");
  const { AI_ACTOR_ID, isLoginCapableUserId } = await import(
    "../src/lib/domain/actors"
  );
  const { defaultEvidenceClass } = await import(
    "../src/lib/domain/evidence-class"
  );
  const { suggestConfidence } = await import(
    "../src/lib/domain/suggested-confidence"
  );
  const { canonicaliseUrl } = await import(
    "../src/lib/research/url-canonical"
  );
  const { RESEARCH_LIMITS } = await import("../src/lib/research/limits");
  const { getAiAnalysisProvider } = await import(
    "../src/lib/research/providers/index"
  );
  const { ProviderUnavailableError: PUE } = await import(
    "../src/lib/research/providers/types"
  );

  await assert(
    migrations.some((row) => row.version === "20250926130000"),
    "Research foundation migration recorded",
  );

  const enumRows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'evidence_type' AND e.enumlabel = 'market_research'
    ) AS exists
  `;
  await assert(enumRows[0]?.exists === true, "market_research evidence type exists");

  const classCol = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'evidence'
        AND column_name = 'evidence_class'
    ) AS exists
  `;
  await assert(classCol[0]?.exists === true, "evidence.evidence_class column exists");

  for (const table of [
    "research_runs",
    "research_findings",
    "research_finding_assumptions",
    "research_finding_sources",
  ]) {
    const t = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      ) AS exists
    `;
    await assert(t[0]?.exists === true, `${table} table exists`);
  }

  await assert(displayName(AI_ACTOR_ID) === "Knomera AI", "AI displays as Knomera AI");
  await assert(!isLoginCapableUserId(AI_ACTOR_ID), "AI cannot log in");
  await assert(
    defaultEvidenceClass("market_research") === "secondary",
    "market_research defaults to secondary class",
  );
  await assert(
    defaultEvidenceClass("customer_interview") === "direct",
    "customer_interview defaults to direct class",
  );

  const secondaryOnly = suggestConfidence([
    {
      evidence_type: "market_research",
      evidence_class: "secondary",
      strength: 3,
      direction: "supports",
    },
    {
      evidence_type: "market_research",
      evidence_class: "secondary",
      strength: 3,
      direction: "supports",
    },
    {
      evidence_type: "competitor_research",
      evidence_class: "secondary",
      strength: 3,
      direction: "supports",
    },
    {
      evidence_type: "competitor_research",
      evidence_class: "secondary",
      strength: 3,
      direction: "supports",
    },
    {
      evidence_type: "market_research",
      evidence_class: "secondary",
      strength: 3,
      direction: "supports",
    },
  ]);
  await assert(
    secondaryOnly.level !== "high" && secondaryOnly.level !== "proven",
    "Secondary-only evidence does not suggest High/Proven",
  );
  await assert(
    secondaryOnly.explanation.toLowerCase().includes("no direct"),
    "Secondary-only explanation mentions missing direct evidence",
  );

  const canon = canonicaliseUrl(
    "https://Example.com/path/?utm_source=x&utm_medium=y&id=1",
  );
  await assert(
    canon === "https://example.com/path?id=1",
    "URL canonicalisation strips tracking params",
  );
  await assert(
    RESEARCH_LIMITS.maxCandidateAssumptions === 20,
    "Research limits centralised",
  );

  let providerBlocked = false;
  try {
    await getAiAnalysisProvider().matchEvidence({
      rawText: "test",
      candidates: [],
    });
  } catch (error) {
    providerBlocked = error instanceof PUE;
  }
  await assert(providerBlocked, "Stub AI provider is unavailable (expected)");

  const researchAssumption = await createAssumption(workspace.id, "jon", {
    statement: `Research foundation smoke ${Date.now()}`,
    description: "Temporary assumption for research foundation checks",
    category: "Market",
    importance: "medium",
    confidence: "medium",
    status: "untested",
    owner: "jon",
    next_action: null,
    target_date: null,
  });

  const run = await createResearchRun(workspace.id, {
    research_type: "competitor",
    trigger_type: "manual",
    triggered_by: "jon",
    notes: "smoke-test run",
  });
  await assert(run.status === "queued", "Research run created as queued");
  await markResearchRunRunning(workspace.id, run.id);
  await completeResearchRun(workspace.id, run.id, "completed", {
    assumptions_considered: 0,
    sources_examined: 0,
    findings_created: 0,
    notes: "No useful external evidence found.",
  });
  const finished = await getResearchRun(workspace.id, run.id);
  await assert(finished?.status === "completed", "Research run completes");
  await assert(
    finished?.notes?.includes("No useful external evidence found") === true,
    "Nothing-found is recorded on the run, not as Evidence",
  );

  const pending = await listResearchFindings(workspace.id, "pending");
  await assert(Array.isArray(pending), "Research findings list loads");

  const marketEv = await createEvidence(workspace.id, AI_ACTOR_ID, {
    assumption_id: researchAssumption.id,
    title: "Smoke market research claim",
    description: "Secondary source smoke",
    evidence_type: "market_research",
    strength: 2,
    direction: "supports",
    evidence_date: "2026-09-24",
  });
  await assert(
    marketEv.evidence_type === "market_research",
    "market_research evidence saves",
  );
  await assert(
    marketEv.evidence_class === "secondary",
    "market_research gets secondary class",
  );
  await assert(marketEv.created_by === AI_ACTOR_ID, "AI authorship preserved");

  const afterResearch = await getAssumption(workspace.id, researchAssumption.id);
  await assert(
    afterResearch?.confidence === "medium",
    "Confidence unchanged after AI secondary evidence",
  );

  await sql`DELETE FROM evidence WHERE id = ${marketEv.id}`;
  await sql`DELETE FROM research_runs WHERE id = ${run.id}`;
  await sql`DELETE FROM assumptions WHERE id = ${researchAssumption.id}`;
  console.log("  ✓ Cleaned up research foundation smoke data");

  console.log("Stage 2 intelligent evidence matching");
  await assert(
    migrations.some((row) => row.version === "20250926140000"),
    "Evidence captures migration recorded",
  );
  const captureTable = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'evidence_captures'
    ) AS exists
  `;
  await assert(captureTable[0]?.exists === true, "evidence_captures table exists");
  const usageTable = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ai_usage_events'
    ) AS exists
  `;
  await assert(usageTable[0]?.exists === true, "ai_usage_events table exists");
  const captureCol = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'evidence' AND column_name = 'evidence_capture_id'
    ) AS exists
  `;
  await assert(captureCol[0]?.exists === true, "evidence.evidence_capture_id exists");
  const aiAssistedCol = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'evidence' AND column_name = 'ai_assisted'
    ) AS exists
  `;
  await assert(aiAssistedCol[0]?.exists === true, "evidence.ai_assisted exists");

  const {
    searchAssumptionCandidates,
  } = await import("../src/lib/db/assumption-candidates");
  const { matchEvidenceToAssumptions } = await import(
    "../src/lib/domain/evidence-matching"
  );
  const { saveMatchedEvidenceCapture } = await import(
    "../src/lib/db/evidence-matching-save"
  );
  const { MATCHING_LIMITS } = await import("../src/lib/ai/config");
  const { displayName: dn } = await import("../src/lib/labels");

  const durationQuery =
    "They find it difficult to estimate how long tests will run.";
  const candidates = await searchAssumptionCandidates(
    workspace.id,
    durationQuery,
  );
  await assert(candidates.length > 0, "Candidate search returns assumptions");
  await assert(
    candidates.length <= MATCHING_LIMITS.maxAssumptionCandidates,
    "Candidate set bounded to matching limit",
  );

  const matchResult = await matchEvidenceToAssumptions({
    workspaceId: workspace.id,
    rawText: durationQuery,
  });
  // Without OPENAI_API_KEY: either deterministic success or graceful manual fallback.
  if (matchResult.ok) {
    await assert(matchResult.proposals.length >= 1, "Matching returns proposals");
    await assert(
      matchResult.candidatesConsidered <= MATCHING_LIMITS.maxAssumptionCandidates,
      "Matching does not send unbounded candidates",
    );
    if (matchResult.path === "deterministic") {
      await assert(
        matchResult.usage.aiCalls === 0,
        "Deterministic path avoids AI calls",
      );
    }
  } else {
    await assert(
      matchResult.error.includes("manually") ||
        matchResult.error.includes("too long"),
      "AI unavailable fails safely for manual capture",
    );
    await assert(matchResult.preserveInput === true, "Input preserved on AI failure");
  }

  // Founder-authored AI-assisted save (no live model required)
  const hostAssumption = assumptions.find((a) =>
    a.statement.toLowerCase().includes("estimate"),
  ) ?? assumptions[0];

  const { capture, evidence: matchedEvidence } = await saveMatchedEvidenceCapture(
    workspace.id,
    "jon",
    {
      raw_text: durationQuery,
      evidence_date: "2026-09-26",
      items: [
        {
          title: "Difficulty estimating experiment duration",
          description: durationQuery,
          assumption_id: hostAssumption.id,
          direction: "supports",
          strength: 2,
          evidence_type: "customer_interview",
        },
      ],
    },
  );
  await assert(capture.captured_by === "jon", "Capture authored by Jon");
  await assert(capture.ai_assisted === true, "Capture marked AI-assisted");
  await assert(matchedEvidence.length === 1, "One evidence record saved");
  await assert(
    matchedEvidence[0].created_by === "jon",
    "Evidence authored by founder Jon",
  );
  await assert(
    matchedEvidence[0].ai_assisted === true,
    "Evidence marked AI-assisted",
  );
  await assert(
    matchedEvidence[0].evidence_capture_id === capture.id,
    "Evidence linked to capture",
  );
  await assert(
    dn(matchedEvidence[0].created_by) === "Jon",
    "Display name remains Jon (not Knomera AI)",
  );

  // Ahmed attribution
  const { evidence: ahmedEvidence } = await saveMatchedEvidenceCapture(
    workspace.id,
    "ahmed",
    {
      raw_text: "Ahmed capture smoke",
      evidence_date: "2026-09-26",
      items: [
        {
          title: "Ahmed smoke evidence",
          description: "Ahmed capture smoke",
          assumption_id: hostAssumption.id,
          direction: "neutral",
          strength: 2,
          evidence_type: "customer_interview",
        },
      ],
    },
  );
  await assert(
    ahmedEvidence[0].created_by === "ahmed",
    "Evidence authored by founder Ahmed",
  );

  const afterMatch = await getAssumption(workspace.id, hostAssumption.id);
  await assert(
    afterMatch?.confidence === hostAssumption.confidence,
    "Matching/save does not auto-change confidence",
  );

  await sql`DELETE FROM evidence WHERE evidence_capture_id IN (
    SELECT id FROM evidence_captures
    WHERE raw_text = ${durationQuery} OR raw_text = ${"Ahmed capture smoke"}
  )`;
  await sql`DELETE FROM evidence_captures
    WHERE raw_text = ${durationQuery} OR raw_text = ${"Ahmed capture smoke"}`;
  console.log("  ✓ Cleaned up Stage 2 matching smoke data");

  console.log("Stage 3 manual external research");
  await assert(
    migrations.some((row) => row.version === "20250927120000"),
    "Stage 3 manual research migration recorded",
  );
  const competitorEnum = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'organisation_type' AND e.enumlabel = 'competitor'
    ) AS exists
  `;
  await assert(competitorEnum[0]?.exists === true, "competitor organisation type exists");

  const researchCols = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'evidence'
        AND column_name = 'research_finding_id'
    ) AS exists
  `;
  await assert(researchCols[0]?.exists === true, "evidence.research_finding_id exists");

  const {
    insertPendingResearchFinding,
    acceptResearchFinding,
    rejectResearchFinding,
    getResearchFinding,
  } = await import("../src/lib/db/research-findings");
  const researchDb = await import("../src/lib/db/research");
  const { assertSafePublicHttpUrl } = await import(
    "../src/lib/research/url-safety"
  );
  const { marketQueriesForAssumption } = await import(
    "../src/lib/domain/research-queries"
  );
  const { selectAssumptionsForManualMarket } = await import(
    "../src/lib/domain/external-research"
  );

  let blocked = false;
  try {
    assertSafePublicHttpUrl("http://127.0.0.1/secret");
  } catch {
    blocked = true;
  }
  await assert(blocked, "SSRF guard blocks localhost");

  const queries = marketQueriesForAssumption(assumptions[0]);
  await assert(queries.length >= 1, "deterministic market queries produced");

  const eligible = selectAssumptionsForManualMarket(assumptions, 5);
  await assert(eligible.length > 0, "manual market eligibility selects assumptions");
  await assert(
    !eligible.some((a) => a.confidence === "proven"),
    "proven assumptions excluded from manual market eligibility",
  );

  const competitorOrg = await sql<{ id: string }[]>`
    INSERT INTO organisations (workspace_id, name, organisation_type, website, created_by)
    VALUES (
      ${workspace.id},
      ${`Smoke Competitor ${Date.now()}`},
      'competitor',
      'https://example.com',
      'jon'
    )
    RETURNING id
  `;

  const stage3Assumption = await createAssumption(workspace.id, "jon", {
    statement: `Stage 3 research smoke ${Date.now()}`,
    category: "Problem & Market",
    importance: "high",
    confidence: "low",
    status: "untested",
    owner: "jon",
    next_action: "Review research findings",
  });

  const stage3Run = await researchDb.createResearchRun(workspace.id, {
    research_type: "competitor",
    trigger_type: "manual",
    triggered_by: "jon",
    notes: "Smoke research run",
  });
  await researchDb.markResearchRunRunning(workspace.id, stage3Run.id);

  const finding = await insertPendingResearchFinding(workspace.id, "ai", {
    research_run_id: stage3Run.id,
    research_type: "competitor",
    organisation_id: competitorOrg[0].id,
    claim: "Competitor announced a capacity planning feature.",
    summary: "Public release notes mention experiment capacity planning.",
    ai_confidence: 0.7,
    suggested_strength: 2,
    assumptions: [
      {
        assumption_id: stage3Assumption.id,
        direction: "supports",
        relevance: "Directly related to capacity planning belief",
        reason: "Release notes describe capacity planning for experiments.",
      },
    ],
    sources: [
      {
        title: "Example release notes",
        url: `https://example.com/releases/smoke-${Date.now()}`,
        published_at: "2026-09-20",
        description: "Smoke source",
      },
    ],
  });
  await assert(finding.status === "pending", "research finding starts pending");

  const loadedFinding = await getResearchFinding(workspace.id, finding.id);
  await assert(
    (loadedFinding?.assumptions.length ?? 0) === 1,
    "finding loads assumption links",
  );
  await assert(
    (loadedFinding?.sources.length ?? 0) === 1,
    "finding loads source links",
  );

  const accepted = await acceptResearchFinding(workspace.id, finding.id, "jon", {
    assumption_id: stage3Assumption.id,
    title: "Competitor capacity planning announcement",
    description: finding.summary,
    direction: "supports",
    strength: 2,
    evidence_type: "competitor_research",
    evidence_date: "2026-09-20",
  });
  await assert(accepted.evidence.created_by === "ai", "accepted evidence authored by AI");
  await assert(
    accepted.evidence.reviewed_by === "jon",
    "accepted evidence records reviewing founder",
  );
  await assert(
    accepted.evidence.evidence_class === "secondary",
    "accepted research evidence is secondary",
  );
  await assert(
    accepted.finding.status === "accepted",
    "finding marked accepted",
  );

  const afterAccept = await getAssumption(workspace.id, stage3Assumption.id);
  await assert(
    afterAccept?.confidence === "low",
    "accepting research does not auto-change confidence",
  );

  // Second finding → reject
  const stage3Run2 = await researchDb.createResearchRun(workspace.id, {
    research_type: "market",
    trigger_type: "manual",
    triggered_by: "ahmed",
  });
  await researchDb.markResearchRunRunning(workspace.id, stage3Run2.id);
  const finding2 = await insertPendingResearchFinding(workspace.id, "ai", {
    research_run_id: stage3Run2.id,
    research_type: "market",
    claim: "Weak market rumour with no source quality.",
    summary: "Should be rejected",
    ai_confidence: 0.2,
    suggested_strength: 1,
    assumptions: [
      {
        assumption_id: stage3Assumption.id,
        direction: "neutral",
        reason: "Weak signal",
      },
    ],
    sources: [
      {
        title: "Rumour page",
        url: `https://example.com/rumour-${Date.now()}`,
      },
    ],
  });
  const rejected = await rejectResearchFinding(
    workspace.id,
    finding2.id,
    "ahmed",
    "weak source",
  );
  await assert(rejected?.status === "rejected", "finding can be rejected");
  await researchDb.completeResearchRun(workspace.id, stage3Run.id, "completed", {
    findings_created: 1,
    notes: "Smoke complete",
  });
  await researchDb.completeResearchRun(workspace.id, stage3Run2.id, "completed", {
    findings_created: 1,
    notes: "Smoke reject path",
  });

  await sql`DELETE FROM evidence WHERE research_finding_id IN (${finding.id}, ${finding2.id})`;
  await sql`DELETE FROM research_findings WHERE id IN (${finding.id}, ${finding2.id})`;
  await sql`DELETE FROM research_runs WHERE id IN (${stage3Run.id}, ${stage3Run2.id})`;
  await sql`DELETE FROM assumptions WHERE id = ${stage3Assumption.id}`;
  await sql`DELETE FROM organisations WHERE id = ${competitorOrg[0].id}`;
  console.log("  ✓ Cleaned up Stage 3 research smoke data");

  console.log("Post-run smoke cleanup");
  await cleanupSmokeArtifacts(sql, workspace.id);

  console.log("\nAll smoke checks passed.");
  await sql.end({ timeout: 5 });
}

main().catch(async (error) => {
  console.error(error);
  try {
    const sql = getDb();
    const workspace = await getWorkspaceBySlug("knomera");
    console.log("Failure smoke cleanup");
    await cleanupSmokeArtifacts(sql, workspace.id);
  } catch (cleanupError) {
    console.error("Smoke cleanup after failure also failed:", cleanupError);
  }
  try {
    await getDb().end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
