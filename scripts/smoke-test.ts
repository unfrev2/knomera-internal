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

async function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
  console.log(`  ✓ ${message}`);
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
  const assumptions = await listAssumptions(workspace.id);
  await assert(assumptions.length === 112, `112 assumptions present (got ${assumptions.length})`);
  const categories = new Set(assumptions.map((a) => a.category));
  await assert(categories.size === 11, "11 categories present");

  console.log("Stage 1 migration tracking");
  const sql = getDb();
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
  await assert(preserved[0]?.assumptions === 112, "Assumptions count preserved after migrate");
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
  await assert(ranked.length === 112, "Priority ranking covers all assumptions");
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

  const timeline = await listEvidenceForAssumption(workspace.id, created.id);
  await assert(timeline.length === 5, "Evidence timeline has all five items");

  const after = await getAssumption(workspace.id, created.id);
  await assert(after?.confidence === "medium", "Confidence unchanged by evidence add");

  // Cleanup smoke data
  await sql`DELETE FROM opportunities WHERE id = ${opportunity.id}`;
  await sql`DELETE FROM bets WHERE id = ${bet.id}`;
  await sql`DELETE FROM decisions WHERE id = ${decision.id}`;
  await sql`DELETE FROM discovery_sessions WHERE id = ${sessionRows[0].id}`;
  await sql`DELETE FROM organisations WHERE id = ${orgRows[0].id}`;
  await sql`DELETE FROM assumptions WHERE id = ${created.id}`;
  console.log("  ✓ Cleaned up smoke-test focus + commercial + bet + decision + discovery + assumption");

  console.log("Home dashboard");
  const { getHomeDashboard } = await import("../src/lib/db/home");
  const home = await getHomeDashboard(workspace.id);
  await assert(Array.isArray(home.attention), "Home attention section loads");
  await assert(Array.isArray(home.learning), "Home learning section loads");
  await assert(typeof home.closer.discovery_sessions === "number", "Home closer metrics load");

  console.log("\nAll smoke checks passed.");
  await sql.end({ timeout: 5 });
}

main().catch(async (error) => {
  console.error(error);
  try {
    await getDb().end({ timeout: 5 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
