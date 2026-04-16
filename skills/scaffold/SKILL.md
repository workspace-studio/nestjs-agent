---
name: scaffold
description: Create a complete new domain module with Prisma model, migration, DTOs, repository, service, controller, and tests
---

# Scaffold New Domain Module

Create a complete domain module for a NestJS application. Usage: `/scaffold <domain-name> — <field descriptions>`

## Pre-Work

1. READ the project's CLAUDE.md for project-specific instructions
2. READ at least one existing module as reference (match complexity to your task)
3. READ `@knowledge/10-domain-scaffold.md` for the full scaffold guide
4. READ `@examples/simple-domain/` for a basic CRUD reference
5. READ `@examples/medium-domain/` if the domain has foreign keys or enums

## Steps

### Step 1: Gather Requirements

Ask the user (if not already specified):
- Domain name (singular form, e.g., "court", "reservation")
- Fields with types and constraints
- Relations to other models (FK references)
- Which roles can read/write
- Any custom business rules

### Step 2: Prisma Model

Add to `prisma/schema.prisma`:

```prisma
model {Name} {
  id           String         @id @default(cuid())
  // ... user-specified fields
  entityStatus EntityStatus   @default(ACTIVE)
  created      DateTime       @default(now())
  modified     DateTime       @updatedAt

  @@index([entityStatus])
  @@map("{name_snake_case}")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_{name_snake_case}_table
```

### Step 3: Create Folder Structure

```
src/modules/{domain}/
├── {domain}.module.ts
├── {domain}.controller.ts
├── {domain}.service.ts
├── {domain}.repository.ts
└── dto/
    ├── create-{domain}.dto.ts
    ├── update-{domain}.dto.ts
    ├── {domain}-response.dto.ts
    └── {domain}-list-response.dto.ts
```

### Step 4: Implement Files

Follow patterns from `@knowledge/04-prisma-patterns.md` (repository), `@knowledge/05-service-patterns.md` (service), `@knowledge/06-controller-security.md` (controller).

**Repository** must include:
- `ALLOWED_SORT_FIELDS` validation
- P2002 error handling in `create()`
- `entityStatus: 'ACTIVE'` filter in all queries
- `findFirst()` for ID lookups with entityStatus filter
- `findUnique()` for unique field lookups without entityStatus filter
- Serwizz pagination: return `{ entities, totalCount }`

**Service** must include:
- Uniqueness validation before create → `ConflictException`
- Existence validation before read/update/delete → `NotFoundException`
- FK reference validation → `BadRequestException`
- Return Serwizz format for lists: `{ entities, totalCount, pagination: { pageNumber, pageSize } }`

**Controller** must include:
- `@ApiTags`, `@ApiBearerAuth('bearerAuth')`, `@Controller()`
- `@Roles()` on write endpoints
- `@Param('id') id: string` (no ParseIntPipe)
- `@Query() query: PaginationQueryDto` for list endpoints
- Swagger decorators on every endpoint

**DTOs** must include:
- `CreateDto` with class-validator decorators + `@ApiProperty`
- `UpdateDto` with `PartialType(CreateDto)`
- `ResponseDto` with `@ApiProperty` on all fields
- `ListResponseDto` with entities array, totalCount, pagination

### Step 5: Register Module

Add to `app.module.ts` imports.

### Step 6: Write Tests

Use the test-writer subagent or follow `@knowledge/18-testing-patterns.md`:
- Service spec (create success/conflict, findOne success/not found, update, remove)
- Controller spec (delegation + exception propagation)
- Repository spec (Prisma mock verification)
- E2E spec (POST 201/400/401/409, GET 200/404, PATCH 200, DELETE 204)

### Step 7: Validate

```bash
npm run build          # Must compile
npm run lint           # Must pass lint
npm run test           # Must pass unit tests
npm run test:e2e       # Must pass e2e tests
```

Fix any failures and re-run until all green.

### Step 8: Update FOLDER-STRUCTURE.md & CLAUDE.md

Add the new module to the project's FOLDER-STRUCTURE.md folder tree and module description in CLAUDE.md.

### Step 9: Commit & PR

Use `/create-pr` skill or manually:
```bash
git checkout -b {issue_number}-add-{domain}-domain
git add src/ prisma/ test/ CLAUDE.md FOLDER-STRUCTURE.md
git commit -m "#{issue_number}: add {domain} domain with CRUD operations"
```

## DO NOT

- Do NOT skip any layer (controller, service, repository) — all three are mandatory
- Do NOT inject PrismaService into services — only repositories access Prisma
- Do NOT use `findUnique` for ID lookups that need entityStatus filter — use `findFirst`
- Do NOT use numeric IDs — always String CUID (`@id @default(cuid())`)
- Do NOT use `createdAt`/`updatedAt` — use `created`/`modified`
- Do NOT use `deletedAt` for soft deletes — use `entityStatus: 'DELETED'`
- Do NOT skip Swagger decorators — every endpoint needs `@ApiOperation` + `@ApiResponse`
- Do NOT copy patterns from other modules without validating against `rules/` — existing code may have pre-existing violations
