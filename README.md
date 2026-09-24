# Knomera Internal

Internal operating system for Knomera founders: structured memory for what the company believes, learns, decides and chooses to pursue.

> Strategy → Problems → Assumptions → Evidence → Decisions → Bets → Outcomes

Today the live product remains the **Assumption Log** (assumptions, evidence, confidence, validation priority). Stage 1 prepares non-destructive expansion; later stages add Strategy, Problems, Discovery, Decisions, Ideas, Bets, Commercial and Focus without replacing existing data.

## Domain model (target)

```text
Strategy → Problems → Assumptions → Evidence → Decisions → Bets → Outcomes
                ↑           ↑
             Ideas    Discovery / Commercial (generate evidence)
```

- **Discovery** and **Commercial** activity generate evidence against assumptions.
- **Ideas** address problems; **Bets** address problems and may depend on / test assumptions.
- **Decisions** preserve the evidence and assumptions known at the time.

This is not Jira, Notion, Miro or a CRM — it is the company decision and learning system.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase Postgres (server-side access only)
- Cloudflare Workers via `@opennextjs/cloudflare`
- Outfit + Lucide

## Security model

Authentication is application-owned (Jon / Ahmed), not Supabase Auth.

- Passwords are verified server-side against bcrypt hashes in environment variables.
- Sessions are signed JWTs in an HttpOnly cookie (`SameSite=Lax`, `Secure` in production, ~30 days).
- All database access happens on the server using `DATABASE_URL` (Postgres connection).
- Supabase `anon` / `authenticated` roles are revoked from application tables and blocked by RLS.
- No Supabase service-role or database credentials are exposed to the browser.
- Do not put privileged keys in `NEXT_PUBLIC_*` variables.

The local connection file `.supabase-connection` (if present) is gitignored and must never be committed.

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Required variables:

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string for the Supabase project |
| `SESSION_SECRET` | Long random secret used to sign session cookies |
| `JON_PASSWORD_HASH` | bcrypt hash of Jon's password |
| `AHMED_PASSWORD_HASH` | bcrypt hash of Ahmed's password |

If `.supabase-connection` already exists in this repo (local-only), you can derive `DATABASE_URL` from it:

```text
postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

URL-encode special characters in the password.

The app and `db:*` scripts can also read `.supabase-connection` automatically when `DATABASE_URL` is unset (local development only). Prefer setting `DATABASE_URL` explicitly for Cloudflare.

### 3. Generate password hashes

```bash
npm run hash-password -- "choose-a-strong-password"
```

Paste the printed `JON_PASSWORD_HASH=…` / `AHMED_PASSWORD_HASH=…` lines into `.env.local`.

Hashes are stored base64-encoded so Next.js env expansion cannot corrupt the `$` characters inside bcrypt strings.

Restart the dev server after changing `.env.local` — environment variables are not hot-reloaded.

### 4. Initialise the database

**Fresh install**

```bash
npm run db:setup
```

This applies `supabase/schema.sql`, runs pending files in `supabase/migrations/`, upserts the Knomera workspace, seeds all 112 assumptions from structured data, regenerates `supabase/seed.sql`, and verifies the seed.

**Existing Knomera database (production / already seeded)**

```bash
npm run db:migrate
npm run db:seed:stage2
```

Migrations are additive. They must not drop tables, truncate data, or re-seed over founder edits. See `docs/stage-1-audit.md` and `supabase/migrations/README.md`.

`db:seed:stage2` upserts strategy statements and problems by `seed_key` and links them to existing assumptions. It does **not** modify assumption rows.

You can also run steps separately:

```bash
npm run db:schema
npm run db:migrate
npm run db:seed
```

Or apply SQL manually in the Supabase SQL editor:

1. Run `supabase/schema.sql` (fresh only)
2. Run pending files from `supabase/migrations/` in filename order
3. Run `supabase/seed.sql` only for a brand-new empty database

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Authentication

There is no registration UI.

Users:

- Jon (`jon`)
- Ahmed (`ahmed`)

Both map server-side to the `knomera` workspace.

Sessions are independent of Supabase Auth so the product can later move to Supabase Auth or Google Workspace SSO without rewriting domain logic.

## Architecture notes (Stage 1–8)

- Workspace-scoped queries via `workspace_id` (single Knomera workspace in use; no switcher).
- Reusable linking UI: `LinkedObjectList`, `ObjectPicker` (`src/components/links/`).
- Shared page layout: `PageFrame` / `PageHeader` (`src/components/layout/Page.tsx`).
- Global text search in the shell across assumptions, problems, evidence, discovery, decisions, ideas, bets, opportunities, organisations.
- **Home** answers four questions: attention, learning, doing, closer to a business — plus a secondary activity strip.
- Migration ledger: `schema_migrations`.
- Audit snapshot: `docs/stage-1-audit.md`.
- **Strategy** and **Problems** orient assumptions around customer problems.
- **Discovery** turns conversations into evidence (via nullable `evidence.discovery_session_id`) and can link problems discussed.
- **Decisions** preserve why judgements were made, with links to assumptions, evidence and problems at the time.
- **Ideas** are a lightweight inbox (no scoring/roadmaps). **Bets** are meaningful commitments with hypotheses and outcomes.
- Bet outcomes are not evidence until someone explicitly interprets them (`evidence.bet_outcome_id` + `bet_outcome` type).
- **Commercial** tracks opportunities against existing organisations — not a CRM. Won/lost never auto-creates evidence (`evidence.opportunity_id` + `commercial` type).
- **Focus** answers “what are Jon and Ahmed focusing on this week?” — no backlog, Kanban, or subtasks.

## Cloudflare deployment

The app deploys to **Cloudflare Workers** via OpenNext (`@opennextjs/cloudflare`). It is independent of the public Knomera landing page.

Worker name (from `wrangler.jsonc`): `knomera-internal`

### Prerequisites

1. A Cloudflare account with Workers enabled.
2. Database already set up (`npm run db:setup` or SQL in Supabase).
3. Wrangler logged in locally:

```bash
npx wrangler login
```

### 1. Prepare the four secrets

You need these **server-only** values (never `NEXT_PUBLIC_*`):

| Variable | What to put |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres connection string |
| `SESSION_SECRET` | Long random string (32+ chars) |
| `JON_PASSWORD_HASH` | Output of `npm run hash-password` |
| `AHMED_PASSWORD_HASH` | Output of `npm run hash-password` |

#### Generate `SESSION_SECRET`

```bash
openssl rand -hex 32
```

#### Generate password hashes

```bash
npm run hash-password -- "jon-strong-password" jon
npm run hash-password -- "ahmed-strong-password" ahmed
```

Copy the printed `JON_PASSWORD_HASH=…` and `AHMED_PASSWORD_HASH=…` values (base64 — safe to paste as-is).

#### Build `DATABASE_URL` (local / Node scripts)

From the Supabase dashboard → **Project Settings → Database**, use the **direct** connection string (port `5432`):

```text
postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

URL-encode special characters in the password (`?` → `%3F`, etc.).

Put this in `.env.local` as `DATABASE_URL`. Local `npm run dev`, `db:*`, and smoke tests use it.

### 2. Create Cloudflare Hyperdrive (required for production)

Cloudflare Workers **cannot** open a reliable TLS TCP connection straight to Supabase. Deployed traffic must go through **Hyperdrive**, which pools and terminates TLS to your database.

Create a Hyperdrive config with the **same direct** Supabase URI (not the pooler):

```bash
npx wrangler hyperdrive create knomera-internal-db --connection-string="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
```

Copy the printed config **id**, paste it into `wrangler.jsonc` under `hyperdrive[0].id` (replace `REPLACE_WITH_HYPERDRIVE_ID`), then commit.

The Worker reads `env.HYPERDRIVE.connectionString` at runtime — you do **not** need `DATABASE_URL` as a Worker secret when Hyperdrive is configured.

### 3. Set secrets in Cloudflare

Use **Secrets** (encrypted) for auth. `DATABASE_URL` is optional on the Worker if Hyperdrive is wired up.

#### Option A — CLI (recommended)

From the project root, after `npx wrangler login`:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put JON_PASSWORD_HASH
npx wrangler secret put AHMED_PASSWORD_HASH
```

Paste each value when prompted. Secrets are attached to the `knomera-internal` Worker.

#### Option B — Dashboard

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**.
2. Open the `knomera-internal` Worker (create it on first deploy if it does not exist yet).
3. Go to **Settings → Variables and Secrets**.
4. Under **Secrets**, add:

   - `SESSION_SECRET`
   - `JON_PASSWORD_HASH`
   - `AHMED_PASSWORD_HASH`

5. Save. Do **not** mark these as “Text” / public.

Optional for CI builds: if Cloudflare builds the app for you, also add the same names under **Build variables / secrets**. For the default `npm run deploy` flow (build on your machine), runtime secrets are enough.

### 4. Deploy

```bash
npm run deploy
```

This runs:

1. `opennextjs-cloudflare build` (Next.js + Worker adapter)
2. `opennextjs-cloudflare deploy` (upload to Cloudflare)

On success, Wrangler prints a `*.workers.dev` URL.

### Git-connected Cloudflare builds

If the Worker is connected to GitHub/GitLab, Cloudflare defaults to `npm run build` then `npx wrangler deploy`. That fails for OpenNext because `npm run build` is only `next build` — it never writes `.open-next/`, so deploy errors with **Could not find compiled Open Next config**.

In **Workers & Pages → knomera-internal → Settings → Builds**, set:

| Setting | Value |
| --- | --- |
| **Build command** | `npm run build:worker` |
| **Deploy command** | `npx wrangler deploy` |

(`build:worker` runs `opennextjs-cloudflare build`, which runs Next.js and produces the Worker bundle Wrangler expects.)

Alternatively for a one-shot local-style CI deploy: Build command `npm run deploy`, and leave Deploy as a no-op only if your Cloudflare UI allows it — prefer the two-step settings above.

Preview the Worker runtime locally before deploying:

```bash
npm run preview
```

(`preview` still needs local env — use `.dev.vars` with the same auth secrets if you want a Workers-local preview. For Hyperdrive locally, set `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` to your direct Supabase URI — same value as `DATABASE_URL`.)

Example `.dev.vars` / `.env.local` extras:

```bash
DATABASE_URL=postgresql://...
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgresql://...
SESSION_SECRET=...
JON_PASSWORD_HASH=...
AHMED_PASSWORD_HASH=...
```

### 5. Attach a custom subdomain

Example: `assumptions.knomera.com`

1. Cloudflare Dashboard → **Workers & Pages** → `knomera-internal`.
2. **Settings → Domains & Routes** (or **Triggers → Custom Domains**).
3. **Add Custom Domain** → enter `assumptions.knomera.com`.
4. If the Knomera zone is already on Cloudflare, DNS is created automatically.
5. Wait for the certificate / DNS to become active.

Do not hard-code the hostname in the app.

### 6. Smoke-check production

1. Open the Worker URL or custom domain → should redirect to `/login`.
2. Sign in as Jon and Ahmed with the passwords you hashed.
3. Confirm Overview loads the 112 assumptions.
4. Confirm Sign out clears the session.

### Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Login always fails | Wrong / stale password hashes; regenerate and `wrangler secret put` again |
| “Database unavailable” / TLS `internal_tls_wrap` / 500 on `/` | Worker is dialing Supabase directly — create Hyperdrive, set `wrangler.jsonc` `hyperdrive[0].id`, redeploy |
| Deploy fails: no local Hyperdrive connection string | OpenNext deploy calls Wrangler’s local proxy — ensure `hyperdrive.localConnectionString` is set in `wrangler.jsonc` (placeholder is fine for CI) |
| Env works locally but not on CF | Secrets not set on the Worker, or set on the wrong Worker name |
| Cookie / auth oddities | `SESSION_SECRET` changed after users already had cookies — sign out / clear cookies |
| Could not find compiled Open Next config | CI Build command is still `npm run build` — change it to `npm run build:worker` |
| Invalid `_headers` configuration | `public/_headers` must use `#` comments and `Name: value` pairs — not `/* */` block comments |

### Security checklist

- [ ] No Supabase service-role or DB password in `NEXT_PUBLIC_*`
- [ ] `.env.local` and `.supabase-connection` stay gitignored
- [ ] Auth secrets stored as Cloudflare **Secrets**
- [ ] Hyperdrive holds the DB connection string (not a public Worker var)
- [ ] Founder passwords are strong and unique


## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production Next.js build (used by OpenNext) |
| `npm run build:worker` | OpenNext Cloudflare Worker build (use this in CI) |
| `npm run lint` | ESLint |
| `npm run db:schema` | Apply full `schema.sql` (fresh / idempotent) |
| `npm run db:migrate` | Apply pending `supabase/migrations/*` |
| `npm run db:seed` | Seed assumptions + verify (bootstrap only — do not overwrite production edits) |
| `npm run db:seed:stage2` | Upsert strategy + problems + assumption links (safe re-run) |
| `npm run db:seed:stage5` | Upsert initial bets + assumption/problem links (safe re-run) |
| `npm run db:setup` | Schema + migrate + assumption seed + Stage 2 + Stage 5 seeds |
| `npm run smoke` | Auth, workspace, CRUD, history, migration checks |
| `npm run hash-password` | Generate bcrypt hash |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run preview` | Build and preview on Cloudflare runtime locally |

## Product notes

Central objects today are **strategy**, **problems**, **assumptions**, **evidence**, **discovery**, **decisions**, **ideas**, **bets**, **opportunities** and **focus**.

**Home** answers four questions from live data: what needs attention, what we’re learning, what we’re doing, and whether we’re getting closer to a business. Recent activity is secondary. Global search (shell) is plain text, grouped by type — not semantic.

**Organisation** detail (`/organisations/[id]`) is compact customer history (contacts, discovery, problems discussed, evidence provenance, opportunities) — not a CRM.

- Ideas are cheap; bets represent commitment. Do not conflate them.
- Bet outcomes do not auto-update linked assumptions. Evidence is created only when founders interpret an outcome as such.
- Commercial opportunities reuse organisations from Discovery. Stage changes (won/lost) are not evidence until interpreted.
- Focus is weekly and personal — if it starts resembling Linear, stop.
- Decisions are historical records — changing current knowledge should not silently rewrite why a decision was made.
- Discovery generates evidence against assumptions; deleting a session does not delete evidence (`ON DELETE SET NULL`).
- Problems surface evidence through linked assumptions (no duplicated evidence records).
- Founder confidence is never auto-updated when evidence is added.
- “Evidence suggests” is a deterministic decision aid only.
- Validation priority ranking is deterministic and lives in `src/lib/domain/priority.ts`.
- Important field changes are recorded in `assumption_history` via a database trigger (with `app.changed_by` set by the server).
- Problem, decision, bet and opportunity changes are recorded in `entity_history` the same way.
- Detail pages show relationship counts (evidence, discovery, bets, organisations) — contextual indicators, not vanity scores.
- Home closer metrics are early commercial indicators only — no vanity dashboards.
