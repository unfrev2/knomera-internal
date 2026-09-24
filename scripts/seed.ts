import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { SEED_ASSUMPTIONS, CATEGORIES } from "../src/lib/seed/assumptions";

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

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function generateSeedSql(workspaceIdPlaceholder = "(SELECT id FROM workspaces WHERE slug = 'knomera')") {
  const lines: string[] = [];
  lines.push("-- Generated from src/lib/seed/assumptions.ts");
  lines.push("-- Idempotent: upserts workspace and assumptions by seed_key.");
  lines.push("");
  lines.push("INSERT INTO workspaces (name, slug)");
  lines.push("VALUES ('Knomera', 'knomera')");
  lines.push("ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;");
  lines.push("");

  for (const item of SEED_ASSUMPTIONS) {
    lines.push(`INSERT INTO assumptions (
  workspace_id, seed_key, statement, category, importance, confidence, status,
  owner, next_action, target_date, created_by
) VALUES (
  ${workspaceIdPlaceholder},
  ${sqlString(item.seedKey)},
  ${sqlString(item.statement)},
  ${sqlString(item.category)},
  ${sqlString(item.importance)}::importance_level,
  ${sqlString(item.confidence)}::confidence_level,
  'untested',
  NULL,
  ${sqlString(item.nextAction)},
  NULL,
  'jon'
)
ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
  statement = EXCLUDED.statement,
  category = EXCLUDED.category,
  importance = EXCLUDED.importance,
  confidence = EXCLUDED.confidence,
  next_action = EXCLUDED.next_action;`);
    lines.push("");
  }

  return lines.join("\n");
}

async function verify(sql: postgres.Sql, workspaceId: string) {
  const checks = await sql<{
    total: number;
    categories: number;
    missing_importance: number;
    missing_confidence: number;
    missing_status: number;
    missing_next_action: number;
    evidence_count: number;
    other_workspace: number;
    owners_set: number;
    targets_set: number;
    not_jon: number;
  }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id = ${workspaceId}) AS total,
      (SELECT COUNT(DISTINCT category)::int FROM assumptions WHERE workspace_id = ${workspaceId}) AS categories,
      (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id = ${workspaceId} AND importance IS NULL) AS missing_importance,
      (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id = ${workspaceId} AND confidence IS NULL) AS missing_confidence,
      (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id = ${workspaceId} AND status IS NULL) AS missing_status,
      (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id = ${workspaceId} AND (next_action IS NULL OR next_action = '')) AS missing_next_action,
      (SELECT COUNT(*)::int FROM evidence WHERE workspace_id = ${workspaceId}) AS evidence_count,
      (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id <> ${workspaceId}) AS other_workspace,
      (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id = ${workspaceId} AND owner IS NOT NULL) AS owners_set,
      (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id = ${workspaceId} AND target_date IS NOT NULL) AS targets_set,
      (SELECT COUNT(*)::int FROM assumptions WHERE workspace_id = ${workspaceId} AND created_by IS DISTINCT FROM 'jon') AS not_jon
  `;

  const result = checks[0];
  const errors: string[] = [];

  if (result.total !== 112) errors.push(`Expected 112 assumptions, found ${result.total}`);
  if (result.categories !== CATEGORIES.length) {
    errors.push(`Expected ${CATEGORIES.length} categories, found ${result.categories}`);
  }
  if (result.missing_importance) errors.push("Some assumptions missing importance");
  if (result.missing_confidence) errors.push("Some assumptions missing confidence");
  if (result.missing_status) errors.push("Some assumptions missing status");
  if (result.missing_next_action) errors.push("Some assumptions missing next_action");
  if (result.evidence_count !== 0) errors.push(`Expected 0 evidence, found ${result.evidence_count}`);
  if (result.owners_set !== 0) errors.push("Seeded owners should be null");
  if (result.targets_set !== 0) errors.push("Seeded target_date should be null");
  if (result.not_jon !== 0) errors.push("Seeded created_by should be jon");

  if (errors.length) {
    throw new Error(`Seed verification failed:\n- ${errors.join("\n- ")}`);
  }

  console.log("Seed verification passed:");
  console.log(`  assumptions: ${result.total}`);
  console.log(`  categories: ${result.categories}`);
  console.log(`  evidence: ${result.evidence_count}`);
}

async function main() {
  const databaseUrl = loadConnectionFromLocalFile();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL missing and .supabase-connection could not be read.",
    );
  }

  // Keep supabase/seed.sql in sync with structured seed data.
  const seedSql = generateSeedSql();
  writeFileSync(resolve(process.cwd(), "supabase/seed.sql"), seedSql, "utf8");

  const sql = postgres(databaseUrl, { prepare: false, max: 1 });

  try {
    await sql`
      INSERT INTO workspaces (name, slug)
      VALUES ('Knomera', 'knomera')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    `;

    const workspace = await sql<{ id: string }[]>`
      SELECT id FROM workspaces WHERE slug = 'knomera' LIMIT 1
    `;
    const workspaceId = workspace[0].id;

    for (const item of SEED_ASSUMPTIONS) {
      await sql`
        INSERT INTO assumptions (
          workspace_id, seed_key, statement, category, importance, confidence,
          status, owner, next_action, target_date, created_by
        ) VALUES (
          ${workspaceId},
          ${item.seedKey},
          ${item.statement},
          ${item.category},
          ${item.importance},
          ${item.confidence},
          'untested',
          NULL,
          ${item.nextAction},
          NULL,
          'jon'
        )
        ON CONFLICT (workspace_id, seed_key) DO UPDATE SET
          statement = EXCLUDED.statement,
          category = EXCLUDED.category,
          importance = EXCLUDED.importance,
          confidence = EXCLUDED.confidence,
          next_action = EXCLUDED.next_action,
          status = COALESCE(assumptions.status, EXCLUDED.status),
          created_by = COALESCE(assumptions.created_by, EXCLUDED.created_by)
      `;
    }

    await verify(sql, workspaceId);
    console.log(`Seeded ${SEED_ASSUMPTIONS.length} assumptions.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
