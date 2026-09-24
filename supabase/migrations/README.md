# Database migrations

## Rules

- Migrations are the path for **existing** Knomera databases.
- `../schema.sql` remains the canonical **fresh install** definition.
- When adding domain objects, update **both** a new migration and `schema.sql`.
- Additive and backwards-compatible by default.
- Never `DROP TABLE` / `TRUNCATE` production domain tables without explicit approval.
- Never re-seed in a way that overwrites founder-edited assumption data.

## Applying

```bash
npm run db:migrate
```

This applies any pending files in this directory (ordered by filename) and records them in `schema_migrations`.

## Naming

Use UTC timestamps:

```text
YYYYMMDDHHMMSS_short_description.sql
```

Example: `20250924163500_stage1_foundation.sql`
