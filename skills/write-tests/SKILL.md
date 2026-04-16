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

```typescript
describe('{Module}Service', () => {
  let service: {Module}Service;
  let repository: jest.Mocked<{Module}Repository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {Module}Service,
        { provide: {Module}Repository, useValue: { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn(), update: jest.fn(), softDelete: jest.fn() } },
      ],
    }).compile();

    service = module.get({Module}Service);
    repository = module.get({Module}Repository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create and return entity', async () => {
      repository.create.mockResolvedValue(mockEntity);
      const result = await service.create(createDto);
      expect(result).toEqual(mockEntity);
      expect(repository.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ConflictException on duplicate', async () => {
      repository.create.mockRejectedValue(new ConflictException());
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return entity when found', async () => {
      repository.findOne.mockResolvedValue(mockEntity);
      expect(await service.findOne('clx1234567890')).toEqual(mockEntity);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
```

Test cases:
- `create` — success + ConflictException (duplicate)
- `findAll` — returns Serwizz format `{ entities, totalCount, pagination }`
- `findOne` — success + NotFoundException
- `update` — success + NotFoundException + ConflictException (if uniqueness check)
- `remove` — success (soft delete) + NotFoundException

### Controller Spec (`{module}.controller.spec.ts`)

Test cases:
- Each method delegates to service correctly
- Exceptions propagate from service

### Repository Spec (`{module}.repository.spec.ts`)

Test cases:
- `create` — calls `prisma.{model}.create` with correct data
- `findAll` — uses `entityStatus: 'ACTIVE'` filter, correct pagination (`skip`/`take`)
- `findOne` — uses `findFirst` with `entityStatus: 'ACTIVE'`
- `softDelete` — sets `entityStatus: 'DELETED'`
- `existsByX` — returns boolean based on count

## E2E Test (`test/e2e/{module}.e2e-spec.ts`)

```typescript
describe('{Module} (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    // ... app setup, get JWT token
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/{module}', () => {
    it('should create entity — 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/{module}')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test', /* fields */ })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test');
    });

    it('should return 400 on invalid input', async () => {
      await request(app.getHttpServer())
        .post('/api/{module}')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}) // missing required fields
        .expect(400);
    });

    it('should return 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/{module}')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/{module}', () => {
    it('should return paginated list — 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/{module}')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body).toHaveProperty('entities');
      expect(res.body).toHaveProperty('totalCount');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toEqual({ pageNumber: 0, pageSize: expect.any(Number) });
    });
  });
});
```

Test cases:
- POST 201 / 400 / 401 / 403 / 409
- GET 200 (list with pagination) / 200 (single) / 404
- PATCH 200 / 404
- DELETE 204 / GET 404 after deletion

## Rules

- `afterEach(() => jest.clearAllMocks())` in EVERY describe block
- Use string IDs (`'clx1234567890'`) in mock data
- Use `entityStatus: 'ACTIVE'` / `'DELETED'` (never `deletedAt`)
- Use `created` / `modified` timestamps (never `createdAt` / `updatedAt`)
- Mock at boundaries: repo mocks Prisma, service mocks repo, controller mocks service
- Test both success and failure paths for every method
- Use descriptive test names: `'should throw NotFoundException when not found'`

## DO NOT

- Do NOT use snapshot tests — they're brittle and uninformative
- Do NOT mock across boundaries (e.g., mocking Prisma in a service test — mock the repository instead)
- Do NOT use `any` in mock types — use `jest.Mocked<ClassName>`
- Do NOT skip e2e tests — unit tests with mocks can pass while the real query fails (see: raw SQL column name bugs)
- Do NOT hardcode dates — use relative offsets or `new Date()` calculations
- Do NOT assume UTC = local time — always be explicit about timezone

## Validate

```bash
npm run test             # Unit tests pass
npm run test:cov         # Check coverage (target: 80%+)
npm run test:e2e         # E2E tests pass
```
