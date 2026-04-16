---
name: add-cache
description: Add caching to a service or endpoint — cache-manager setup, Redis config, invalidation
---

# Add Cache

Add caching to improve performance. Usage: `/add-cache <module> — <what to cache>`

## Pre-Work

1. READ `@knowledge/19-caching.md` for caching patterns
2. READ the target service to identify cacheable operations
3. CHECK if CacheModule is already registered globally

## Steps

### Step 1: Install Dependencies (if first cache)

```bash
npm install @nestjs/cache-manager cache-manager
# For Redis (production):
npm install @keyv/redis
```

### Step 2: Register CacheModule in AppModule (if first cache)

```typescript
CacheModule.registerAsync({
  isGlobal: true,
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    ttl: config.get('CACHE_TTL', 30000),
  }),
  inject: [ConfigService],
}),
```

### Step 3: Inject Cache in Service

```typescript
@Inject(CACHE_MANAGER) private cache: Cache
```

### Step 4: Add Cache Logic

For reads:
```typescript
const cached = await this.cache.get<T>(key);
if (cached) return cached;
// ... fetch from DB
await this.cache.set(key, result, ttl);
```

For writes:
```typescript
await this.cache.del(key); // Invalidate after mutation
```

### Step 5: Add Tests

- Unit test: mock CACHE_MANAGER, verify get/set/del calls
- E2E test: verify endpoint returns cached data on second call

### Step 6: Validate

```bash
npm run build && npm run lint && npm run test && npm run test:e2e
```

## DO NOT

- Do NOT cache user-specific responses globally
- Do NOT forget to invalidate cache on write operations (create/update/delete)
- Do NOT set infinite TTL (0) in production
- Do NOT cache sensitive data (passwords, tokens, personal info)
- Do NOT use in-memory cache with multiple app instances — use Redis
