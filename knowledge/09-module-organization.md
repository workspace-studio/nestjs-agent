# Module Organization

## Module Anatomy

```typescript
@Module({
  imports: [],       // Other modules this module depends on
  controllers: [],   // Controllers that handle routes
  providers: [],     // Services, repositories, guards, etc.
  exports: [],       // Providers available to other modules that import this one
})
export class WorkOrderModule {}
```

## Standard Domain Module

```typescript
// src/domains/work-order/work-order.module.ts
import { Module } from '@nestjs/common';

import { WorkOrderController } from './work-order.controller';
import { WorkOrderRepository } from './work-order.repository';
import { WorkOrderService } from './work-order.service';

@Module({
  controllers: [WorkOrderController],
  providers: [WorkOrderService, WorkOrderRepository],
  exports: [WorkOrderService],
})
export class WorkOrderModule {}
```

## @Global Modules

Use sparingly. Only for truly cross-cutting concerns:

```typescript
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Good candidates for `@Global`: `PrismaModule`, `ConfigModule`. Everything else should use explicit imports.

## Circular Dependencies

When two modules depend on each other, use `forwardRef()`:

```typescript
// work-order.module.ts
@Module({
  imports: [forwardRef(() => UserModule)],
  providers: [WorkOrderService, WorkOrderRepository],
  exports: [WorkOrderService],
})
export class WorkOrderModule {}

// user.module.ts
@Module({
  imports: [forwardRef(() => WorkOrderModule)],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
```

Also use `@Inject(forwardRef(() => ...))` in services:

```typescript
constructor(
  @Inject(forwardRef(() => UserService))
  private readonly userService: UserService,
) {}
```

**Prefer refactoring to avoid circular deps.** Extract shared logic into a third module.

## Dynamic Modules

### forRoot / forRootAsync Pattern

```typescript
// src/common/email/email.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EmailService } from './email.service';

export interface EmailModuleOptions {
  host: string;
  port: number;
  auth?: { user: string; pass: string };
}

@Module({})
export class EmailModule {
  static forRoot(options: EmailModuleOptions): DynamicModule {
    return {
      module: EmailModule,
      providers: [
        { provide: 'EMAIL_OPTIONS', useValue: options },
        EmailService,
      ],
      exports: [EmailService],
      global: true,
    };
  }

  static forRootAsync(): DynamicModule {
    return {
      module: EmailModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'EMAIL_OPTIONS',
          useFactory: (config: ConfigService): EmailModuleOptions => ({
            host: config.getOrThrow('SMTP_HOST'),
            port: config.get('SMTP_PORT', 587),
            auth: {
              user: config.getOrThrow('SMTP_USER'),
              pass: config.getOrThrow('SMTP_PASS'),
            },
          }),
          inject: [ConfigService],
        },
        EmailService,
      ],
      exports: [EmailService],
      global: true,
    };
  }
}
```

## Module Dependency Rules

1. **Domain modules** import other domain modules only when needed (e.g., WorkOrderModule imports UserModule to validate assignees).
2. **Common modules** (prisma, config, email) never import domain modules.
3. **Auth module** is imported at the app level; guards are registered globally via `APP_GUARD`.
4. **No circular imports** -- refactor into a shared module if needed.

## When to Create a New Module

Create a new module when:
- A new business domain is introduced (e.g., "Locations", "Equipment")
- A reusable infrastructure concern emerges (e.g., "Email", "FileStorage")
- An external integration is needed (e.g., "StripeModule", "WeatherModule")

Do NOT create a new module for:
- A single utility function (put in `src/common/utils/`)
- A decorator or pipe (put in `src/common/` or `src/auth/`)

## Shared Module Pattern

```typescript
// src/common/common.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  exports: [PrismaModule],
})
export class CommonModule {}
```

## App Module (Root)

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { LocationModule } from './domains/location/location.module';
import { UserModule } from './domains/user/user.module';
import { WorkOrderModule } from './domains/work-order/work-order.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    UserModule,
    WorkOrderModule,
    LocationModule,
  ],
})
export class AppModule {}
```

## Folder Structure

```
src/
  app.module.ts
  main.ts
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    decorators/
    guards/
    strategies/
    interfaces/
    enums/
    dto/
  common/
    common.module.ts
    prisma/
    filters/
    interceptors/
    middleware/
    utils/
  domains/
    user/
      user.module.ts
      user.controller.ts
      user.service.ts
      user.repository.ts
      dto/
      enums/
    work-order/
      ...same structure
```
