---
paths:
  - "src/**/*.service.ts"
---

# Service Rules

## Structure
- Inject repository — NEVER inject PrismaService directly
- Add `private readonly logger = new Logger(ServiceName.name)` to every service
- Services contain ALL business logic and validation
- Return DTOs from public methods — use `toResponseDto()` private helper

## Business Validation Pattern
- Check for duplicates BEFORE create/update → `ConflictException` (409)
- Verify entity exists BEFORE update/delete → `NotFoundException` (404)
- Validate business state → `BadRequestException` (400)
- Authorization checks → `ForbiddenException` (403)

## Exception Mapping
- Duplicate resource → `throw new ConflictException('X with Y "value" already exists')`
- Resource not found → `throw new NotFoundException('X with ID "id" not found')`
- Invalid business state → `throw new BadRequestException('Cannot X when Y')`
- Invalid input → `throw new BadRequestException('Specific message')`

## Pagination Format (Serwizz)
Always return paginated results in this format:
```typescript
return { entities: dtos, totalCount, pagination: { pageNumber, pageSize } };
```
- `pageNumber` is 0-based
- Default `pageSize` is 20

## Soft Delete
- Always call `repository.softDelete(id)` — NEVER hard delete
- `softDelete` sets `entityStatus: 'DELETED'`

## Logging
- Log create/update/delete operations: `this.logger.log('X created: ${id}')`
- Log warnings for denied operations: `this.logger.warn('Attempt to modify completed X: ${id}')`
- Log errors with stack: `this.logger.error('Failed to create X', error.stack)`

## Audit Logging

When the project has an `AuditService`, follow these rules:

### Bulk operations need per-record audit
`updateMany` / `deleteMany` that affect independent records must audit EACH record individually. Fetch affected records before the mutation, then audit via `Promise.all`:

```typescript
// WRONG — only logs one entry for a bulk operation
await this.repository.softDeleteRelated(courtId, dateFrom, dateTo);
await this.auditService.logDelete('court_closures', closure);

// CORRECT — log each affected record
const affected = await this.repository.findRelated(courtId, dateFrom, dateTo);
await this.repository.softDeleteRelated(courtId, dateFrom, dateTo);
await Promise.all(affected.map(c => this.auditService.logDelete('court_closures', c)));
```

### Cascading deletes must audit downstream entities
When hard-deleting a parent (e.g., user), all cascaded child records (reservations, tokens) must be audit-logged independently. The parent's audit entry alone is not sufficient — someone querying audit by reservation ID would find nothing.

```typescript
// Fetch children BEFORE parent delete
const reservations = await this.reservationsRepository.findByUserId(userId);
await Promise.all(reservations.map(r => this.auditService.logDelete('reservations', r)));
await this.auditService.logDelete('users', user);
await this.usersRepository.hardDelete(userId);
```

### Audit-first ordering for destructive operations
Write audit entry BEFORE the destructive operation (hard delete, cascade). If audit is fire-and-forget (errors swallowed), a phantom entry from a failed delete is recoverable — a missing entry from a successful delete is not.

### Parallelize independent audit writes
Never use sequential `for...of` with `await` for audit logging batch operations. Use `Promise.all`:

```typescript
// WRONG — sequential, O(n) round trips
for (const item of created) {
  await this.auditService.logCreate('court_closures', item);
}

// CORRECT — parallel
await Promise.all(created.map(item => this.auditService.logCreate('court_closures', item)));
```

## Service Splitting
Split into `QueryingService` + `MutationService` when exceeding ~8 public methods
