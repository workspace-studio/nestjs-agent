---
paths:
  - "src/**/*.spec.ts"
  - "test/**"
---

# Testing Rules

## Mandatory in Every describe Block
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

## Mock at Boundaries
- Service tests: mock the repository
- Controller tests: mock the service
- Repository tests: mock PrismaService
- NEVER mock the class under test

## Test Both Paths
Every public method MUST have:
- At least 1 success test
- At least 1 failure test (NotFoundException, ConflictException, etc.)

## Naming
- Descriptive: `it('should throw NotFoundException when equipment does not exist')`
- NOT vague: `it('error case')` or `it('works')`

## Mock Data
- Use string IDs: `'clx1234567890'`
- Use `entityStatus: 'ACTIVE'` / `'DELETED'`
- Use `created` / `modified` timestamps (not createdAt/updatedAt)
- Use factory helpers from `test/utils/test-helpers.ts` when available

## Coverage
- Target: 80% minimum
- Run: `npm run test:cov`
- Exclude from coverage: `*.module.ts`, `main.ts`, `*.dto.ts`, `*.interface.ts`, `*.enum.ts`

## Test File Placement
- Unit tests: colocated as `<name>.service.spec.ts` or in `__tests__/`
- E2E tests: `test/<name>.e2e-spec.ts`

## E2E Test Structure
- Use `beforeAll` to create app and generate JWT tokens
- Use `afterAll` to clean DB and close app
- Test all HTTP methods with expected status codes (201, 200, 204, 400, 401, 403, 404, 409)
- Use `supertest` for HTTP requests

## Forbidden Practices
- NO `xit`, `xdescribe`, or `.skip` — fix or delete broken tests
- NO real database in unit tests — only in e2e
- NO shared mutable state between tests — each test must be independent
