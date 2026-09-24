import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import {
  getAssumptionIdsBySeedKeys,
} from "../src/lib/db/problems";
import {
  linkBetAssumption,
  linkBetProblem,
  upsertBetBySeedKey,
} from "../src/lib/db/bets";
import { SEED_BETS } from "../src/lib/seed/bets";

/**
 * Stage 5 seed — initial Knomera bets + links.
 * Does not modify assumption/problem rows. Safe to re-run (upsert by seed_key).
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
    if (assumptionCount[0].count !== 112) {
      throw new Error(
        `Expected 112 assumptions before Stage 5 seed, found ${assumptionCount[0].count}.`,
      );
    }

    const problemRows = await sql<{ id: string; seed_key: string }[]>`
      SELECT id, seed_key FROM problems
      WHERE workspace_id = ${workspaceId} AND seed_key IS NOT NULL
    `;
    const problemBySeed = new Map(
      problemRows.map((row) => [row.seed_key, row.id]),
    );

    console.log("Seeding bets and links…");
    let assumptionLinkCount = 0;
    let problemLinkCount = 0;

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
      console.log(`  ✓ ${bet.title}`);

      for (const problemSeed of bet.problemSeedKeys) {
        const problemId = problemBySeed.get(problemSeed);
        if (!problemId) {
          console.warn(`    ! Missing problem seed ${problemSeed}`);
          continue;
        }
        await linkBetProblem(workspaceId, created.id, problemId, "jon");
        problemLinkCount += 1;
      }

      const assumptionIds = await getAssumptionIdsBySeedKeys(
        workspaceId,
        bet.assumptionLinks.map((link) => link.seedKey),
      );
      for (const link of bet.assumptionLinks) {
        const assumptionId = assumptionIds.get(link.seedKey);
        if (!assumptionId) {
          console.warn(`    ! Missing assumption seed ${link.seedKey}`);
          continue;
        }
        await linkBetAssumption(
          workspaceId,
          created.id,
          assumptionId,
          link.relationship,
          "jon",
        );
        assumptionLinkCount += 1;
      }
    }

    const after = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM assumptions WHERE workspace_id = ${workspaceId}
    `;
    if (after[0].count !== 112) {
      throw new Error(
        `Assumption count changed during Stage 5 seed (${after[0].count}).`,
      );
    }

    console.log(
      `\nDone. ${SEED_BETS.length} bets, ${problemLinkCount} problem links, ${assumptionLinkCount} assumption links. Assumptions still 112.`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
