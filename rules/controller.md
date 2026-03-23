---
paths:
  - "src/**/*.controller.ts"
---

# Controller Rules

## Structure
- Every controller MUST have `@ApiTags()` and `@ApiBearerAuth('bearerAuth')` at class level
- Use `@Controller('kebab-case-plural')` for route prefix
- Inject only the service — NEVER inject repository or PrismaService directly
- Controllers contain ZERO business logic — delegate everything to the service

## Swagger Decorators (required on every method)
- `@ApiOperation({ summary: '...' })` — short description
- `@ApiCreatedResponse` / `@ApiOkResponse` / `@ApiNoContentResponse` — success case with `type:`
- `@ApiNotFoundResponse`, `@ApiConflictResponse`, `@ApiUnauthorizedResponse` — error cases
- `@ApiParam({ name: 'id', description: '...' })` on routes with `:id`

## Security
- Use `@Roles(Role.ADMIN, Role.MANAGER)` for write operations (POST, PATCH, DELETE)
- Use `@Roles(Role.ADMIN)` for destructive operations (DELETE)
- Read operations (GET) are available to all authenticated users unless restricted
- Use `@Public()` decorator ONLY for unauthenticated endpoints (health, login, register)
- Extract user from JWT with `@User() user: JwtPayload` — NEVER trust client-sent user IDs

## HTTP Methods & Status Codes
- `@Post()` → 201 (default)
- `@Get()` → 200 (default)
- `@Patch()` → 200 (default) — use PATCH not PUT
- `@Delete()` → `@HttpCode(HttpStatus.NO_CONTENT)` → 204

## Parameters
- `@Body() dto: CreateXxxDto` — validated by global ValidationPipe
- `@Param('id') id: string` — path parameters
- `@Query() query: QueryXxxDto` — pagination and filters

## Import Order
1. `@nestjs/common` imports
2. `@nestjs/swagger` imports
3. Auth module imports (decorators, enums, interfaces) via `src/` alias
4. Local DTO imports
5. Local service import
