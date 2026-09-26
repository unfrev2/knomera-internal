import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { cache } from "react";

type Sql = postgres.Sql;

/**
 * Process-scoped clients for Node (next dev, scripts).
 * Never reuse TCP sockets across Cloudflare Worker requests — those use
 * request-scoped clients via React cache + Hyperdrive.
 */
let appClient: Sql | null = null;

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

/**
 * Session / direct URL for migrations and admin scripts.
 * Prefer DATABASE_URL_SESSION when set; otherwise DATABASE_URL.
 */
export function getMigrationDatabaseUrl(): string {
  const explicit =
    process.env.DATABASE_URL_SESSION?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (explicit) return explicit;
  const fromFile = databaseUrlFromConnectionFile();
  if (fromFile) return fromFile;
  throw new Error(
    "DATABASE_URL (or DATABASE_URL_SESSION) is not configured. See README for local setup.",
  );
}

/** @deprecated Prefer getMigrationDatabaseUrl() or getAppDatabaseUrl(). */
export function getDatabaseUrl(): string {
  return getMigrationDatabaseUrl();
}

/**
 * Derive Supabase *transaction* pooler URL (port 6543) from an existing
 * pooler connection string on the same host. Does not invent hostnames.
 */
export function deriveTransactionPoolerUrl(connectionString: string): string {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("Invalid database connection string.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!host.includes("pooler.supabase.com")) {
    throw new Error(
      "App traffic needs a Supabase pooler URL. Set DATABASE_URL_POOLED to the transaction pooler URI (port 6543), or set DATABASE_URL to the session pooler URI (port 5432) so a transaction URL can be derived.",
    );
  }

  // Session mode = 5432 (or default). Transaction mode = 6543.
  parsed.port = "6543";
  if (!parsed.searchParams.has("sslmode")) {
    parsed.searchParams.set("sslmode", "require");
  }
  return parsed.toString();
}

/**
 * App / serverless runtime URL — transaction pooler only.
 * Never use the shared session pooler for Next/Worker request traffic.
 */
export function getAppDatabaseUrl(): string {
  const pooled = process.env.DATABASE_URL_POOLED?.trim();
  if (pooled) return pooled;

  // Derive transaction mode from the configured session/pooler URL (same host).
  return deriveTransactionPoolerUrl(getMigrationDatabaseUrl());
}

function isUsableConnectionString(url: string): boolean {
  if (!url || url.includes("postgresql://...")) return false;
  try {
    const parsed = new URL(url);
    return Boolean(parsed.hostname) && parsed.hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

type HyperdriveBinding = { connectionString: string };

function resolveWorkerHyperdriveUrl(): string | null {
  try {
    const { env } = getCloudflareContext();
    const hyperdrive = (env as { HYPERDRIVE?: HyperdriveBinding }).HYPERDRIVE;
    const url = hyperdrive?.connectionString;
    if (url && isUsableConnectionString(url)) return url;
  } catch {
    // No Cloudflare request context.
  }
  return null;
}

function inCloudflareRequest(): boolean {
  try {
    getCloudflareContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Local `next dev` (OpenNext Cloudflare forDev) has CF context but a long-lived
 * Node process. Request-scoped postgres pools there leak into Supabase session
 * limits. Only use request-scoped clients on production Worker isolates.
 */
function useProcessScopedClient(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (!inCloudflareRequest()) return true;
  return false;
}

function createSql(
  url: string,
  options: { viaHyperdrive: boolean; max: number },
): Sql {
  return postgres(url, {
    // Required for Supabase transaction pooler (port 6543) and Hyperdrive.
    prepare: false,
    max: options.max,
    fetch_types: false,
    // Release idle sockets quickly so pooler slots are not held.
    idle_timeout: 5,
    max_lifetime: 60 * 5,
    connect_timeout: 10,
    // Hyperdrive local/prod strings may use sslmode=disable (Worker↔Hyperdrive).
    // Direct / Supabase pooler URLs need TLS.
    ...(options.viaHyperdrive ? {} : { ssl: "require" as const }),
  });
}

/**
 * Request-scoped DB client for Cloudflare Workers (via Hyperdrive).
 * max: 1 — Hyperdrive pools upstream; do not open multiple sockets per request.
 */
const getDbForWorkerRequest = cache((): Sql => {
  const hyperdriveUrl = resolveWorkerHyperdriveUrl();
  if (hyperdriveUrl) {
    return createSql(hyperdriveUrl, { viaHyperdrive: true, max: 1 });
  }
  // Worker without usable Hyperdrive: fall back to transaction pooler URL.
  return createSql(getAppDatabaseUrl(), { viaHyperdrive: false, max: 1 });
});

/**
 * Application database client.
 * - Node / next dev: one process-scoped client → transaction pooler
 * - Cloudflare Worker: request-scoped client → Hyperdrive (or pooled URL)
 *
 * Migrations/seeds should open their own client with getMigrationDatabaseUrl().
 */
export function getDb(): Sql {
  if (!useProcessScopedClient()) {
    return getDbForWorkerRequest();
  }

  if (!appClient) {
    appClient = createSql(getAppDatabaseUrl(), {
      viaHyperdrive: false,
      max: 1,
    });
  }
  return appClient;
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
