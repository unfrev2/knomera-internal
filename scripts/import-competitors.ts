/**
 * One-shot / idempotent import of competitor organisations for Stage 3 research.
 * Matches by workspace + lower(name). Sets type=competitor, website, and notes.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

const COMPETITORS: Array<{ name: string; website: string; relevance: string }> =
  [
    {
      name: "Optimizely",
      website: "https://www.optimizely.com/",
      relevance: "Direct",
    },
    { name: "VWO", website: "https://vwo.com/", relevance: "Direct" },
    {
      name: "AB Tasty",
      website: "https://www.abtasty.com/",
      relevance: "Direct",
    },
    {
      name: "Kameleoon",
      website: "https://www.kameleoon.com/",
      relevance: "Direct",
    },
    {
      name: "GrowthBook",
      website: "https://www.growthbook.io/",
      relevance: "Direct",
    },
    {
      name: "Statsig",
      website: "https://www.statsig.com/",
      relevance: "Direct",
    },
    {
      name: "Amplitude",
      website: "https://amplitude.com/",
      relevance: "Direct / analytics expansion",
    },
    {
      name: "LaunchDarkly",
      website: "https://launchdarkly.com/",
      relevance: "Direct / feature management",
    },
    {
      name: "Convert",
      website: "https://www.convert.com/",
      relevance: "Direct",
    },
    {
      name: "PostHog",
      website: "https://posthog.com/",
      relevance: "Direct / analytics expansion",
    },
    {
      name: "Adobe",
      website: "https://www.adobe.com/",
      relevance: "Direct via Adobe Target",
    },
    {
      name: "Dynamic Yield",
      website: "https://www.dynamicyield.com/",
      relevance: "Direct / personalisation",
    },
    {
      name: "Monetate",
      website: "https://monetate.com/",
      relevance: "Direct / personalisation",
    },
    {
      name: "Datadog",
      website: "https://www.datadoghq.com/",
      relevance: "Direct/adjacent via Eppo",
    },
    {
      name: "Harness",
      website: "https://www.harness.io/",
      relevance: "Direct/adjacent via Split",
    },
    {
      name: "DevCycle",
      website: "https://devcycle.com/",
      relevance: "Direct / feature management",
    },
    {
      name: "Conductrics",
      website: "https://conductrics.com/",
      relevance: "Direct",
    },
    {
      name: "Evolv AI",
      website: "https://evolv.ai/",
      relevance: "Direct / AI",
    },
    {
      name: "Intempt",
      website: "https://intempt.com/",
      relevance: "Direct / personalisation",
    },
    {
      name: "SiteSpect",
      website: "https://www.sitespect.com/",
      relevance: "Direct",
    },
    { name: "Varify.io", website: "https://varify.io/", relevance: "Direct" },
    {
      name: "Convertize",
      website: "https://www.convertize.com/",
      relevance: "Direct",
    },
    { name: "FigPii", website: "https://www.figpii.com/", relevance: "Direct" },
    {
      name: "Zoho",
      website: "https://www.zoho.com/pagesense/",
      relevance: "Direct via PageSense",
    },
    {
      name: "Unleash",
      website: "https://www.getunleash.io/",
      relevance: "Adjacent / feature management",
    },
    {
      name: "Flagsmith",
      website: "https://www.flagsmith.com/",
      relevance: "Adjacent / feature management",
    },
    {
      name: "ConfigCat",
      website: "https://configcat.com/",
      relevance: "Adjacent / feature management",
    },
    {
      name: "Firebase",
      website: "https://firebase.google.com/",
      relevance: "Adjacent / app experimentation",
    },
    {
      name: "Webflow",
      website: "https://webflow.com/",
      relevance: "Adjacent via Webflow Optimize",
    },
    {
      name: "Mutiny",
      website: "https://www.mutinyhq.com/",
      relevance: "Adjacent / AI personalisation",
    },
    {
      name: "Insider",
      website: "https://useinsider.com/",
      relevance: "Adjacent / personalisation",
    },
    {
      name: "Unbounce",
      website: "https://unbounce.com/",
      relevance: "Adjacent / optimisation",
    },
  ];

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

  const sql = postgres(databaseUrl, { prepare: false, max: 1, ssl: "require" });

  try {
    const workspaces = await sql<{ id: string }[]>`
      SELECT id FROM workspaces WHERE slug = 'knomera' LIMIT 1
    `;
    if (!workspaces[0]) {
      throw new Error("Workspace 'knomera' not found.");
    }
    const workspaceId = workspaces[0].id;

    let inserted = 0;
    let updated = 0;

    for (const competitor of COMPETITORS) {
      const notes = `Competitor relevance: ${competitor.relevance}`;
      const existing = await sql<{ id: string }[]>`
        SELECT id
        FROM organisations
        WHERE workspace_id = ${workspaceId}
          AND lower(name) = lower(${competitor.name})
        LIMIT 1
      `;

      if (existing[0]) {
        await sql`
          UPDATE organisations SET
            website = ${competitor.website},
            organisation_type = 'competitor',
            notes = ${notes}
          WHERE workspace_id = ${workspaceId} AND id = ${existing[0].id}
        `;
        updated += 1;
        console.log(`updated  ${competitor.name}`);
      } else {
        await sql`
          INSERT INTO organisations (
            workspace_id,
            name,
            website,
            organisation_type,
            notes,
            created_by
          ) VALUES (
            ${workspaceId},
            ${competitor.name},
            ${competitor.website},
            'competitor',
            ${notes},
            'jon'
          )
        `;
        inserted += 1;
        console.log(`inserted ${competitor.name}`);
      }
    }

    const total = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM organisations
      WHERE workspace_id = ${workspaceId}
        AND organisation_type = 'competitor'
    `;

    console.log(
      `\nDone. inserted=${inserted} updated=${updated} competitor_total=${total[0]?.count ?? 0}`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
