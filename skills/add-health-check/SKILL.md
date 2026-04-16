---
name: add-health-check
description: Add Terminus health check endpoints — database, memory, disk, and custom indicators
---

# Add Health Check

Add production health monitoring. Usage: `/add-health-check`

## Pre-Work

1. READ `@knowledge/31-health-checks.md` for Terminus patterns
2. CHECK if HealthModule already exists

## Steps

### Step 1: Install Dependencies

```bash
npm install @nestjs/terminus @nestjs/axios axios
```

### Step 2: Create Health Module

```
src/modules/health/
├── health.module.ts
├── health.controller.ts
└── prisma-health.indicator.ts
```

### Step 3: Create Prisma Health Indicator

Custom indicator that runs `SELECT 1` to verify DB connectivity.

### Step 4: Create Health Controller

Three endpoints:
- `GET /api/health` — full check (DB + memory + disk)
- `GET /api/health/liveness` — lightweight (process alive)
- `GET /api/health/readiness` — DB connectivity

All endpoints must be `@Public()`.

### Step 5: Register in AppModule

Add HealthModule to AppModule imports.

### Step 6: Validate

```bash
npm run build && npm run lint && npm run test
curl http://localhost:3000/api/health
```

Expected response: `{ "status": "ok", "info": { "database": { "status": "up" } } }`

## DO NOT

- Do NOT put health endpoints behind auth
- Do NOT include heavy checks in liveness probe
- Do NOT return connection strings or sensitive data in health responses
