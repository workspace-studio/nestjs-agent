---
paths:
  - "src/**/*.repository.ts"
---

# Repository Rules

## Structure
- Inject `PrismaService` — repositories are the ONLY layer that touches Prisma
- Every method MUST filter by `entityStatus: 'ACTIVE'` (except `findByEmail` and similar unique lookups)
- Accept `Prisma.XxxCreateInput` / `Prisma.XxxUpdateInput` types — NOT DTOs

## findUnique vs findFirst
- `findUnique()` — lookup by unique field WITHOUT entityStatus filter (email, serialNumber)
- `findFirst()` — lookup by ID or any field WITH `entityStatus: 'ACTIVE'` filter

## ALLOWED_SORT_FIELDS
Validate sort fields to prevent arbitrary column access:
```typescript
private readonly ALLOWED_SORT_FIELDS = ['name', 'created', 'modified'] as const;
```
Throw `BadRequestException` if sort field is not in the list.

## P2002 Unique Constraint Handling
```typescript
catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException(`X '${data.name}' already exists`);
  }
  throw error;
}
```

## Soft Delete
```typescript
async softDelete(id: string) {
  return this.prisma.xxx.update({
    where: { id },
    data: { entityStatus: 'DELETED' },
  });
}
```

## Pagination Pattern
- Use `$transaction([findMany, count])` for paginated queries
- Calculate skip: `pageNumber * pageSize`
- Return `{ entities, totalCount }`

## Search Pattern
Use case-insensitive contains with OR across multiple fields:
```typescript
OR: [
  { title: { contains: search, mode: 'insensitive' } },
  { description: { contains: search, mode: 'insensitive' } },
]
```

## Relations
- Use `include` with `select` to limit returned fields (especially for User — never return password)
- Use `{ select: { id: true, name: true, email: true } }` for user relations

## Raw SQL (`$queryRaw` / `$executeRaw`)

Raw SQL bypasses Prisma's ORM layer. Column-name mistakes will not be caught by TypeScript and will not be caught by unit tests (which mock `$queryRaw`). They fail at runtime as Postgres `column does not exist` errors, usually surfacing as 500s in e2e tests.

### Column naming — verify, do not assume

- Prisma columns are **camelCase by default** (e.g. `courtId`, `entityStatus`, `dateFrom`).
- Columns are snake_case ONLY when the schema uses `@map("snake_name")` on the field.
- Tables are the model name unless `@@map()` is set.
- **Before writing raw SQL, open [prisma/schema.prisma](prisma/schema.prisma)** and check whether the relevant fields use `@map`. Do not guess from SQL convention. Do not port patterns from other projects.
- When unsure, read the latest migration file in `prisma/migrations/` for the actual `CREATE TABLE` / `ALTER TABLE` statements, or run `\d "TableName"` in psql.

### Always quote camelCase identifiers

Unquoted identifiers are lowercased by Postgres, which turns `courtId` into `courtid` and silently fails:

```typescript
// WRONG — unquoted, lowercased → column does not exist
await this.prisma.$queryRaw`SELECT * FROM "Reservation" r WHERE r.courtId = ${id}`;

// WRONG — assumed snake_case convention
await this.prisma.$queryRaw`SELECT * FROM reservation r WHERE r.court_id = ${id}`;

// CORRECT — quoted camelCase
await this.prisma.$queryRaw`
  SELECT * FROM "Reservation" r
  WHERE r."courtId" = ${id}
    AND r."entityStatus" = 'ACTIVE'
`;
```

### Tests — raw SQL needs an e2e test

Unit tests mock `$queryRaw`, so they will pass even if your SQL is broken. Any method using raw SQL MUST have an e2e test that exercises the query against a real database before the commit. The Pre-Commit Gate in [agents/nestjs.md](agents/nestjs.md) blocks commits with failing e2e.

### Timezones in raw SQL

If your query compares against time-of-day (operating hours, shift windows), use `AT TIME ZONE 'Europe/Zagreb'` (or the app's configured zone) explicitly. Do not let Postgres fall back to the session timezone — it is unreliable across environments.
