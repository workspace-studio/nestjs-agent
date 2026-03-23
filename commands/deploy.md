---
name: deploy
description: Run pre-flight checks and deploy to production
disable-model-invocation: true
---

Deploy NestJS application to production:

## Pre-flight checks

1. `git status` — no uncommitted changes
2. `npm run lint` — zero warnings
3. `npm run build` — clean production build
4. `npm run test` — all unit tests green
5. `npm run test:e2e` — all e2e tests passing

## Deploy

6. `npx prisma migrate deploy` — apply pending migrations
7. `git push origin main`
8. Wait for CI/CD pipeline to complete

## Post-deploy verification

9. Hit health endpoint: `GET /api/health` — expect 200
10. Check logs for startup errors
11. Verify Swagger docs load at `/api/docs`

## If anything fails

- Do NOT force push or skip checks
- Fix the issue, re-run all checks
- Only the project lead can approve rollbacks
