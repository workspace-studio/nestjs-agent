---
name: test-endpoint
description: Write E2E tests for a single API endpoint — all HTTP methods, auth, validation, edge cases
---

# Test Endpoint

Write focused E2E tests for one endpoint. Usage: `/test-endpoint <METHOD> <path>`

## Pre-Work

1. READ the controller to understand the endpoint (route, auth, params, body)
2. READ the service to understand business rules and error cases
3. READ existing e2e tests for the module (match patterns and setup)
4. READ `@knowledge/18-testing-patterns.md` for e2e patterns
5. READ `@examples/tests/e2e/` for working reference

## Steps

### Step 1: Identify All Scenarios

Map every possible response:

| Method | Status | Scenario |
|--------|--------|----------|
| POST | 201 | Valid body, correct auth |
| POST | 400 | Missing required fields, invalid types, business rule violation |
| POST | 401 | No JWT token |
| POST | 403 | Wrong role (if admin-only) |
| POST | 409 | Duplicate (if uniqueness constraint) |
| GET list | 200 | Returns `{ entities, totalCount, pagination }` shape |
| GET list | 200 | Query params filter correctly |
| GET single | 200 | Found by ID |
| GET single | 404 | Not found or soft-deleted |
| PATCH | 200 | Partial update success |
| PATCH | 400 | Invalid input |
| PATCH | 404 | Not found |
| DELETE | 204 | Soft delete success |
| DELETE | 404 | Not found |

### Step 2: Set Up Test Data

Create test data via API calls (POST), NOT direct DB insertion:

```typescript
let createdId: string;

beforeAll(async () => {
  const res = await request(app.getHttpServer())
    .post('/api/courts')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Test Court', address: '123 Main St' });
  createdId = res.body.id;
});
```

### Step 3: Write Tests

```typescript
describe('POST /api/courts', () => {
  it('should create court — 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Court', address: '456 Oak Ave' })
      .expect(201);

    expect(res.body).toMatchObject({
      id: expect.any(String),
      name: 'New Court',
      address: '456 Oak Ave',
      entityStatus: 'ACTIVE',
    });
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ address: '456 Oak Ave' })
      .expect(400);

    expect(res.body.message).toContain('name');
  });

  it('should return 401 when no auth token', async () => {
    await request(app.getHttpServer())
      .post('/api/courts')
      .send({ name: 'Test', address: 'Test' })
      .expect(401);
  });

  it('should return 409 when name already exists', async () => {
    await request(app.getHttpServer())
      .post('/api/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Court', address: 'Duplicate' }) // name from beforeAll
      .expect(409);
  });
});

describe('GET /api/courts', () => {
  it('should return paginated list — 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toEqual({
      entities: expect.any(Array),
      totalCount: expect.any(Number),
      pagination: { pageNumber: 0, pageSize: expect.any(Number) },
    });
  });
});

describe('DELETE /api/courts/:id', () => {
  it('should soft delete — 204', async () => {
    await request(app.getHttpServer())
      .delete(`/api/courts/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('should return 404 after soft delete', async () => {
    await request(app.getHttpServer())
      .get(`/api/courts/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
```

### Step 4: Clean Up

Use `afterAll` to delete test data created during the test run.

### Step 5: Run

```bash
npm run test:e2e -- --testPathPattern=<module>
```

All tests must pass. Fix failures before finishing.

## DO NOT

- Do NOT mock anything in e2e tests — use real HTTP requests via supertest against a real database
- Do NOT use `any` in test types — type your request bodies and responses
- Do NOT hardcode dates — use relative offsets (`new Date(Date.now() + 86400000)`)
- Do NOT assume UTC = local time — if the app uses Europe/Zagreb, test with that timezone explicitly
- Do NOT skip auth tests — always test 401 (no token) and 403 (wrong role)
- Do NOT create test data via direct DB insertion — use the API so you test the full stack
- Do NOT leave test data behind — clean up in `afterAll`
