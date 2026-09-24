# Knomera Internal — Assumption Log

Internal web application for Knomera founders to manage product assumptions and evidence.

> What does Knomera currently believe, why do we believe it, and what should we test next?

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

Paste the **escaped** line printed by the script into `.env.local`.

Next.js expands `$VAR` inside `.env` files, which would otherwise corrupt bcrypt hashes (they contain `$`). The script prints values with each `$` escaped as `\$`. The application normalizes both escaped and unescaped forms when verifying passwords.

### 4. Initialise the database

```bash
npm run db:setup
```

This applies `supabase/schema.sql`, upserts the Knomera workspace, seeds all 112 assumptions from structured data, regenerates `supabase/seed.sql`, and verifies:

- exactly 112 assumptions
- all 11 categories present
- importance, confidence, status and next action populated
- no evidence rows
- owners and target dates null
- `created_by = jon`

You can also run the steps separately:

```bash
npm run db:schema
npm run db:seed
```

Or apply the SQL manually in the Supabase SQL editor:

1. Run `supabase/schema.sql`
2. Run `supabase/seed.sql`

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

## Cloudflare deployment

The app deploys independently of the public Knomera landing page.

### 1. Build locally (optional check)

```bash
npm run build
```

### 2. Configure Cloudflare project secrets

In the Cloudflare dashboard (Workers → your project → Settings → Variables), set:

- `DATABASE_URL`
- `SESSION_SECRET`
- `JON_PASSWORD_HASH`
- `AHMED_PASSWORD_HASH`

Also add the same values as **build** secrets/variables so `next build` can run in CI if needed.

Do not configure a public Supabase anon/publishable key for this app.

### 3. Deploy

```bash
npm run deploy
```

This runs OpenNext + Wrangler (`opennextjs-cloudflare build && opennextjs-cloudflare deploy`).

Preview Workers locally:

```bash
npm run preview
```

### 4. Custom subdomain

In Cloudflare:

1. Open the Worker/Pages project.
2. Add a custom domain such as `assumptions.knomera.com`.
3. Confirm DNS for the Knomera zone points at the Worker.

Do not hard-code the hostname in application code.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js development server |
| `npm run build` | Production Next.js build |
| `npm run lint` | ESLint |
| `npm run db:schema` | Apply schema |
| `npm run db:seed` | Seed + verify |
| `npm run db:setup` | Schema + seed |
| `npm run hash-password` | Generate bcrypt hash |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run preview` | Build and preview on Cloudflare runtime locally |

## Product notes

Central objects are **assumptions** and **evidence**.

- Founder confidence is never auto-updated when evidence is added.
- “Evidence suggests” is a deterministic decision aid only.
- Validation priority ranking is deterministic and lives in `src/lib/domain/priority.ts`.
- Important field changes are recorded in `assumption_history` via a database trigger (with `app.changed_by` set by the server).
