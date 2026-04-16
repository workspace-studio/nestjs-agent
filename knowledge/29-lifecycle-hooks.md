# Lifecycle Hooks

## Hook Order

```
1. onModuleInit()              — Module dependencies resolved
2. onApplicationBootstrap()    — All modules initialized, before listening
   ↓ App is now running ↓
3. onModuleDestroy()           — Termination signal received (SIGTERM)
4. beforeApplicationShutdown() — After onModuleDestroy, before connections close
5. onApplicationShutdown()     — After connections closed (app.close() resolves)
```

## Enabling Shutdown Hooks

Shutdown hooks are **disabled by default**. Enable them in main.ts:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // Required for onModuleDestroy, beforeApplicationShutdown, onApplicationShutdown
  await app.listen(3000);
}
```

## Common Patterns

### onModuleInit — Initialize Resources

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class CacheWarmupService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmupService.name);

  async onModuleInit() {
    this.logger.log('Warming up cache...');
    await this.loadFrequentlyAccessedData();
    this.logger.log('Cache warm-up complete');
  }

  private async loadFrequentlyAccessedData() {
    // Pre-load courts, settings, etc.
  }
}
```

### onApplicationBootstrap — Ready Check

```typescript
@Injectable()
export class HealthService implements OnApplicationBootstrap {
  private isReady = false;

  onApplicationBootstrap() {
    this.isReady = true;
    // App is fully initialized and about to accept connections
  }

  getHealth() {
    return { status: this.isReady ? 'ok' : 'starting' };
  }
}
```

### onModuleDestroy — Cleanup on Shutdown

```typescript
@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
```

### beforeApplicationShutdown — Graceful Drain

```typescript
@Injectable()
export class GracefulShutdownService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);

  async beforeApplicationShutdown(signal?: string) {
    this.logger.warn(`Shutdown signal received: ${signal}`);

    // Stop accepting new work
    // Wait for in-flight requests to complete
    // Drain job queues
    this.logger.log('Graceful shutdown complete');
  }
}
```

### onApplicationShutdown — Final Cleanup

```typescript
@Injectable()
export class MetricsService implements OnApplicationShutdown {
  onApplicationShutdown(signal?: string) {
    // Flush metrics buffer
    // Close monitoring connections
    console.log(`Application shut down with signal: ${signal}`);
  }
}
```

## Async Hooks

Both `onModuleInit` and `onApplicationBootstrap` support async:

```typescript
async onModuleInit(): Promise<void> {
  await this.seedDatabase();
  await this.connectToRedis();
}
```

NestJS waits for the Promise to resolve before proceeding.

## Prisma Graceful Shutdown Pattern

```typescript
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;
  private prisma: PrismaClient;

  async onModuleInit() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Database pool closed');
  }
}
```

## DO NOT

- Do NOT forget `app.enableShutdownHooks()` — without it, destroy/shutdown hooks never fire
- Do NOT perform long-running initialization in `onModuleInit` without logging progress
- Do NOT throw errors in shutdown hooks — they can prevent clean shutdown
- Do NOT assume hook execution order across modules — use `onApplicationBootstrap` for cross-module initialization
- Do NOT use lifecycle hooks in request-scoped providers — they don't trigger
