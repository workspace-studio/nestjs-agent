# Custom Decorators

## Why Custom Decorators

NestJS decorators reduce boilerplate and enforce consistent patterns. Every project should have at least `@User()`, `@Public()`, and `@Roles()`. Understanding `createParamDecorator` lets you build more.

## Parameter Decorators (createParamDecorator)

### @User — Extract JWT Payload

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    return data ? user?.[data] : user;
  },
);
```

Usage:
```typescript
@Get('profile')
getProfile(@User() user: JwtPayload) { ... }

@Post()
create(@User('sub') userId: string, @Body() dto: CreateDto) { ... }
```

### @Cookies — Extract Cookie Value

```typescript
export const Cookies = createParamDecorator(
  (key: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return key ? request.cookies?.[key] : request.cookies;
  },
);

// Usage: @Cookies('refreshToken') token: string
```

### @ClientIp — Extract Real IP

```typescript
export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.ip;
  },
);

// Usage: @ClientIp() ip: string
```

### @ApiPaginationQuery — Pagination Swagger Docs

```typescript
import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export const ApiPaginationQuery = () =>
  applyDecorators(
    ApiQuery({ name: 'pageNumber', required: false, type: Number, example: 0 }),
    ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 }),
    ApiQuery({ name: 'sortBy', required: false, type: String }),
    ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
  );

// Usage: @ApiPaginationQuery() on list endpoints
```

## Metadata Decorators (SetMetadata)

### @Public — Skip Auth

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### @Roles — Role-Based Access

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

## Decorator Composition (applyDecorators)

Combine multiple decorators into one:

```typescript
import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';

export const AdminOnly = () =>
  applyDecorators(
    Roles(Role.ADMIN),
    ApiBearerAuth('bearerAuth'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Forbidden — admin only' }),
  );

// Usage: @AdminOnly() instead of 4 separate decorators
```

### @ApiCrudResponses — Common CRUD Response Docs

```typescript
export const ApiCreateResponses = (entityName: string) =>
  applyDecorators(
    ApiResponse({ status: 201, description: `${entityName} created` }),
    ApiResponse({ status: 400, description: 'Validation error' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 409, description: `${entityName} already exists` }),
  );

export const ApiGetResponses = (entityName: string) =>
  applyDecorators(
    ApiResponse({ status: 200, description: `${entityName} found` }),
    ApiResponse({ status: 404, description: `${entityName} not found` }),
  );
```

## Folder Structure

```
src/modules/auth/decorators/
├── public.decorator.ts
├── roles.decorator.ts
└── user.decorator.ts

src/modules/common/decorators/
├── cookies.decorator.ts
├── client-ip.decorator.ts
├── api-pagination-query.decorator.ts
└── api-crud-responses.decorator.ts
```

## DO NOT

- Do NOT use `@Req()` to access user data — create a `@User()` decorator
- Do NOT repeat 4+ decorators on every endpoint — compose them with `applyDecorators`
- Do NOT use `SetMetadata` directly in controllers — wrap in named decorators
- Do NOT create decorators that do too much — keep them single-purpose
- Do NOT put business logic in decorators — they should only extract/set metadata
