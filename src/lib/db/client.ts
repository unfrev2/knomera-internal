import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { cache } from "react";

type Sql = postgres.Sql;

/** Process-scoped client for Node scripts (`db:seed`, smoke tests). Never reuse across Worker requests. */
let scriptClient: Sql | null = null;

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

function resolveConnection(): { url: string; viaHyperdrive: boolean } {
  try {
    const { env } = getCloudflareContext();
    const hyperdrive = env.HYPERDRIVE;
    if (hyperdrive?.connectionString) {
      return { url: hyperdrive.connectionString, viaHyperdrive: true };
    }
  } catch {
    // Local `next dev` / Node scripts: no Cloudflare request context.
  }

  return { url: getDatabaseUrl(), viaHyperdrive: false };
}

function createSql(url: string, viaHyperdrive: boolean): Sql {
  return postgres(url, {
    // Transaction-mode / Hyperdrive-friendly; also matches existing queries.
    prepare: false,
    // Cap concurrent sockets per request; Hyperdrive pools upstream.
    max: 5,
    fetch_types: false,
    idle_timeout: 20,
    connect_timeout: 10,
    // Hyperdrive local strings use sslmode=disable (Worker↔Hyperdrive is internal).
    // Direct Supabase URLs need TLS.
    ...(viaHyperdrive ? {} : { ssl: "require" as const }),
  });
}

/**
 * Request-scoped DB client for Next.js (RSC, actions, route handlers).
 * Workers cannot reuse TCP/TLS sockets across requests — do not use a module singleton there.
 */
const getDbForRequest = cache((): Sql => {
  const { url, viaHyperdrive } = resolveConnection();
  return createSql(url, viaHyperdrive);
});

function inCloudflareRequest(): boolean {
  try {
    getCloudflareContext();
    return true;
  } catch {
    return false;
  }
}

export function getDb(): Sql {
  if (inCloudflareRequest()) {
    return getDbForRequest();
  }

  if (!scriptClient) {
    scriptClient = createSql(getDatabaseUrl(), false);
  }
  return scriptClient;
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
