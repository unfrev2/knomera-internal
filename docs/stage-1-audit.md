# Stage 1 audit — Knomera Internal (2026-09-24)

Source of truth: the running Supabase project and this repository.
Connection: local `.supabase-connection` / `DATABASE_URL` (server-side only).

## Current tables

| Table | Purpose |
| --- | --- |
| `workspaces` | Multi-workspace-ready tenant root (`id`, `name`, `slug`, `created_at`) |
| `assumptions` | Beliefs under test; unique on `(workspace_id, statement)` and `(workspace_id, seed_key)` |
| `evidence` | Observations linked to one assumption; composite FK `(assumption_id, workspace_id)` |
| `assumption_history` | Field-change audit for confidence/importance/status/owner/next_action/target_date |

Live counts at audit time: **1** workspace (`knomera`), **112** assumptions, **0** evidence, **0** history rows.

## Enums

- `importance_level`: critical | high | medium | low
- `confidence_level`: low | medium | high | proven
- `assumption_status`: untested | testing | supported | challenged | disproved
- `evidence_type`: founder_reasoning | customer_interview | data_analysis | prototype | competitor_research | behavioural | commercial | other
- `evidence_direction`: supports | challenges | neutral

## Relationships

```
workspaces 1─* assumptions 1─* evidence
workspaces 1─* assumption_history
assumptions 1─* assumption_history
```

Evidence always belongs to exactly one assumption. No join tables yet.

## Routes

| Path | Role |
| --- | --- |
| `/login` | App-owned auth (Jon / Ahmed) |
| `/` | Overview / dashboard |
| `/overview` | Alias/redirect path supported in nav match |
| `/assumptions` | Assumption list |
| `/assumptions/[id]` | Detail, evidence timeline, history |
| `/evidence` | Workspace evidence feed |
| `/api/auth/login`, `/api/auth/logout` | Session cookie routes |

## Components (high level)

- Layout: `AppShell` (Overview · Assumptions · Evidence + user / sign out)
- Assumptions: table, form, detail actions, evidence form/timeline, confidence prompt, history
- Overview: stats, priority list, confidence matrix
- Evidence: feed
- UI primitives: Badge, Button, Field, Input, Modal, Select, Textarea, EmptyState, SourceAutocomplete

## Authentication

- Not Supabase Auth.
- bcrypt password hashes in env (`JON_PASSWORD_HASH`, `AHMED_PASSWORD_HASH`).
- JWT session cookie (`knomera_session`, HttpOnly, SameSite=Lax).
- Both users map to workspace slug `knomera` via `APP_USERS`.

## Workspace handling

- `getWorkspaceBySlug` / `getWorkspaceForUser` in `src/lib/db/workspaces.ts`.
- All domain queries filter by `workspace_id`.
- Architecture already supports multiple workspaces; UI does not switch.

## Server / database access

- `postgres` package, server-only.
- Local/scripts: `DATABASE_URL` or derived from `.supabase-connection`.
- Cloudflare Workers: Hyperdrive binding `HYPERDRIVE.connectionString`.
- Request-scoped client via React `cache()`; script singleton for Node.
- `withChangedBy` sets `app.changed_by` for history triggers.
- Anon/authenticated Supabase roles revoked; RLS deny-all policies.

## Priority logic

- Deterministic ranking in `src/lib/domain/priority.ts`.
- Weights importance, confidence uncertainty, evidence presence/strength/type, status, conflicts.
- UI surfaces “what should we test next?” — not a task system.

## Schema files before Stage 1

- `supabase/schema.sql` — idempotent full schema (fresh install).
- `supabase/seed.sql` — regenerated bootstrap of 112 assumptions.
- No `supabase/migrations/` directory yet (introduced in Stage 1).

## Migration constraints for Stage 1+

- Additive only; never drop/truncate assumptions or evidence.
- Preserve assumption IDs and URLs.
- Do not re-seed over founder-edited data.
- Fresh install continues via `schema.sql` (+ seed); existing DBs via ordered migrations.
