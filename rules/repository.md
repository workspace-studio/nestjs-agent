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
