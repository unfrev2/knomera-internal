/**
 * Export the live Supabase database for offline review.
 *
 * Writes (gitignored under exports/):
 * - manifest.json          — all schemas + row counts
 * - public/*.json          — one file per public table
 * - public-data.sql        — INSERT statements for public tables
 * - schema.sql             — copy of canonical app schema
 * - migrations/            — applied migration SQL files
 * - REVIEW.md              — short notes for reviewers
 *
 * Usage: npm run db:export
 */
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";
import postgres from "postgres";

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

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  if (value instanceof Date) return `'${value.toISOString()}'`;
  if (typeof value === "object") {
    const json = JSON.stringify(value).replace(/'/g, "''");
    return `'${json}'::jsonb`;
  }
  const text = String(value).replace(/'/g, "''");
  return `'${text}'`;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function main() {
  const databaseUrl = loadConnectionFromLocalFile();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL missing and .supabase-connection could not be read.",
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = resolve(process.cwd(), "exports", `knomera-db-${stamp}`);
  const publicDir = resolve(outDir, "public");
  const migrationsOut = resolve(outDir, "migrations");
  mkdirSync(publicDir, { recursive: true });
  mkdirSync(migrationsOut, { recursive: true });

  const sql = postgres(databaseUrl, { prepare: false, max: 1, ssl: "require" });

  try {
    const schemas = await sql<{ schema_name: string }[]>`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `;

    const tables = await sql<
      { table_schema: string; table_name: string }[]
    >`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `;

    const inventory: {
      schema: string;
      table: string;
      rows: number | null;
      exported: boolean;
    }[] = [];

    for (const table of tables) {
      let rows: number | null = null;
      try {
        const counted = await sql<{ c: number }[]>`
          SELECT COUNT(*)::int AS c
          FROM ${sql(table.table_schema)}.${sql(table.table_name)}
        `;
        rows = counted[0]?.c ?? 0;
      } catch {
        rows = null;
      }
      inventory.push({
        schema: table.table_schema,
        table: table.table_name,
        rows,
        exported: table.table_schema === "public",
      });
    }

    const publicTables = tables.filter((t) => t.table_schema === "public");
    const insertChunks: string[] = [
      "-- Knomera public schema data export",
      `-- Generated: ${new Date().toISOString()}`,
      "-- Data only. Apply schema from schema.sql / migrations first.",
      "BEGIN;",
      "",
    ];

    for (const table of publicTables) {
      const columns = await sql<{ column_name: string; data_type: string }[]>`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${table.table_name}
        ORDER BY ordinal_position
      `;
      const colNames = columns.map((c) => c.column_name);
      const rows = await sql.unsafe(
        `SELECT * FROM ${quoteIdent("public")}.${quoteIdent(table.table_name)}`,
      );

      writeFileSync(
        resolve(publicDir, `${table.table_name}.json`),
        `${JSON.stringify(rows, null, 2)}\n`,
        "utf8",
      );

      insertChunks.push(`-- ${table.table_name} (${rows.length} rows)`);
      if (rows.length === 0) {
        insertChunks.push(`-- (empty)`);
        insertChunks.push("");
        console.log(`exported public.${table.table_name}: 0 rows`);
        continue;
      }

      const colsSql = colNames.map(quoteIdent).join(", ");
      for (const row of rows) {
        const values = colNames
          .map((name) => sqlLiteral((row as Record<string, unknown>)[name]))
          .join(", ");
        insertChunks.push(
          `INSERT INTO ${quoteIdent("public")}.${quoteIdent(table.table_name)} (${colsSql}) VALUES (${values});`,
        );
      }
      insertChunks.push("");
      console.log(
        `exported public.${table.table_name}: ${rows.length} rows`,
      );
    }

    insertChunks.push("COMMIT;");
    writeFileSync(
      resolve(outDir, "public-data.sql"),
      `${insertChunks.join("\n")}\n`,
      "utf8",
    );

    const applied = await sql<{ version: string; name: string; applied_at: string }[]>`
      SELECT version, name, applied_at::text
      FROM schema_migrations
      ORDER BY version
    `.catch(() => [] as { version: string; name: string; applied_at: string }[]);

    const migrationsDir = resolve(process.cwd(), "supabase/migrations");
    for (const file of readdirSync(migrationsDir).filter((f) =>
      f.endsWith(".sql"),
    )) {
      copyFileSync(
        resolve(migrationsDir, file),
        resolve(migrationsOut, file),
      );
    }

    copyFileSync(
      resolve(process.cwd(), "supabase/schema.sql"),
      resolve(outDir, "schema.sql"),
    );

    const manifest = {
      generated_at: new Date().toISOString(),
      database: "supabase postgres (Knomera)",
      note: "Full inventory of the project database. Row data exported for public schema only (application domain). auth/storage/realtime are Supabase platform schemas and are empty of app user data.",
      schemas: schemas.map((s) => s.schema_name),
      applied_migrations: applied,
      tables: inventory,
      public_row_totals: inventory
        .filter((t) => t.schema === "public")
        .reduce((sum, t) => sum + (t.rows ?? 0), 0),
    };

    writeFileSync(
      resolve(outDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    writeFileSync(
      resolve(outDir, "REVIEW.md"),
      `# Knomera database export

Generated: ${manifest.generated_at}

## Contents

| Path | Purpose |
| --- | --- |
| \`manifest.json\` | All schemas/tables with row counts + applied migrations |
| \`schema.sql\` | Canonical fresh-install schema for the Knomera app |
| \`migrations/\` | Additive migrations applied to this database |
| \`public/*.json\` | Full row dumps for every public table (easy to review) |
| \`public-data.sql\` | Same public data as INSERT statements |

## Scope

- **Included as data:** \`public\` schema (workspaces, assumptions, evidence, strategy, problems, discovery, decisions, ideas, bets, commercial, focus, history).
- **Inventoried only:** Supabase platform schemas (\`auth\`, \`storage\`, \`realtime\`, …). This app does not use Supabase Auth; those tables are empty of founder data.

## How to restore (optional)

1. Create an empty Postgres database.
2. Apply \`schema.sql\` (or migrations in order).
3. Run \`public-data.sql\`.

Do not commit this folder — it may contain live founder data.
`,
      "utf8",
    );

    // Convenience zip-friendly pointer
    writeFileSync(
      resolve(process.cwd(), "exports", "LATEST.txt"),
      `${basename(outDir)}\n`,
      "utf8",
    );

    console.log(`\nExport written to ${outDir}`);
    console.log(`Public tables: ${publicTables.length}`);
    console.log(`Public rows: ${manifest.public_row_totals}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
