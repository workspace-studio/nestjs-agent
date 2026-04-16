# Serialization (class-transformer)

## When to Use

- Automatically exclude sensitive fields (password, twoFactorSecret) from responses
- Add computed fields (@Expose) without storing them in the database
- Transform nested relations into flat response shapes
- Ensure API responses never accidentally leak internal data

## Installation

`class-transformer` is already installed as a dependency of `class-validator`.

## Global Setup

Register `ClassSerializerInterceptor` globally in `AppModule`:

```typescript
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
```

## Response Entity Pattern

Instead of plain objects, return class instances with decorators:

```typescript
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;

  @Exclude()
  password: string;

  @Exclude()
  twoFactorSecret: string | null;

  @Expose()
  @ApiProperty({ description: 'Whether 2FA is configured' })
  get has2FA(): boolean {
    return this.twoFactorSecret !== null;
  }

  @ApiProperty()
  created: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
```

### In the Service

Return a class instance, NOT a plain object:

```typescript
async findOne(id: string): Promise<UserResponseDto> {
  const user = await this.usersRepository.findOne(id);
  if (!user) throw new NotFoundException(`User ${id} not found`);
  return new UserResponseDto(user); // MUST be class instance
}
```

## Key Decorators

### @Exclude — Remove fields from response

```typescript
@Exclude()
password: string;

@Exclude()
entityStatus: string; // Hide soft-delete internals
```

### @Expose — Add computed fields

```typescript
@Expose()
get fullName(): string {
  return `${this.firstName} ${this.lastName}`;
}

@Expose({ name: 'isActive' })
get active(): boolean {
  return this.entityStatus === 'ACTIVE';
}
```

### @Transform — Custom transformation

```typescript
// Flatten a relation: { court: { id, name } } → courtName: "Court 1"
@Transform(({ obj }) => obj.court?.name)
@ApiProperty()
courtName: string;

// Format dates
@Transform(({ value }) => value?.toISOString())
@ApiProperty()
created: string;
```

### @Type — Nested object typing

For nested arrays/objects to be properly transformed:

```typescript
@Type(() => ReservationResponseDto)
@ApiProperty({ type: [ReservationResponseDto] })
reservations: ReservationResponseDto[];
```

## Exclude Strategy (Alternative)

Instead of @Exclude on each field, expose only what you want:

```typescript
@SerializeOptions({ strategy: 'excludeAll' })
@Get(':id')
findOne(@Param('id') id: string) {
  return this.usersService.findOne(id);
}
```

Then only `@Expose()` fields appear in the response.

## Groups — Context-Dependent Serialization

Show different fields for different use cases:

```typescript
export class UserResponseDto {
  @Expose({ groups: ['admin', 'user'] })
  id: string;

  @Expose({ groups: ['admin', 'user'] })
  email: string;

  @Expose({ groups: ['admin'] }) // Admin-only field
  role: string;

  @Expose({ groups: ['admin'] })
  entityStatus: string;
}
```

```typescript
@SerializeOptions({ groups: ['admin'] })
@Get('admin/users')
@Roles(Role.ADMIN)
findAllAdmin() {
  return this.usersService.findAll();
}

@SerializeOptions({ groups: ['user'] })
@Get('users')
findAllUser() {
  return this.usersService.findAll(); // role and entityStatus excluded
}
```

## Integration with Existing ResponseDto Pattern

The agent's current pattern (manual ResponseDtos with @ApiProperty) works well. Add serialization ON TOP of it for defense-in-depth:

1. Keep ResponseDtos with `@ApiProperty` for Swagger docs
2. Add `@Exclude()` on sensitive fields as backup
3. Add `constructor(partial)` for easy instantiation
4. Return `new ResponseDto(prismaResult)` from service methods

## DO NOT

- Do NOT return plain Prisma objects directly — always wrap in a DTO class instance
- Do NOT rely solely on `select` in Prisma queries to hide fields — @Exclude is defense-in-depth
- Do NOT use `@Expose()` with `excludeAll` strategy unless you're certain about the field list
- Do NOT forget to add `constructor(partial: Partial<T>) { Object.assign(this, partial); }` — without it, decorators won't work on plain objects
- Do NOT use `@Transform` for complex business logic — keep it for simple formatting only
