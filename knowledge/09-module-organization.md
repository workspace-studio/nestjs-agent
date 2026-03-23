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
// src/modules/work-order/work-order.module.ts
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
// src/modules/app.module.ts
import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { LocationModule } from './location/location.module';
import { UserModule } from './user/user.module';
import { WorkOrderModule } from './work-order/work-order.module';

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
  main.ts
  modules/
    app.module.ts
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

## Scheduled Tasks Module Pattern

For cron jobs and scheduled tasks, use `@nestjs/schedule`:

```typescript
// src/modules/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
```

```typescript
// src/modules/tasks/tasks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly configService: ConfigService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens() {
    if (this.configService.get('NODE_ENV') === 'test') return;

    this.logger.log('Running expired token cleanup...');
    // cleanup logic
  }
}
```

```typescript
// src/modules/tasks/tasks.controller.ts — manual triggers (admin only)
import { Controller, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { Role } from 'src/modules/auth/enums/role.enum';

@ApiExcludeController()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('cleanup-tokens')
  @Roles(Role.ADMIN)
  async triggerTokenCleanup() {
    await this.tasksService.cleanupExpiredTokens();
    return { message: 'Token cleanup completed' };
  }
}
```
