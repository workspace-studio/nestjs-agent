---
name: write-tests
description: Write comprehensive unit and e2e tests for a domain module following project testing patterns
---

# Write Tests for Module

Generate unit and e2e tests for a domain module. Usage: `/write-tests <module-name>`

Reference: `@knowledge/18-testing-patterns.md` for full patterns.
Reference: `@examples/tests/` for working examples.

## Pre-Work

1. READ the module's source files (controller, service, repository)
2. READ existing tests in the project to match patterns and style
3. READ `@examples/tests/unit/` for mock and assertion patterns
4. READ `@examples/tests/e2e/` for e2e test structure

## Unit Tests to Create

### Service Spec (`{module}.service.spec.ts`)

Test cases:
- `create` — success + ConflictException (duplicate)
- `findAll` — returns Serwizz format `{ entities, totalCount, pagination }`
- `findOne` — success + NotFoundException
- `update` — success + NotFoundException + ConflictException (if uniqueness check)
- `remove` — success (soft delete) + NotFoundException

Mock: Repository (all methods as `jest.fn()`)

### Controller Spec (`{module}.controller.spec.ts`)

Test cases:
- Each method delegates to service correctly
- Exceptions propagate from service

Mock: Service (all methods as `jest.fn()`)

### Repository Spec (`{module}.repository.spec.ts`)

Test cases:
- `create` — calls `prisma.{model}.create` with correct data
- `findAll` — uses `entityStatus: 'ACTIVE'` filter, correct pagination (`skip`/`take`)
- `findOne` — uses `findFirst` with `entityStatus: 'ACTIVE'`
- `softDelete` — sets `entityStatus: 'DELETED'`
- `existsByX` — returns boolean based on count

Mock: PrismaService with model methods as `jest.fn()`

## E2E Test (`test/e2e/{module}.e2e-spec.ts`)

Test cases:
- POST 201 (create success)
- POST 400 (validation error)
- POST 401 (no auth)
- POST 403 (wrong role, if applicable)
- POST 409 (duplicate)
- GET 200 (list with pagination — check `entities`, `totalCount`, `pagination`)
- GET 200 (single by ID)
- GET 404 (not found)
- PATCH 200 (update success)
- PATCH 404 (not found)
- DELETE 204 (soft delete)
- GET 404 (after deletion — entityStatus filter works)

## Rules

- `afterEach(() => jest.clearAllMocks())` in EVERY describe block
- Use string IDs (`'clx1234567890'`) in mock data
- Use `entityStatus: 'ACTIVE'` / `'DELETED'` (never `deletedAt`)
- Use `created` / `modified` timestamps (never `createdAt` / `updatedAt`)
- Mock at boundaries: repo mocks Prisma, service mocks repo, controller mocks service
- Test both success and failure paths for every method
- Use descriptive test names: `'should throw NotFoundException when not found'`

## Validate

```bash
npm run test             # Unit tests pass
npm run test:cov         # Check coverage (target: 80%+)
npm run test:e2e         # E2E tests pass
```
