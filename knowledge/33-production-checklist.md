# Production Readiness Checklist

Reference this before every deployment. Each item links to the relevant knowledge file.

## Security

- [ ] Helmet enabled in main.ts → `@knowledge/27-security-hardening.md`
- [ ] CORS configured with explicit origins (not `*`) → `@knowledge/27-security-hardening.md`
- [ ] Rate limiting on auth endpoints → `@knowledge/23-rate-limiting.md`
- [ ] ValidationPipe: `whitelist: true`, `forbidNonWhitelisted: true` → `@knowledge/16-interceptors-middleware.md`
- [ ] JWT secrets from environment variables, not hardcoded → `@knowledge/06-controller-security.md`
- [ ] Password hashing with bcrypt (salt rounds ≥ 10) → `@knowledge/06-controller-security.md`
- [ ] No secrets in committed code (`.env` in `.gitignore`) → `@knowledge/27-security-hardening.md`
- [ ] httpOnly cookies for refresh tokens → `@knowledge/27-security-hardening.md`
- [ ] Raw body enabled for webhook endpoints → `@knowledge/27-security-hardening.md`
- [ ] File upload size limits configured → `@knowledge/12-media-and-s3.md`
- [ ] No stack traces in production error responses → `@knowledge/07-error-handling.md`
- [ ] `@Roles()` on all write endpoints → `@knowledge/06-controller-security.md`

## Database

- [ ] `@@index` on every FK field → `@knowledge/04-prisma-patterns.md`
- [ ] `@@index([entityStatus])` on every model → `@knowledge/04-prisma-patterns.md`
- [ ] Soft delete via `entityStatus` (never hard delete user data) → `@knowledge/04-prisma-patterns.md`
- [ ] Connection pool configured (adapter-pg Pool) → `@knowledge/04-prisma-patterns.md`
- [ ] Prisma disconnect on shutdown → `@knowledge/29-lifecycle-hooks.md`
- [ ] Migration files committed and reviewed → `@knowledge/03-prisma-migrations.md`
- [ ] Raw SQL uses quoted camelCase identifiers → `rules/repository.md`

## API

- [ ] All endpoints have Swagger decorators → `@knowledge/02-swagger-openapi.md`
- [ ] Swagger UI accessible at `/swagger-ui/index.html`
- [ ] Response DTOs with `@ApiProperty` (never raw Prisma entities) → `@knowledge/26-serialization.md`
- [ ] `@Exclude()` on password/secret fields as defense-in-depth → `@knowledge/26-serialization.md`
- [ ] Pagination: Serwizz format `{ entities, totalCount, pagination }` → `@knowledge/05-service-patterns.md`
- [ ] Error responses: `{ statusCode, message, error }` → `@knowledge/07-error-handling.md`

## Infrastructure

- [ ] Health check endpoint at `GET /api/health` → `@knowledge/31-health-checks.md`
- [ ] Database health indicator in readiness probe → `@knowledge/31-health-checks.md`
- [ ] Docker Compose for dev (PostgreSQL, Redis, Mailpit) → `@knowledge/14-docker-cicd-config.md`
- [ ] Multi-stage Dockerfile (Alpine, non-root user) → `@knowledge/14-docker-cicd-config.md`
- [ ] Environment validation (Joi or class-validator) → `@knowledge/17-project-bootstrap.md`
- [ ] Compression enabled (or offloaded to nginx) → main.ts

## Logging & Monitoring

- [ ] JSON logging in production → `@knowledge/28-logging-production.md`
- [ ] Logger in every service → `@knowledge/05-service-patterns.md`
- [ ] Request correlation IDs → `@knowledge/28-logging-production.md`
- [ ] No `console.log` — use NestJS Logger → `@knowledge/28-logging-production.md`
- [ ] No logging of passwords/tokens/PII → `@knowledge/28-logging-production.md`

## Testing

- [ ] Unit tests for every service, controller, repository → `@knowledge/18-testing-patterns.md`
- [ ] E2E tests for every endpoint → `@knowledge/18-testing-patterns.md`
- [ ] Coverage ≥ 80% → `@knowledge/18-testing-patterns.md`
- [ ] Tests pass: `npm run build && npm run lint && npm run test && npm run test:e2e`
- [ ] No skipped tests (`.skip`, `xit`) → `rules/testing.md`

## Architecture

- [ ] Controller → Service → Repository layering (no shortcuts) → `@knowledge/05-service-patterns.md`
- [ ] No PrismaService in controllers or services → `rules/service.md`
- [ ] Module per domain → `@knowledge/09-module-organization.md`
- [ ] Lifecycle hooks: `enableShutdownHooks()` in main.ts → `@knowledge/29-lifecycle-hooks.md`
- [ ] Heavy work in queues, not HTTP handlers → `@knowledge/21-queues.md`

## Git

- [ ] One logical change per commit → `@knowledge/11-git-and-pr-workflow.md`
- [ ] Feature Design Pass for multi-step features → `agents/nestjs.md`
- [ ] No force push, no `--no-verify` → `rules/git.md`
- [ ] CLAUDE.md and FOLDER-STRUCTURE.md up to date
