import { readdirSync, readFileSync } from "node:fs";
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

function listMigrationFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

function versionFromFilename(filename: string): string {
  const match = basename(filename).match(/^(\d+)/);
  if (!match) {
    throw new Error(`Migration filename must start with a timestamp: ${filename}`);
  }
  return match[1];
}

async function main() {
  const databaseUrl = loadConnectionFromLocalFile();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL missing and .supabase-connection could not be read.",
    );
  }

  const migrationsDir = resolve(process.cwd(), "supabase/migrations");
  const files = listMigrationFiles(migrationsDir);
  const sql = postgres(databaseUrl, { prepare: false, max: 1, ssl: "require" });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const applied = await sql<{ version: string }[]>`
      SELECT version FROM schema_migrations ORDER BY version
    `;
    const appliedSet = new Set(applied.map((row) => row.version));

    let pending = 0;
    for (const file of files) {
      const version = versionFromFilename(file);
      if (appliedSet.has(version)) {
        console.log(`skip  ${file}`);
        continue;
      }

      const body = readFileSync(resolve(migrationsDir, file), "utf8");
      console.log(`apply ${file}`);
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`
          INSERT INTO schema_migrations (version, name)
          VALUES (${version}, ${file})
        `;
      });
      pending += 1;
    }

    if (pending === 0) {
      console.log("No pending migrations.");
    } else {
      console.log(`Applied ${pending} migration${pending === 1 ? "" : "s"}.`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
