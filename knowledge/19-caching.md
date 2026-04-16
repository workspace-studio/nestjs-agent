# Caching

## When to Use

- Expensive database queries that don't change often (e.g., user profiles, settings, lookup tables)
- External API responses with known staleness tolerance
- Computed aggregations (dashboards, reports)

## Installation

```bash
npm install @nestjs/cache-manager cache-manager
# For Redis (production):
npm install @keyv/redis
```

## Module Setup

### In-Memory (Development)

```typescript
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 30000, // 30 seconds default
    }),
  ],
})
export class AppModule {}
```

### Redis (Production)

```typescript
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        ttl: config.get('CACHE_TTL', 30000),
        stores: [new KeyvRedis(config.get('REDIS_URL'))],
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Using Cache in Services

Inject via `CACHE_MANAGER` token:

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CourtsService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private readonly courtsRepository: CourtsRepository,
  ) {}

  async findOne(id: string): Promise<CourtResponseDto> {
    const cacheKey = `court:${id}`;
    const cached = await this.cache.get<CourtResponseDto>(cacheKey);
    if (cached) return cached;

    const court = await this.courtsRepository.findOne(id);
    if (!court) throw new NotFoundException(`Court ${id} not found`);

    await this.cache.set(cacheKey, court, 60000); // 60s TTL
    return court;
  }

  async update(id: string, dto: UpdateCourtDto): Promise<CourtResponseDto> {
    const result = await this.courtsRepository.update(id, dto);
    await this.cache.del(`court:${id}`); // Invalidate on write
    return result;
  }
}
```

## Auto-Caching with Interceptor

For GET endpoints that return static data:

```typescript
import { CacheInterceptor, CacheTTL, CacheKey } from '@nestjs/cache-manager';

@Controller('settings')
@UseInterceptors(CacheInterceptor)
export class SettingsController {
  @Get()
  @CacheTTL(300000) // 5 minutes
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(':key')
  @CacheKey('setting') // custom cache key
  @CacheTTL(60000)
  findOne(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }
}
```

**Limitations:** CacheInterceptor only works on GET endpoints. Write operations and routes using `@Res()` are not cached.

## Cache Invalidation Pattern

Always invalidate cache on writes to prevent stale data:

```typescript
// In service — after create/update/delete
await this.cache.del(`entity:${id}`);
await this.cache.del('entity:list'); // Invalidate list cache too
```

## DO NOT

- Do NOT cache user-specific data globally (e.g., `findAll` with user-filtered results)
- Do NOT set TTL to 0 in production (infinite cache = stale data forever)
- Do NOT cache responses that include sensitive data (passwords, tokens)
- Do NOT use in-memory cache in production with multiple instances (use Redis)
- Do NOT forget to invalidate cache on write operations
