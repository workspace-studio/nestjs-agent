# Health Checks (Terminus)

## Why Every Project Needs This

Kubernetes, Docker Swarm, and load balancers use health endpoints to determine if your app is alive and ready. Without health checks, broken instances keep receiving traffic.

## Installation

```bash
npm install @nestjs/terminus
npm install @nestjs/axios axios  # for HTTP health checks
```

## Module Setup

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
})
export class HealthModule {}
```

## Health Controller

```typescript
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from 'src/modules/auth/decorators/public.decorator';
import { PrismaHealthIndicator } from './prisma-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prisma: PrismaHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database connectivity
      () => this.prisma.isHealthy('database'),

      // Memory usage (fail if heap > 200MB)
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),

      // Disk usage (fail if > 90% used)
      () => this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }

  @Get('liveness')
  @Public()
  @HealthCheck()
  liveness() {
    // Lightweight — just confirms the process is alive
    return this.health.check([]);
  }

  @Get('readiness')
  @Public()
  @HealthCheck()
  readiness() {
    // Full check — confirms the app can serve requests
    return this.health.check([
      () => this.prisma.isHealthy('database'),
    ]);
  }
}
```

## Custom Prisma Health Indicator

Since Terminus has TypeOrmHealthIndicator but not Prisma, build a custom one:

```typescript
import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from 'src/modules/common/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: error.message });
    }
  }
}
```

## Custom Redis Health Indicator

```typescript
@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const result = await this.redis.ping();
      if (result === 'PONG') return indicator.up();
      return indicator.down({ message: 'Redis ping failed' });
    } catch (error) {
      return indicator.down({ message: error.message });
    }
  }
}
```

## Response Format

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "disk": { "status": "up" }
  },
  "error": {},
  "details": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "disk": { "status": "up" }
  }
}
```

When something fails:
```json
{
  "status": "error",
  "info": { "memory_heap": { "status": "up" } },
  "error": { "database": { "status": "down", "message": "Connection refused" } },
  "details": { ... }
}
```

## Kubernetes Probes

```yaml
# deployment.yaml
livenessProbe:
  httpGet:
    path: /api/health/liveness
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /api/health/readiness
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Folder Structure

```
src/modules/health/
├── health.module.ts
├── health.controller.ts
├── prisma-health.indicator.ts
└── redis-health.indicator.ts     # if using Redis
```

## DO NOT

- Do NOT put health endpoints behind auth — they must be `@Public()`
- Do NOT include heavy checks in the liveness probe — keep it lightweight
- Do NOT skip database health check in readiness — it's the most common failure
- Do NOT return sensitive data in health responses — status only, no connection strings
- Do NOT forget to add HealthModule to AppModule imports
