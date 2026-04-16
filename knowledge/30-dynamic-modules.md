# Dynamic Modules & Custom Providers

## Why This Matters

Every time the agent writes `JwtModule.register()`, `BullModule.forRoot()`, or `CacheModule.registerAsync()`, it's using dynamic modules. Understanding the pattern prevents cargo-culting and enables building custom integrations.

## Provider Types

### useValue — Static value

```typescript
{
  provide: 'APP_NAME',
  useValue: 'My API',
}

// Inject:
constructor(@Inject('APP_NAME') private appName: string) {}
```

### useClass — Class instantiation

```typescript
{
  provide: ConfigService,
  useClass: process.env.NODE_ENV === 'test'
    ? MockConfigService
    : ConfigService,
}
```

### useFactory — Factory function (async supported)

```typescript
{
  provide: 'REDIS_CLIENT',
  useFactory: async (config: ConfigService) => {
    const client = new Redis(config.get('REDIS_URL'));
    await client.ping();
    return client;
  },
  inject: [ConfigService],
}

// Inject:
constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}
```

### useExisting — Alias to existing provider

```typescript
{
  provide: 'AliasedLogger',
  useExisting: Logger,
}
```

## Convention: register vs forRoot vs forFeature

| Method | When | Config scope |
|--------|------|-------------|
| `register()` | Each import gets its own config | Per-module |
| `forRoot()` | Configure once, share everywhere | Global singleton |
| `forRootAsync()` | Same as forRoot but with async factory | Global singleton |
| `forFeature()` | Per-module customization of a global config | Per-module subset |

### Example Flow

```typescript
// AppModule — configure once
@Module({
  imports: [
    TypeOrmModule.forRoot({ database: 'mydb' }),    // Global DB config
    BullModule.forRoot({ connection: { host: 'redis' } }), // Global Redis
  ],
})
export class AppModule {}

// EmailModule — use global config, register specific queue
@Module({
  imports: [
    BullModule.registerQueue({ name: 'email' }),    // Uses global Redis
  ],
})
export class EmailModule {}

// UsersModule — use global DB, register specific entities
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),               // Uses global DB
  ],
})
export class UsersModule {}
```

## Building a Dynamic Module

### Simple Dynamic Module

```typescript
import { DynamicModule, Module } from '@nestjs/common';

export interface SmsModuleOptions {
  apiKey: string;
  sender: string;
}

@Module({})
export class SmsModule {
  static forRoot(options: SmsModuleOptions): DynamicModule {
    return {
      module: SmsModule,
      global: true,
      providers: [
        {
          provide: 'SMS_OPTIONS',
          useValue: options,
        },
        SmsService,
      ],
      exports: [SmsService],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => SmsModuleOptions | Promise<SmsModuleOptions>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: SmsModule,
      global: true,
      imports: options.imports || [],
      providers: [
        {
          provide: 'SMS_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        SmsService,
      ],
      exports: [SmsService],
    };
  }
}
```

### The Service

```typescript
@Injectable()
export class SmsService {
  constructor(@Inject('SMS_OPTIONS') private options: SmsModuleOptions) {}

  async send(to: string, message: string) {
    // Use this.options.apiKey and this.options.sender
  }
}
```

### Usage

```typescript
// Sync
SmsModule.forRoot({
  apiKey: process.env.SMS_API_KEY,
  sender: '+385991234567',
})

// Async (with ConfigService)
SmsModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    apiKey: config.get('SMS_API_KEY'),
    sender: config.get('SMS_SENDER'),
  }),
  inject: [ConfigService],
})
```

## ConfigurableModuleBuilder (Less Boilerplate)

For complex modules, NestJS provides a builder that auto-generates register/registerAsync:

```typescript
// sms.module-definition.ts
import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface SmsModuleOptions {
  apiKey: string;
  sender: string;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<SmsModuleOptions>()
    .setClassMethodName('forRoot')  // generates forRoot + forRootAsync
    .setExtras({ isGlobal: true }, (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }))
    .build();
```

```typescript
// sms.module.ts
import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './sms.module-definition';

@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule extends ConfigurableModuleClass {}
```

```typescript
// sms.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN, SmsModuleOptions } from './sms.module-definition';

@Injectable()
export class SmsService {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) private options: SmsModuleOptions) {}
}
```

## Injection Tokens

Use symbols or strings for non-class providers:

```typescript
// Constants file
export const SMS_OPTIONS = Symbol('SMS_OPTIONS');
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

// Provider
{ provide: SMS_OPTIONS, useValue: options }

// Inject
constructor(@Inject(SMS_OPTIONS) private options: SmsModuleOptions) {}
```

Prefer `Symbol()` over string tokens — prevents naming collisions.

## DO NOT

- Do NOT use `forRoot()` for module-specific config — use `register()` instead
- Do NOT create global modules unless they're genuinely used everywhere (Prisma, Config = global; Email, SMS = not global)
- Do NOT hardcode config in `forRoot()` — always use `forRootAsync()` with ConfigService for env-based config
- Do NOT forget to `export` the service from the dynamic module — consumers can't inject unexported providers
- Do NOT use string injection tokens in large codebases — use `Symbol()` or the generated `MODULE_OPTIONS_TOKEN`
