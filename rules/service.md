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

## Service Splitting
Split into `QueryingService` + `MutationService` when exceeding ~8 public methods
