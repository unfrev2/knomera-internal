import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

type Sql = postgres.Sql;

let client: Sql | null = null;

function databaseUrlFromConnectionFile(): string | null {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".supabase-connection"), "utf8");
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
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
  } catch {
    return null;
  }
}

export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const fromFile = databaseUrlFromConnectionFile();
  if (fromFile) return fromFile;
  throw new Error(
    "DATABASE_URL is not configured. See README for local setup.",
  );
}

export function getDb(): Sql {
  if (client) return client;

  client = postgres(getDatabaseUrl(), {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
  });

  return client;
}

export async function withChangedBy<T>(
  changedBy: string,
  fn: (sql: Sql) => Promise<T>,
): Promise<T> {
  const sql = getDb();
  const result = await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.changed_by', ${changedBy}, true)`;
    return fn(tx as unknown as Sql);
  });
  return result as T;
}
