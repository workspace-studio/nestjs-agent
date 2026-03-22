---
name: add-field
description: Add a new field to an existing Prisma model — update schema, migration, DTOs, repository, service, controller, and tests
---

# Add Field to Existing Model

Add a new field end-to-end. Usage: `/add-field <model> — <field-name> <type> [constraints]`

## Steps

### Step 1: Gather Requirements

Confirm with the user (if not specified):
- Model name (e.g., "Court", "Reservation")
- Field name (e.g., "capacity", "startDate")
- Type (String, Int, DateTime, Boolean, enum, relation)
- Required or optional?
- Default value?
- Unique constraint?
- Should it be filterable in list endpoint?
- Should it be sortable?

### Step 2: Update Prisma Schema

Add field to the model in `prisma/schema.prisma`:

```prisma
model Court {
  // ... existing fields
  newField  String?    // or appropriate type
  // ... audit fields
}
```

Add index if the field will be filtered/sorted:
```prisma
@@index([newField])
```

### Step 3: Create Migration

```bash
npx prisma migrate dev --name add_{field_name}_to_{model_name}
```

### Step 4: Update DTOs

**CreateDto**: Add field with class-validator decorators and `@ApiProperty`:
```typescript
@ApiProperty({ description: '...', required: false })
@IsOptional()
@IsString()
newField?: string;
```

**UpdateDto**: Inherits automatically via `PartialType(CreateDto)`.

**ResponseDto**: Add field with `@ApiProperty`.

**ListResponseDto**: No change needed (entities carry the new field).

### Step 5: Update Repository (if needed)

- If field is **filterable**: add to `where` clause in `findAll()`
- If field is **sortable**: add to `ALLOWED_SORT_FIELDS`
- If field is **unique**: consider P2002 handling in `create()` and `update()`
- If field is a **relation**: add `include` or `select` in queries

### Step 6: Update Service (if needed)

- If field has **business rules**: add validation logic
- If field is **unique**: add uniqueness check before create/update
- If field needs **transformation**: add to `toResponseDto()` if applicable

### Step 7: Update Controller (if needed)

- If field is **filterable**: add `@ApiQuery` for list endpoint
- If field has **special access rules**: update `@Roles`

### Step 8: Update Tests

- Update mock objects to include the new field
- Add test case for create with new field
- Add test case for filtering/sorting if applicable
- Update e2e tests

### Step 9: Validate

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

### Step 10: Update CLAUDE.md

If the field changes the domain significantly, update the module description in CLAUDE.md.
