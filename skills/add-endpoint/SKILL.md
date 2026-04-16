---
name: add-endpoint
description: Add a new endpoint to an existing module — controller route, service method, repository query, DTOs, and tests
---

# Add Endpoint

Add a route to an existing module. Usage: `/add-endpoint <module> — <HTTP method> <path> <description>`

## Pre-Work

1. READ the existing module (controller, service, repository, DTOs)
2. READ existing tests for the module
3. READ `@knowledge/06-controller-security.md` for endpoint patterns
4. READ `@knowledge/02-swagger-openapi.md` for Swagger decorators

## Steps

### Step 1: Gather Requirements

Confirm with the user (if not specified):
- HTTP method (GET, POST, PATCH, DELETE)
- Path and parameters (e.g., `:id/reservations`)
- Auth requirements (public, authenticated, admin-only)
- Request body shape (if POST/PATCH)
- Response shape
- Business logic / validation rules

### Step 2: Add DTOs (if new shapes needed)

Add to existing `dto/` folder — do NOT create a new folder:

```typescript
// dto/create-reservation.dto.ts
export class CreateReservationDto {
  @ApiProperty({ description: 'Court ID', example: 'clx1234567890' })
  @IsString()
  @IsNotEmpty()
  courtId: string;

  @ApiProperty({ description: 'Start time', example: '2026-04-20T10:00:00.000Z' })
  @IsDateString()
  startTime: string;
}
```

### Step 3: Add Repository Method

Add method to existing repository file:

```typescript
async createReservation(data: Prisma.ReservationCreateInput): Promise<Reservation> {
  try {
    return await this.prisma.reservation.create({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('Time slot already booked');
    }
    throw error;
  }
}
```

- Include `entityStatus: 'ACTIVE'` filter in queries
- Add to `ALLOWED_SORT_FIELDS` if new list endpoint

### Step 4: Add Service Method

Add method to existing service file:

```typescript
async createReservation(courtId: string, dto: CreateReservationDto, userId: string) {
  const court = await this.repository.findOne(courtId);
  if (!court) throw new NotFoundException(`Court ${courtId} not found`);

  // Business validation here
  return this.repository.createReservation({ ...dto, courtId, userId });
}
```

### Step 5: Add Controller Route

```typescript
@Post(':id/reservations')
@Roles(Role.ADMIN)
@ApiOperation({ summary: 'Create reservation for court' })
@ApiResponse({ status: 201, type: ReservationResponseDto })
@ApiResponse({ status: 404, description: 'Court not found' })
@ApiResponse({ status: 409, description: 'Time slot conflict' })
async createReservation(
  @Param('id') courtId: string,
  @Body() dto: CreateReservationDto,
  @User('sub') userId: string,
): Promise<ReservationResponseDto> {
  return this.courtsService.createReservation(courtId, dto, userId);
}
```

### Step 6: Add Tests

Add to existing spec files:

```typescript
// service.spec.ts — add describe block
describe('createReservation', () => {
  it('should create reservation and return response', async () => {
    repository.createReservation.mockResolvedValue(mockReservation);
    const result = await service.createReservation('court-1', dto, 'user-1');
    expect(result).toEqual(expect.objectContaining({ courtId: 'court-1' }));
  });

  it('should throw NotFoundException when court not found', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(service.createReservation('x', dto, 'u')).rejects.toThrow(NotFoundException);
  });
});
```

```typescript
// e2e — add to existing describe
it('POST /api/courts/:id/reservations — 201', async () => {
  const res = await request(app.getHttpServer())
    .post(`/api/courts/${courtId}/reservations`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(validDto)
    .expect(201);
  expect(res.body).toHaveProperty('id');
});

it('POST /api/courts/:id/reservations — 404 court not found', async () => {
  await request(app.getHttpServer())
    .post('/api/courts/nonexistent/reservations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(validDto)
    .expect(404);
});
```

### Step 7: Validate

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

All must pass. The pre-commit hook will enforce this.

## DO NOT

- Do NOT add a new module — use `/scaffold` for that
- Do NOT skip Swagger decorators (`@ApiOperation`, `@ApiResponse`) on the new route
- Do NOT use `@Req()` or `@Res()` — use typed decorators (`@Param`, `@Body`, `@User`)
- Do NOT trust client-sent user IDs — always derive from JWT via `@User('sub')`
- Do NOT add a catch-all error handler in the controller — let exceptions propagate to the global filter
- Do NOT create new files for service/controller/repository — add methods to existing ones
- Do NOT bundle unrelated changes — one endpoint per invocation
