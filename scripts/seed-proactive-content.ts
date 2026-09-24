/**
 * Proactive experimentation coworker content revision.
 *
 * Idempotent content update — no schema changes.
 * Safe to re-run. Does not overwrite existing assumption confidence/status.
 * Does not create evidence, discovery, or commercial records.
 *
 * Usage: npm run db:seed:proactive
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { insertAssumptionBySeedKey } from "../src/lib/db/assumptions";
import {
  linkBetAssumption,
  linkBetProblem,
  linkDecisionBet,
  unlinkBetAssumption,
  unlinkBetProblem,
  upsertBetBySeedKey,
} from "../src/lib/db/bets";
import {
  createDecision,
  linkDecisionAssumption,
  linkDecisionProblem,
} from "../src/lib/db/decisions";
import { createFocusItem } from "../src/lib/db/focus";
import {
  linkIdeaAssumption,
  linkIdeaProblem,
  upsertIdeaBySeedKey,
} from "../src/lib/db/ideas";
import {
  getAssumptionIdsBySeedKeys,
  linkProblemAssumption,
  upsertProblemBySeedKey,
} from "../src/lib/db/problems";
import { upsertStrategyItemBySeedKey } from "../src/lib/db/strategy";
import { SEED_ASSUMPTIONS } from "../src/lib/seed/assumptions";
import { SEED_BETS } from "../src/lib/seed/bets";
import { SEED_DECISIONS } from "../src/lib/seed/decisions";
import { SEED_IDEAS } from "../src/lib/seed/ideas";
import { SEED_PROBLEMS } from "../src/lib/seed/problems";
import { SEED_STRATEGY_ITEMS } from "../src/lib/seed/strategy";

function loadConnectionFromLocalFile() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  try {
    const raw = readFileSync(
      resolve(process.cwd(), ".supabase-connection"),
      "utf8",
    );
    const passwordLine = raw
      .split("\n")
      .find((line) => line.startsWith("password="));
    const urlLine = raw
      .split("\n")
      .find((line) => line.startsWith("NEXT_PUBLIC_SUPABASE_URL="));

    if (!passwordLine || !urlLine) return null;

    const password = passwordLine.slice("password=".length).trim();
    const projectUrl = urlLine.slice("NEXT_PUBLIC_SUPABASE_URL=".length).trim();
    const ref = new URL(projectUrl).hostname.split(".")[0];
    const encoded = encodeURIComponent(password);
    return `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`;
  } catch {
    return null;
  }
}

async function main() {
  const databaseUrl = loadConnectionFromLocalFile();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL missing and .supabase-connection could not be read.",
    );
  }
  process.env.DATABASE_URL = databaseUrl;

  const sql = postgres(databaseUrl, { prepare: false, max: 1, ssl: "require" });

  try {
    const workspaces = await sql<{ id: string }[]>`
      SELECT id FROM workspaces WHERE slug = 'knomera' LIMIT 1
    `;
    const workspaceId = workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('Workspace "knomera" not found. Run npm run db:seed first.');
    }

    const beforeAssumptions = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM assumptions WHERE workspace_id = ${workspaceId}
    `;
    const beforeEvidence = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM evidence WHERE workspace_id = ${workspaceId}
    `;
    const beforeOrgs = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM organisations WHERE workspace_id = ${workspaceId}
    `;

    console.log("1. Strategy items…");
    // Merge legacy North Star rows created without a seed_key before upserting.
    const legacyNorth = await sql<{ id: string }[]>`
      SELECT id FROM strategy_items
      WHERE workspace_id = ${workspaceId}
        AND type = 'north_star'
        AND seed_key IS NULL
    `;
    const seededNorth = await sql<{ id: string }[]>`
      SELECT id FROM strategy_items
      WHERE workspace_id = ${workspaceId}
        AND seed_key = 's_north_star'
      LIMIT 1
    `;
    if (legacyNorth[0] && !seededNorth[0]) {
      await sql`
        UPDATE strategy_items
        SET
          seed_key = 's_north_star',
          title = 'Business North Star',
          sort_order = 70,
          content = 'Annual recurring revenue (ARR)'
        WHERE id = ${legacyNorth[0].id}
      `;
    } else if (legacyNorth.length > 0 && seededNorth[0]) {
      await sql`
        DELETE FROM strategy_items
        WHERE workspace_id = ${workspaceId}
          AND type = 'north_star'
          AND seed_key IS NULL
      `;
    }

    for (const item of SEED_STRATEGY_ITEMS) {
      await upsertStrategyItemBySeedKey(workspaceId, "jon", {
        seed_key: item.seedKey,
        type: item.type,
        title: item.title,
        content: item.content,
        status: "active",
        sort_order: item.sortOrder,
      });
      console.log(`  ✓ ${item.title}`);
    }

    console.log("2. Assumptions a113–a122 (insert only)…");
    const newAssumptions = SEED_ASSUMPTIONS.filter((a) => {
      const n = Number(a.seedKey.slice(1));
      return n >= 113 && n <= 122;
    });
    let insertedAssumptions = 0;
    for (const item of newAssumptions) {
      const created = await insertAssumptionBySeedKey(workspaceId, "jon", {
        seed_key: item.seedKey,
        statement: item.statement,
        category: item.category,
        importance: item.importance,
        confidence: item.confidence,
        status: "untested",
        owner: null,
        next_action: item.nextAction,
        target_date: null,
      });
      if (created) {
        insertedAssumptions += 1;
        console.log(`  ✓ inserted ${item.seedKey}`);
      } else {
        console.log(`  · exists ${item.seedKey}`);
      }
    }

    console.log("3. Problems + assumption links…");
    for (const problem of SEED_PROBLEMS) {
      const created = await upsertProblemBySeedKey(workspaceId, "jon", {
        seed_key: problem.seedKey,
        title: problem.title,
        description: problem.description,
        status: problem.status,
        severity: problem.severity,
        confidence: problem.confidence,
        target_customer: problem.targetCustomer,
        owner: null,
      });
      const idBySeed = await getAssumptionIdsBySeedKeys(
        workspaceId,
        problem.assumptionLinks.map((l) => l.seedKey),
      );
      for (const link of problem.assumptionLinks) {
        const assumptionId = idBySeed.get(link.seedKey);
        if (!assumptionId) {
          throw new Error(
            `Missing assumption ${link.seedKey} for problem ${problem.seedKey}`,
          );
        }
        await linkProblemAssumption(
          workspaceId,
          created.id,
          assumptionId,
          "jon",
          link.relationship,
        );
      }
      console.log(
        `  ✓ ${problem.seedKey} (${problem.assumptionLinks.length} links)`,
      );
    }

    console.log("4. Ideas + links…");
    const problemRows = await sql<{ id: string; seed_key: string }[]>`
      SELECT id, seed_key FROM problems
      WHERE workspace_id = ${workspaceId} AND seed_key IS NOT NULL
    `;
    const problemBySeed = new Map(
      problemRows.map((row) => [row.seed_key, row.id]),
    );

    for (const idea of SEED_IDEAS) {
      const created = await upsertIdeaBySeedKey(workspaceId, "jon", {
        seed_key: idea.seedKey,
        title: idea.title,
        description: idea.description,
        status: idea.status,
        submitted_by: "jon",
      });
      for (const problemSeed of idea.problemSeedKeys) {
        const problemId = problemBySeed.get(problemSeed);
        if (!problemId) {
          throw new Error(`Missing problem ${problemSeed} for idea ${idea.seedKey}`);
        }
        await linkIdeaProblem(workspaceId, created.id, problemId, "jon");
      }
      const assumptionIds = await getAssumptionIdsBySeedKeys(
        workspaceId,
        idea.assumptionSeedKeys,
      );
      for (const seedKey of idea.assumptionSeedKeys) {
        const assumptionId = assumptionIds.get(seedKey);
        if (!assumptionId) {
          throw new Error(`Missing assumption ${seedKey} for idea ${idea.seedKey}`);
        }
        await linkIdeaAssumption(workspaceId, created.id, assumptionId, "jon");
      }
      console.log(`  ✓ ${idea.seedKey}`);
    }

    console.log("5. Bets + relationship corrections…");
    for (const bet of SEED_BETS) {
      const created = await upsertBetBySeedKey(workspaceId, "jon", {
        seed_key: bet.seedKey,
        title: bet.title,
        description: bet.description,
        hypothesis: bet.hypothesis,
        status: bet.status,
        owner: null,
        started_at: null,
        target_date: null,
        success_criteria: bet.successCriteria,
        expected_outcome: bet.expectedOutcome,
      });

      if (bet.removeAssumptionSeedKeys?.length) {
        const removeIds = await getAssumptionIdsBySeedKeys(
          workspaceId,
          bet.removeAssumptionSeedKeys,
        );
        for (const seedKey of bet.removeAssumptionSeedKeys) {
          const assumptionId = removeIds.get(seedKey);
          if (assumptionId) {
            await unlinkBetAssumption(workspaceId, created.id, assumptionId);
          }
        }
      }

      // Ensure problem links match seed (add desired; remove extras for b003).
      const desiredProblems = new Set(bet.problemSeedKeys);
      const existingProblemLinks = await sql<{ problem_id: string; seed_key: string | null }[]>`
        SELECT bp.problem_id, p.seed_key
        FROM bet_problems bp
        INNER JOIN problems p ON p.id = bp.problem_id
        WHERE bp.workspace_id = ${workspaceId} AND bp.bet_id = ${created.id}
      `;
      for (const link of existingProblemLinks) {
        if (link.seed_key && !desiredProblems.has(link.seed_key)) {
          await unlinkBetProblem(workspaceId, created.id, link.problem_id);
        }
      }
      for (const problemSeed of bet.problemSeedKeys) {
        const problemId = problemBySeed.get(problemSeed);
        if (!problemId) {
          throw new Error(`Missing problem ${problemSeed} for bet ${bet.seedKey}`);
        }
        await linkBetProblem(workspaceId, created.id, problemId, "jon");
      }

      const assumptionIds = await getAssumptionIdsBySeedKeys(
        workspaceId,
        bet.assumptionLinks.map((l) => l.seedKey),
      );
      for (const link of bet.assumptionLinks) {
        const assumptionId = assumptionIds.get(link.seedKey);
        if (!assumptionId) {
          throw new Error(
            `Missing assumption ${link.seedKey} for bet ${bet.seedKey}`,
          );
        }
        await linkBetAssumption(
          workspaceId,
          created.id,
          assumptionId,
          link.relationship,
          "jon",
        );
      }
      console.log(`  ✓ ${bet.seedKey}`);
    }

    const betRows = await sql<{ id: string; seed_key: string }[]>`
      SELECT id, seed_key FROM bets
      WHERE workspace_id = ${workspaceId} AND seed_key IS NOT NULL
    `;
    const betBySeed = new Map(betRows.map((row) => [row.seed_key, row.id]));

    console.log("6. Strategic decisions…");
    for (const decision of SEED_DECISIONS) {
      const existing = await sql<{ id: string }[]>`
        SELECT id FROM decisions
        WHERE workspace_id = ${workspaceId} AND title = ${decision.title}
        LIMIT 1
      `;
      let decisionId = existing[0]?.id;
      if (!decisionId) {
        const created = await createDecision(workspaceId, "jon", {
          title: decision.title,
          decision: decision.decision,
          context: decision.context,
          rationale: decision.rationale,
          status: "active",
          decision_date: decision.decisionDate,
          decided_by: "jon",
          revisit_trigger: decision.revisitTrigger,
          revisit_date: null,
        });
        decisionId = created.id;
        console.log(`  ✓ created ${decision.title}`);
      } else {
        console.log(`  · exists ${decision.title}`);
      }

      for (const problemSeed of decision.problemSeedKeys) {
        const problemId = problemBySeed.get(problemSeed);
        if (!problemId) {
          throw new Error(`Missing problem ${problemSeed} for decision`);
        }
        await linkDecisionProblem(workspaceId, decisionId, problemId, "jon");
      }
      const assumptionIds = await getAssumptionIdsBySeedKeys(
        workspaceId,
        decision.assumptionSeedKeys,
      );
      for (const seedKey of decision.assumptionSeedKeys) {
        const assumptionId = assumptionIds.get(seedKey);
        if (!assumptionId) {
          throw new Error(`Missing assumption ${seedKey} for decision`);
        }
        await linkDecisionAssumption(
          workspaceId,
          decisionId,
          assumptionId,
          "jon",
        );
      }
      for (const betSeed of decision.betSeedKeys) {
        const betId = betBySeed.get(betSeed);
        if (!betId) throw new Error(`Missing bet ${betSeed} for decision`);
        await linkDecisionBet(workspaceId, decisionId, betId, "jon");
      }
    }

    console.log("7. Focus item…");
    const focusTitle = "Validate the proactive experimentation coworker thesis";
    const weekStart = "2026-09-21";
    const existingFocus = await sql<{ id: string }[]>`
      SELECT id FROM focus_items
      WHERE workspace_id = ${workspaceId}
        AND title = ${focusTitle}
        AND week_start = ${weekStart}::date
        AND owner = 'jon'
      LIMIT 1
    `;
    if (!existingFocus[0]) {
      const a121 = await getAssumptionIdsBySeedKeys(workspaceId, ["a121"]);
      const b004 = betBySeed.get("b004");
      await createFocusItem(workspaceId, "jon", {
        title: focusTitle,
        owner: "jon",
        week_start: weekStart,
        status: "active",
        linked_assumption_id: a121.get("a121") ?? null,
        linked_bet_id: b004 ?? null,
        linked_opportunity_id: null,
      });
      console.log(`  ✓ ${focusTitle}`);
    } else {
      console.log(`  · exists ${focusTitle}`);
    }

    console.log("\nVerification…");
    const counts = await sql<
      {
        assumptions: number;
        problems: number;
        strategy: number;
        ideas: number;
        bets: number;
        decisions: number;
        evidence: number;
        organisations: number;
      }[]
    >`
      SELECT
        (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id = ${workspaceId}) AS assumptions,
        (SELECT COUNT(*)::int FROM problems WHERE workspace_id = ${workspaceId}) AS problems,
        (SELECT COUNT(*)::int FROM strategy_items WHERE workspace_id = ${workspaceId}) AS strategy,
        (SELECT COUNT(*)::int FROM ideas WHERE workspace_id = ${workspaceId}) AS ideas,
        (SELECT COUNT(*)::int FROM bets WHERE workspace_id = ${workspaceId}) AS bets,
        (SELECT COUNT(*)::int FROM decisions WHERE workspace_id = ${workspaceId}) AS decisions,
        (SELECT COUNT(*)::int FROM evidence WHERE workspace_id = ${workspaceId}) AS evidence,
        (SELECT COUNT(*)::int FROM organisations WHERE workspace_id = ${workspaceId}) AS organisations
    `;
    const c = counts[0];
    console.log(`  assumptions: ${c.assumptions} (was ${beforeAssumptions[0].count}, inserted ${insertedAssumptions})`);
    console.log(`  problems: ${c.problems}`);
    console.log(`  strategy_items: ${c.strategy}`);
    console.log(`  ideas: ${c.ideas}`);
    console.log(`  bets: ${c.bets}`);
    console.log(`  decisions: ${c.decisions}`);
    console.log(`  evidence: ${c.evidence} (was ${beforeEvidence[0].count})`);
    console.log(`  organisations: ${c.organisations} (was ${beforeOrgs[0].count})`);

    const orphans = await sql<{ kind: string; count: number }[]>`
      SELECT 'problem_assumptions' AS kind, COUNT(*)::int AS count
      FROM problem_assumptions pa
      LEFT JOIN problems p ON p.id = pa.problem_id
      LEFT JOIN assumptions a ON a.id = pa.assumption_id
      WHERE pa.workspace_id = ${workspaceId}
        AND (p.id IS NULL OR a.id IS NULL)
      UNION ALL
      SELECT 'idea_problems', COUNT(*)::int
      FROM idea_problems ip
      LEFT JOIN ideas i ON i.id = ip.idea_id
      LEFT JOIN problems p ON p.id = ip.problem_id
      WHERE ip.workspace_id = ${workspaceId}
        AND (i.id IS NULL OR p.id IS NULL)
      UNION ALL
      SELECT 'idea_assumptions', COUNT(*)::int
      FROM idea_assumptions ia
      LEFT JOIN ideas i ON i.id = ia.idea_id
      LEFT JOIN assumptions a ON a.id = ia.assumption_id
      WHERE ia.workspace_id = ${workspaceId}
        AND (i.id IS NULL OR a.id IS NULL)
      UNION ALL
      SELECT 'bet_problems', COUNT(*)::int
      FROM bet_problems bp
      LEFT JOIN bets b ON b.id = bp.bet_id
      LEFT JOIN problems p ON p.id = bp.problem_id
      WHERE bp.workspace_id = ${workspaceId}
        AND (b.id IS NULL OR p.id IS NULL)
      UNION ALL
      SELECT 'bet_assumptions', COUNT(*)::int
      FROM bet_assumptions ba
      LEFT JOIN bets b ON b.id = ba.bet_id
      LEFT JOIN assumptions a ON a.id = ba.assumption_id
      WHERE ba.workspace_id = ${workspaceId}
        AND (b.id IS NULL OR a.id IS NULL)
      UNION ALL
      SELECT 'decision_problems', COUNT(*)::int
      FROM decision_problems dp
      LEFT JOIN decisions d ON d.id = dp.decision_id
      LEFT JOIN problems p ON p.id = dp.problem_id
      WHERE dp.workspace_id = ${workspaceId}
        AND (d.id IS NULL OR p.id IS NULL)
      UNION ALL
      SELECT 'decision_assumptions', COUNT(*)::int
      FROM decision_assumptions da
      LEFT JOIN decisions d ON d.id = da.decision_id
      LEFT JOIN assumptions a ON a.id = da.assumption_id
      WHERE da.workspace_id = ${workspaceId}
        AND (d.id IS NULL OR a.id IS NULL)
      UNION ALL
      SELECT 'decision_bets', COUNT(*)::int
      FROM decision_bets db
      LEFT JOIN decisions d ON d.id = db.decision_id
      LEFT JOIN bets b ON b.id = db.bet_id
      WHERE db.workspace_id = ${workspaceId}
        AND (d.id IS NULL OR b.id IS NULL)
    `;
    for (const row of orphans) {
      if (row.count > 0) {
        throw new Error(`Orphaned ${row.kind}: ${row.count}`);
      }
    }
    console.log("  orphan checks: clean");

    if (c.assumptions !== 122) {
      throw new Error(`Expected 122 assumptions, found ${c.assumptions}`);
    }
    if (c.problems !== 11) {
      throw new Error(`Expected 11 problems, found ${c.problems}`);
    }
    if (c.strategy < 7) {
      throw new Error(`Expected at least 7 strategy items, found ${c.strategy}`);
    }
    if (c.ideas !== 5) {
      throw new Error(`Expected 5 ideas, found ${c.ideas}`);
    }
    if (c.bets !== 4) {
      throw new Error(`Expected 4 bets, found ${c.bets}`);
    }
    if (c.decisions !== 2) {
      throw new Error(`Expected 2 decisions, found ${c.decisions}`);
    }
    if (c.evidence !== beforeEvidence[0].count) {
      throw new Error("Evidence count changed unexpectedly");
    }
    if (c.organisations !== beforeOrgs[0].count) {
      throw new Error("Organisation count changed unexpectedly");
    }

    // Deduplicate north_star if both legacy and seeded rows exist.
    const northStars = await sql<{ id: string; seed_key: string | null }[]>`
      SELECT id, seed_key FROM strategy_items
      WHERE workspace_id = ${workspaceId} AND type = 'north_star'
      ORDER BY seed_key NULLS LAST, created_at ASC
    `;
    if (northStars.length > 1) {
      const keep =
        northStars.find((row) => row.seed_key === "s_north_star") ??
        northStars[0];
      for (const row of northStars) {
        if (row.id !== keep.id) {
          await sql`
            DELETE FROM strategy_items
            WHERE workspace_id = ${workspaceId} AND id = ${row.id}
          `;
          console.log("  removed duplicate north_star strategy item");
        }
      }
    }

    const strategyFinal = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM strategy_items WHERE workspace_id = ${workspaceId}
    `;
    if (strategyFinal[0].count !== 7) {
      throw new Error(
        `Expected exactly 7 strategy items, found ${strategyFinal[0].count}`,
      );
    }

    console.log("\nProactive content seed complete.");
  } finally {
    await sql.end({ timeout: 5 });
    try {
      const { getDb } = await import("../src/lib/db/client");
      await getDb().end({ timeout: 5 });
    } catch {
      /* ignore */
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
