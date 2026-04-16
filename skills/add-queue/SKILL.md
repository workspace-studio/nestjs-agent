---
name: add-queue
description: Add a BullMQ job queue — producer service, consumer processor, Redis config, and tests
---

# Add Queue

Add async job processing to a module. Usage: `/add-queue <queue-name> — <description>`

## Pre-Work

1. READ `@knowledge/21-queues.md` for BullMQ patterns
2. READ existing queue modules if any (match patterns)
3. CHECK docker-compose.yml for Redis — add if missing

## Steps

### Step 1: Install Dependencies (if first queue)

```bash
npm install @nestjs/bullmq bullmq
```

### Step 2: Add Redis to Docker Compose (if missing)

```yaml
redis:
  image: redis:7-alpine
  ports:
    - '6379:6379'
  volumes:
    - redis_data:/data
```

### Step 3: Configure BullModule in AppModule (if first queue)

```typescript
BullModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get('REDIS_PORT', 6379),
    },
  }),
  inject: [ConfigService],
}),
```

### Step 4: Register Queue in Module

```typescript
BullModule.registerQueue({ name: '<queue-name>' }),
```

### Step 5: Create Producer Service

Inject `@InjectQueue('<queue-name>')` and add methods that queue jobs.

### Step 6: Create Consumer Processor

Extend `WorkerHost`, implement `process()`, add `@OnWorkerEvent` handlers.

### Step 7: Add Tests

- Unit test: mock Queue, verify `add()` called with correct args
- E2E test: verify the endpoint that triggers the queue returns 202/201

### Step 8: Validate

```bash
npm run build && npm run lint && npm run test && npm run test:e2e
```

## DO NOT

- Do NOT process heavy work in the HTTP request — queue it and return immediately
- Do NOT store large payloads in job data — store IDs and fetch in the processor
- Do NOT skip retry/backoff configuration
- Do NOT forget to register the processor as a provider
