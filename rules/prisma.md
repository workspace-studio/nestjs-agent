---
paths:
  - "prisma/**"
---

# Prisma Schema & Migration Rules

## Schema Conventions
- IDs: `@id @default(cuid())` — always String CUID
- Timestamps: `created DateTime @default(now())` and `modified DateTime @updatedAt`
  - NEVER use `createdAt` / `updatedAt` naming
- Soft delete: `entityStatus EntityStatus @default(ACTIVE)` with `@@index([entityStatus])`
- Table mapping: `@@map("snake_case_plural")` on every model
- Field names: camelCase in schema, snake_case in DB via `@map()`

## Required Indexes
- `@@index([entityStatus])` on every model with soft delete
- `@@index` on every foreign key field
- `@@index` on fields commonly used in WHERE clauses

## Enums
- Define enums in schema.prisma, not in TypeScript
- Use PascalCase for enum names, UPPER_SNAKE_CASE for values
- Always include `EntityStatus { ACTIVE DELETED }` enum

## Relations
- One-to-many: foreign key field + relation field together
- Cascade delete: `onDelete: Cascade` only for owned child entities (e.g., Tasks under WorkOrder)
- Optional relations: use `?` on both the FK field and relation field

## Before Changing Fields

When renaming, removing, or changing the type of a model field, grep for ALL references before touching code:

```bash
grep -r "oldFieldName" src/ test/ --include="*.ts" -l
```

This catches references in repositories, services, controllers, DTOs, tests, and raw SQL. Schema changes ripple across layers — a field rename in `schema.prisma` will break any file that references the old name, including test assertions and `orderBy` objects.

## Migration Naming
Use descriptive snake_case: `npx prisma migrate dev --name add_status_to_work_order`

## Migration Safety
- NEVER modify or delete existing migrations
- To undo: create a new migration that reverses the change
- Always run `npx prisma generate` after schema changes
- Use `npx prisma migrate dev` for development, `npx prisma migrate deploy` for production

## Seeding
- Use `upsert` in seed files to make them idempotent
- Hash passwords with bcrypt (salt rounds: 10)
- Add `prisma.seed` field to package.json
