---
name: review-migration
description: Review a Prisma migration for safety — destructive ops, naming, rename-of-rename, missing indexes
disable-model-invocation: true
---

# Review Migration

Review a Prisma migration before applying. Usage: `/review-migration` (latest) or `/review-migration <migration-name>`

## Steps

### Step 1: Find the Migration

```bash
ls -t prisma/migrations/ | head -5
```

Read the `migration.sql` file from the latest (or specified) migration directory.

### Step 2: Read the SQL

Parse every statement. Categorize:
- **CREATE TABLE** — new table
- **ALTER TABLE** — column add/drop/rename, constraint changes
- **DROP TABLE** — table removal
- **CREATE INDEX** — new index
- **INSERT/UPDATE** — data backfill

### Step 3: Check Against Safety Rules

- [ ] No `DROP TABLE` without explicit user confirmation
- [ ] No `DROP COLUMN` on production-facing tables without backfill plan
- [ ] `ALTER TABLE ... SET NOT NULL` has a `DEFAULT` or preceding backfill `UPDATE`
- [ ] No rename of recently-added columns (rename-of-rename = design failure — should have been caught in Feature Design Pass)
- [ ] New indexes on large tables use `CREATE INDEX CONCURRENTLY` (if supported by migration runner)
- [ ] Column names match Prisma schema (camelCase unless `@map` is used)
- [ ] Table names use `@@map` convention
- [ ] EntityStatus enum values are final (no INACTIVE→BLOCKED rename patterns)
- [ ] FK constraints have `ON DELETE` behavior specified (CASCADE, SET NULL, or RESTRICT)
- [ ] No raw data manipulation that could fail on non-empty tables

### Step 4: Cross-Reference with Schema

Read `prisma/schema.prisma`:
- Verify every new column in migration exists in schema
- Verify `@map` / `@@map` decorators match SQL column/table names
- Check that new relations have `@@index` on FK fields

### Step 5: Report

For each finding:

```
[SAFE|WARNING|DANGEROUS] — <title>

Description: <what the migration does>
Risk: <what could go wrong in production>
Recommendation: <what to do>
```

End with overall assessment:
```
Migration: <name>
Tables affected: <list>
Verdict: SAFE TO APPLY / REVIEW REQUIRED / DO NOT APPLY
```

## Common Dangerous Patterns

| Pattern | Risk | Fix |
|---------|------|-----|
| `ALTER COLUMN SET NOT NULL` without DEFAULT | Fails on non-empty table | Add DEFAULT or backfill first |
| `DROP COLUMN` | Data loss, irreversible | Confirm with user, backup first |
| Rename column that was added <3 commits ago | Design churn, wasted migration | Fix in Feature Design Pass before first migration |
| `CREATE INDEX` on 1M+ row table | Locks table during creation | Use CONCURRENTLY |
| FK without ON DELETE | Orphaned rows or unexpected errors | Specify CASCADE, SET NULL, or RESTRICT |
