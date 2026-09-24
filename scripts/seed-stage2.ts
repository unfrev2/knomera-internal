import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import {
  getAssumptionIdsBySeedKeys,
  linkProblemAssumption,
  upsertProblemBySeedKey,
} from "../src/lib/db/problems";
import { upsertStrategyItemBySeedKey } from "../src/lib/db/strategy";
import { SEED_PROBLEMS, supportsSeedKeys } from "../src/lib/seed/problems";
import { SEED_STRATEGY_ITEMS } from "../src/lib/seed/strategy";

/**
 * Stage 2 seed — strategy items + problems + supports_problem links.
 * Does not modify assumption rows. Safe to re-run (upsert by seed_key).
 * Related links and proactive problems are finalized by db:seed:proactive.
 */

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

  // Ensure getDb() in imported modules can resolve a connection.
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

    const assumptionCount = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM assumptions WHERE workspace_id = ${workspaceId}
    `;
    if (assumptionCount[0].count < 112) {
      throw new Error(
        `Expected at least 112 assumptions before Stage 2 seed, found ${assumptionCount[0].count}.`,
      );
    }

    // Stage 2 historically seeded the original 3 strategy + 7 problems.
    // Proactive content expands these; keep stage2 limited to original keys when possible.
    const stage2Strategy = SEED_STRATEGY_ITEMS.filter((item) =>
      ["s_positioning", "s_vision", "s_wedge", "s_north_star"].includes(
        item.seedKey,
      ),
    );
    const stage2Problems = SEED_PROBLEMS.filter((problem) => {
      const n = Number(problem.seedKey.slice(1));
      return n >= 1 && n <= 7;
    });

    console.log("Seeding strategy items…");
    for (const item of stage2Strategy) {
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

    console.log("Seeding problems and linking assumptions…");
    let linkCount = 0;
    for (const problem of stage2Problems) {
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

      const supportKeys = supportsSeedKeys(problem);
      const idBySeed = await getAssumptionIdsBySeedKeys(
        workspaceId,
        supportKeys,
      );

      for (const seedKey of supportKeys) {
        const assumptionId = idBySeed.get(seedKey);
        if (!assumptionId) {
          throw new Error(
            `Assumption seed_key ${seedKey} not found for problem ${problem.seedKey}`,
          );
        }
        await linkProblemAssumption(
          workspaceId,
          created.id,
          assumptionId,
          "jon",
          "supports_problem",
        );
        linkCount += 1;
      }

      console.log(
        `  ✓ ${problem.title} (${supportKeys.length} assumptions)`,
      );
    }

    const strategyCount = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM strategy_items WHERE workspace_id = ${workspaceId}
    `;
    const problemCount = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM problems WHERE workspace_id = ${workspaceId}
    `;
    const links = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM problem_assumptions WHERE workspace_id = ${workspaceId}
    `;
    const stillAssumptions = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM assumptions WHERE workspace_id = ${workspaceId}
    `;

    console.log("\nVerification");
    console.log(`  strategy_items: ${strategyCount[0].count}`);
    console.log(`  problems: ${problemCount[0].count}`);
    console.log(`  problem_assumptions: ${links[0].count} (this run linked ${linkCount})`);
    console.log(`  assumptions unchanged: ${stillAssumptions[0].count}`);

    if (strategyCount[0].count < stage2Strategy.length) {
      throw new Error("Strategy seed incomplete");
    }
    if (problemCount[0].count < stage2Problems.length) {
      throw new Error("Problem seed incomplete");
    }
    if (stillAssumptions[0].count !== assumptionCount[0].count) {
      throw new Error("Assumption count changed unexpectedly");
    }

    console.log("\nStage 2 seed complete.");
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
