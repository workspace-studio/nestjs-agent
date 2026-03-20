# NestJS Agent

> AI-powered NestJS expert agent for Claude Code. Battle-tested patterns for NestJS + Prisma + PostgreSQL projects.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Creating a New Project From Scratch](#2-creating-a-new-project-from-scratch)
3. [Installing NestJS Agent](#3-installing-nestjs-agent-into-your-project)
4. [Invoking the Agent](#4-invoking-the-agent)
5. [What the Agent Can Do](#5-what-the-agent-can-do)
6. [Example Tasks](#6-example-tasks--copy-paste-ready)
7. [Project Structure](#7-understanding-the-project-structure)
8. [Testing Your API](#8-how-to-test-your-api)
9. [Automated Tests](#9-how-automated-tests-work)
10. [Development Workflow](#10-the-development-workflow)
11. [Troubleshooting](#11-troubleshooting)
12. [Architecture Reference](#12-architecture-reference)

---

## 1. Prerequisites

| Tool | Version | Install | Purpose |
|------|---------|---------|---------|
| Node.js | 20+ (LTS recommended) | `brew install node` or [nvm](https://github.com/nvm-sh/nvm) | JavaScript runtime |
| Docker Desktop | Latest | [docker.com](https://docker.com) | PostgreSQL, Redis, etc. |
| Git | 2.x+ | `brew install git` | Version control |
| Claude Code | Latest | `npm i -g @anthropic-ai/claude-code` | AI coding assistant |
| GitHub CLI | Latest | `brew install gh` → `gh auth login` | PR management |
| VS Code | Latest (optional) | [code.visualstudio.com](https://code.visualstudio.com) | Editor |

Verify installation:

```bash
node --version        # v20.x.x or higher
docker --version      # Docker version 2x.x.x
git --version         # git version 2.x.x
claude --version      # Claude Code vX.X.X
gh --version          # gh version X.X.X
```

---

## 2. Creating a New Project From Scratch

### Option A: Let the Agent Do It (Recommended)

Once you have the agent installed (see section 3), simply tell it:

```
Bootstrap a new NestJS project called "my-api" with Prisma, PostgreSQL,
JWT auth (ADMIN and USER roles), Swagger at /swagger-ui/index.html, Docker Compose,
and a health endpoint.
```

The agent will scaffold the entire project, install dependencies, configure everything, and verify it builds and passes tests.

### Option B: Manual Setup

```bash
# 1. Create NestJS project
npx @nestjs/cli new my-api
cd my-api

# 2. Install dependencies
npm install @prisma/client class-validator class-transformer \
  @nestjs/swagger @nestjs/passport passport passport-jwt \
  @nestjs/jwt @nestjs/config bcrypt
npm install -D prisma @types/passport-jwt @types/bcrypt

# 3. Initialize Prisma
npx prisma init

# 4. Start infrastructure
# (copy docker-compose.yml from knowledge/14-docker-cicd-config.md)
docker compose up -d

# 5. Install the agent
curl -fsSL https://raw.githubusercontent.com/workspace-studio/nestjs-agent/main/install.sh | bash
```

---

## 3. Installing NestJS Agent Into Your Project

### Option A: One-Line Install (Recommended)

```bash
cd /path/to/your-nestjs-project
curl -fsSL https://raw.githubusercontent.com/workspace-studio/nestjs-agent/main/install.sh | bash
```

This downloads and runs the installer, which copies all agent files into your project's `.claude/` directory.

### Option B: Clone and Install

```bash
git clone https://github.com/workspace-studio/nestjs-agent.git /tmp/nestjs-agent
cd /path/to/your-nestjs-project
bash /tmp/nestjs-agent/install.sh
```

### Option C: Manual Copy

If you prefer full control over what gets installed:

```bash
git clone https://github.com/workspace-studio/nestjs-agent.git /tmp/nestjs-agent
cd /path/to/your-nestjs-project
mkdir -p .claude/{agents,knowledge,examples}
cp /tmp/nestjs-agent/agents/nestjs.md .claude/agents/
cp /tmp/nestjs-agent/knowledge/*.md .claude/knowledge/
cp -r /tmp/nestjs-agent/examples/* .claude/examples/
```

### What Gets Installed

```
your-project/
└── .claude/
    ├── agents/
    │   └── nestjs.md                 # Agent definition (~600 lines)
    ├── knowledge/                    # 18 topic reference files
    │   ├── 01-code-style.md
    │   ├── 02-swagger-openapi.md
    │   ├── 03-prisma-migrations.md
    │   ├── 04-prisma-patterns.md
    │   ├── 05-service-patterns.md
    │   ├── 06-controller-security.md
    │   ├── 07-error-handling.md
    │   ├── 08-external-api-integration.md
    │   ├── 09-module-organization.md
    │   ├── 10-domain-scaffold.md
    │   ├── 11-git-and-pr-workflow.md
    │   ├── 12-media-and-s3.md
    │   ├── 13-email-and-notifications.md
    │   ├── 14-docker-cicd-config.md
    │   ├── 15-dependency-management.md
    │   ├── 16-interceptors-middleware.md
    │   ├── 17-project-bootstrap.md
    │   └── 18-testing-patterns.md
    └── examples/                     # Reference code examples
        ├── simple-domain/            # Halls module (basic CRUD)
        ├── medium-domain/            # Equipment module (FK, enums)
        └── tests/                    # Unit + E2E test examples
```

The **agent definition** (`nestjs.md`) is the brain -- it contains instructions, decision logic, and references to the knowledge files and examples. The **knowledge files** are topic-specific references the agent consults depending on the task. The **examples** are real, working code the agent uses as templates.

### Version Control Your Agent

Commit the `.claude/` directory so your entire team benefits:

```bash
git add .claude/
git commit -m "chore: add NestJS AI agent"
```

### Updating

Re-run the installer -- it overwrites existing files with the latest version:

```bash
curl -fsSL https://raw.githubusercontent.com/workspace-studio/nestjs-agent/main/install.sh | bash
```

---

## 4. Invoking the Agent

```bash
cd your-project
claude                    # Start Claude Code
# Type /agents → select "NestJS"
# Give it a task in natural language
```

The agent automatically:

- Reads relevant knowledge files based on your task
- References examples for correct patterns
- Implements the solution
- Runs build, lint, and all tests
- Fixes any failures until green
- Updates your project's CLAUDE.md

### Tips for Best Results

- **Be specific.** Instead of "add a module", say "Create a 'categories' module with name (string, required, unique), description (optional). CRUD endpoints. ADMIN-only writes."
- **Mention roles.** Tell the agent which roles can access what: "All authenticated users can read. Only ADMIN can create/update/delete."
- **Mention tests.** Say "Include unit tests and e2e tests" if you want them (the agent will write them by default, but being explicit helps).
- **Reference existing modules.** "Follow the same pattern as the halls module" helps the agent stay consistent.
- **One task at a time.** The agent works best when focused on a single, well-defined task.

---

## 5. What the Agent Can Do

| Capability | Description | Knowledge File |
|------------|-------------|----------------|
| Create modules | Full CRUD: schema, migration, repo, service, controller, tests | `10-domain-scaffold.md` |
| Add endpoints | New API endpoints to existing modules | `06-controller-security.md` |
| Add fields | Schema + migration + DTO + test updates | `03-prisma-migrations.md` |
| External APIs | HttpModule wrapper with retry and error handling | `08-external-api-integration.md` |
| JWT auth | Guards, decorators, role-based access control | `06-controller-security.md` |
| File upload | Multer + S3/MinIO integration | `12-media-and-s3.md` |
| Email | Nodemailer + HTML templates | `13-email-and-notifications.md` |
| Docker | Compose, multi-stage Dockerfile, CI/CD | `14-docker-cicd-config.md` |
| Swagger | Auto-generated API documentation | `02-swagger-openapi.md` |
| Unit tests | Jest + mocked dependencies | `18-testing-patterns.md` |
| E2E tests | Supertest + real database | `18-testing-patterns.md` |
| Bootstrap | New project from zero to running | `17-project-bootstrap.md` |
| Code quality | ESLint, Prettier, conventions | `01-code-style.md` |

The agent reads only the knowledge files relevant to your task, keeping context efficient and responses fast.

---

## 6. Example Tasks -- Copy-Paste Ready

### Simple: New CRUD Module

```
Create a new 'categories' module with fields: name (string, required, unique),
description (string, optional), color (string, optional, default '#000000').
Standard CRUD endpoints. All authenticated users can read.
Only ADMIN can create, update, and delete.
Include unit tests and e2e tests.
```

### Medium: Add Field to Existing Module

```
Add a 'priority' field to the tasks module. It should be an enum with values:
LOW, MEDIUM, HIGH, CRITICAL. Default to MEDIUM. Make it filterable in the
list endpoint. Update Prisma schema, DTOs, Swagger docs, and all tests.
```

### Complex: External API Integration

```
Integrate with the OpenWeatherMap API. Create a weather module with:
- GET /api/weather/:city — current weather
- GET /api/weather/:city/forecast — 5-day forecast
Base URL and API key from environment variables.
Retry 3 times with 1s delay on failure. Include error handling and unit tests.
```

### Infrastructure: Docker + CI/CD

```
Set up Docker for this project:
- docker-compose.yml: PostgreSQL 17, Mailpit
- Multi-stage production Dockerfile (Alpine, non-root user)
- GitHub Actions CI/CD: lint → test → build → docker push
- Health check endpoint at GET /api/health
```

### Testing: Comprehensive Test Suite

```
Write comprehensive tests for the halls module:
- Service unit tests: create, findAll, findOne, update, remove (success + error)
- Controller unit tests: delegation + exception propagation
- Repository unit tests: Prisma mock verification
- E2E tests: POST 201/400/401/409, GET 200/404, PATCH 200, DELETE 204
Target 90%+ coverage for this module.
```

### Bootstrap: New Project From Zero

```
Bootstrap a new NestJS project called "inventory-api":
- PostgreSQL + Prisma ORM
- JWT auth with ADMIN and USER roles
- Swagger at /swagger-ui/index.html
- Docker Compose for dev infrastructure
- Health endpoint
- First module: products (name, sku unique, price, quantity, isActive)
- Include tests for everything
```

---

## 7. Understanding the Project Structure

Projects built with the NestJS agent follow a consistent, modular structure:

```
src/
├── main.ts                                # App bootstrap
│                                          # - ValidationPipe (transform, whitelist)
│                                          # - Swagger setup (DocumentBuilder)
│                                          # - CORS configuration
│                                          # - Global prefix: /api
│
└── modules/
    ├── app.module.ts                      # Root module (imports all domain modules)
    │
    ├── common/                            # Cross-cutting concerns
    │   ├── config/
    │   │   └── env.validation.ts          # Zod schema for env vars
    │   ├── prisma/
    │   │   ├── prisma.service.ts          # PrismaClient wrapper (adapter-pg)
    │   │   └── prisma.module.ts           # @Global module
    │   ├── filters/
    │   │   └── logging-exception.filter.ts # Error logging + standard format
    │   ├── middleware/
    │   │   └── http-logger.middleware.ts   # Request/response logging
    │   └── dto/
    │       └── pagination-query.dto.ts    # pageNumber, pageSize query params
    │
    ├── auth/                              # Authentication & authorization
    │   ├── auth.module.ts
    │   ├── jwt.strategy.ts                # Passport JWT strategy
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts          # Global: verify JWT, respect @Public
    │   │   └── roles.guard.ts             # Global: check @Roles
    │   ├── decorators/
    │   │   ├── public.decorator.ts        # @Public() — skip auth
    │   │   ├── roles.decorator.ts         # @Roles(Role.ADMIN)
    │   │   └── user.decorator.ts          # @User() — extract JWT payload
    │   └── enums/
    │       └── role.enum.ts               # Project-specific roles
    │
    └── <domain>/                          # One per business domain
        ├── <domain>.module.ts             # Module definition
        ├── <domain>.controller.ts         # HTTP: routes, Swagger, auth
        ├── <domain>.service.ts            # Business logic, validation
        ├── <domain>.repository.ts         # Prisma queries
        ├── <domain>.service.spec.ts       # Service unit test
        ├── <domain>.controller.spec.ts    # Controller unit test
        ├── <domain>.repository.spec.ts    # Repository unit test
        └── dto/
            ├── create-<domain>.dto.ts     # Create input (class-validator)
            └── update-<domain>.dto.ts     # Update input (PartialType)

prisma/
├── schema.prisma                          # Database models + enums
├── migrations/                            # Migration history
└── seed.ts                                # Seed data script

test/
├── e2e/
│   └── <domain>.e2e-spec.ts              # E2E tests (supertest)
├── jest-e2e.json                          # E2E Jest config
└── test-helpers.ts                        # Shared utilities
```

### Layer Responsibilities

| Layer | Responsibility | Throws |
|-------|---------------|--------|
| **Controller** | Parse HTTP input, delegate to service, Swagger docs | -- |
| **Service** | Business validation, orchestration, exceptions | ConflictException, NotFoundException, BadRequestException |
| **Repository** | Prisma queries, pagination, soft delete filter | -- |
| **PrismaService** | Database connection lifecycle | -- |

### How the Layers Connect

```
Controller → Service → Repository → PrismaService → PostgreSQL
```

Each layer has a single responsibility. Controllers never touch Prisma directly. Services never parse HTTP headers. Repositories never throw HTTP exceptions. This separation makes testing straightforward -- each layer can be tested in isolation with mocked dependencies.

---

## 8. How to Test Your API

### Swagger UI (Recommended)

The fastest way to explore and test your API:

1. Start the server: `npm run start:dev`
2. Open: [http://localhost:3000/swagger-ui/index.html](http://localhost:3000/swagger-ui/index.html)
3. Click **Authorize** and paste your JWT token
4. Expand any endpoint and click **Try it out**

Swagger docs are auto-generated from decorators in your controllers. Every endpoint, DTO field, and response type is documented.

### cURL Examples

```bash
# Login (get JWT token)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}' | jq -r .accessToken)

# Create
curl -X POST http://localhost:3000/api/halls \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Main Hall","maxCapacity":100}'

# List (with pagination)
curl "http://localhost:3000/api/halls?pageNumber=0&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"

# Get by ID
curl http://localhost:3000/api/halls/clx1234567890 \
  -H "Authorization: Bearer $TOKEN"

# Update
curl -X PATCH http://localhost:3000/api/halls/clx1234567890 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Hall"}'

# Delete
curl -X DELETE http://localhost:3000/api/halls/clx1234567890 \
  -H "Authorization: Bearer $TOKEN"
```

### HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful read or update |
| 201 | Created | Successful create |
| 204 | No Content | Successful delete |
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Valid JWT but insufficient role |
| 404 | Not Found | Entity does not exist |
| 409 | Conflict | Duplicate entry (unique constraint violation) |
| 500 | Internal Error | Unexpected server error |

### Response Format

Controllers return data directly — no response wrapper.

**Single entity:**
```json
{ "id": "clx1234567890", "name": "Main Hall", "maxCapacity": 100 }
```

**List (Serwizz format):**
```json
{
  "entities": [{ "id": "clx1234567890", "name": "Main Hall" }],
  "totalCount": 42,
  "pagination": { "pageNumber": 0, "pageSize": 10 }
}
```

**Error responses:**
```json
{
  "statusCode": 404,
  "message": "Hall with id clx1234567890 not found",
  "error": "Not Found"
}
```

---

## 9. How Automated Tests Work

### Test Types

| Type | Purpose | Location | Runner |
|------|---------|----------|--------|
| Unit | Isolated logic, mocked deps | `src/**/*.spec.ts` | `npm run test` |
| E2E | Full HTTP request cycle | `test/e2e/*.e2e-spec.ts` | `npm run test:e2e` |

Unit tests mock all dependencies (Prisma, other services) and test logic in isolation. E2E tests spin up the full NestJS application, connect to a real test database, and make actual HTTP requests.

### Running Tests

```bash
npm run test              # All unit tests
npm run test:watch        # Watch mode (re-run on changes)
npm run test:cov          # With coverage report (target: 80%+)
npm run test:e2e          # E2E tests (requires running database)
```

### What Gets Tested Per Module

| Component | Tests |
|-----------|-------|
| Service | create (success, duplicate), findAll, findOne (success, not found), update, remove |
| Controller | Each method delegates correctly, exceptions propagate |
| Repository | Prisma methods called with correct args |
| Guards | Allow/deny based on roles |

### E2E Coverage Per Endpoint

| Method | Status Codes Tested |
|--------|-------------------|
| POST | 201 (success), 400 (validation), 401 (no auth), 403 (wrong role), 409 (duplicate) |
| GET list | 200 (with pagination) |
| GET :id | 200 (found), 404 (not found) |
| PATCH :id | 200 (success), 404 (not found) |
| DELETE :id | 204 (success), 403 (wrong role) |

### Red-Green-Fix Cycle

The agent follows a disciplined testing workflow:

1. **Write code** -- implementation first
2. **Write tests** -- unit and e2e
3. **Run tests** -- expect some failures (**RED**)
4. **Fix code** -- adjust until tests pass
5. **Run tests again** -- all pass (**GREEN**)
6. **Refactor** if needed (keep green)

This cycle repeats until the agent is confident everything works correctly. You will see the agent running `npm run test` and `npm run test:e2e` multiple times during a task.

---

## 10. The Development Workflow

When you give the agent a task, it follows a structured 8-phase workflow:

### Phase 1: Request

Tell the agent what you want in natural language. Be as specific as possible about fields, types, validation rules, and access control.

### Phase 2: Analysis

The agent reads your existing codebase to understand:
- Current project structure and patterns
- Existing modules and their relationships
- Database schema and naming conventions
- Test patterns already in use

It also consults the relevant knowledge files and examples.

### Phase 3: Implementation

The agent writes the code. For a new module, this typically means ~8 files:

- Prisma model addition to `schema.prisma`
- Migration via `npx prisma migrate dev`
- Repository (Prisma queries)
- Service (business logic)
- Controller (HTTP layer with Swagger decorators)
- DTOs (create + update with class-validator)
- Module definition (wiring it all together)
- Registration in `app.module.ts`

### Phase 4: Build & Lint

```bash
npm run build     # Must compile cleanly
npm run lint      # Must pass ESLint + Prettier
```

The agent automatically fixes any build or lint errors before proceeding.

### Phase 5: Testing

The agent writes tests and runs them:

```bash
npm run test      # Unit tests
npm run test:e2e  # E2E tests
```

If tests fail, the agent enters the Red-Green-Fix cycle: read the error, fix the code or test, re-run until all green.

### Phase 6: Documentation

The agent updates your project's `CLAUDE.md` with:
- Updated folder structure tree
- New module in the module list
- Any new patterns or commands introduced

### Phase 7: PR (if requested)

If you ask for a PR, the agent creates one:

```bash
gh pr create --title "feat: add categories module" --body "..."
```

The PR body includes a summary of changes, files modified, and testing notes.

### Phase 8: Review

You review the code and merge. The agent's work is done.

---

## 11. Troubleshooting

### Docker not running

```bash
# Check Docker Desktop is running, then:
docker compose up -d
docker compose ps    # Verify all services are healthy
```

If services show as "unhealthy", check logs:

```bash
docker compose logs postgres   # Check specific service
```

### Port already in use

```bash
lsof -i :5432       # Find process using port
kill <PID>           # Kill it
# Or change port in docker-compose.yml
```

Common ports: 5432 (PostgreSQL), 1025 (Mailpit SMTP), 8025 (Mailpit UI), 3000 (NestJS).

### Build fails

```bash
npm run build        # Read TypeScript errors carefully
npx prisma generate  # Regenerate Prisma Client if schema changed
```

If you see "Cannot find module '@prisma/client'", run `npx prisma generate` first.

### Tests fail with "connection refused"

```bash
docker compose ps    # Is PostgreSQL running?
docker compose up -d # Start if not
```

Ensure your `.env.test` or test configuration points to the correct database URL.

### 401 Unauthorized on all endpoints

- Check JWT token is valid and not expired
- Ensure `Authorization: Bearer <token>` header format (note the space after "Bearer")
- Verify `JWT_SECRET` in `.env` matches between login and validation
- Check token expiration -- default is usually 1 hour

### 403 Forbidden

- Check the user's role matches the `@Roles()` requirement on the endpoint
- Admin endpoints need a token from a user with the ADMIN role
- Use the login endpoint to get a token for the correct user

### Prisma schema out of sync

```bash
npx prisma generate             # Regenerate client from schema
npx prisma migrate dev          # Apply pending migrations
```

### Migration drift

```bash
npx prisma migrate dev          # Create migration for schema changes
# If stuck with migration conflicts:
npx prisma migrate reset        # WARNING: drops all data and re-runs migrations
```

### Swagger not loading

- Check `main.ts` has `SwaggerModule.setup()` configured
- Verify the path: [http://localhost:3000/swagger-ui/index.html](http://localhost:3000/swagger-ui/index.html)
- Ensure the server is running (`npm run start:dev`)
- Check for startup errors in the terminal

### Agent not showing in /agents

```bash
ls .claude/agents/               # Should contain nestjs.md
# If missing, re-run the installer:
curl -fsSL https://raw.githubusercontent.com/workspace-studio/nestjs-agent/main/install.sh | bash
```

### npm install fails

```bash
rm -rf node_modules package-lock.json
npm install
```

If you still get errors, check your Node.js version (`node --version`) meets the minimum requirement (v20+).

### E2E tests hang or timeout

- Check that the test database exists and is accessible
- Ensure no other process is using the test database
- Increase Jest timeout in `jest-e2e.json` if tests are slow

### "Module not found" after adding a new module

- Verify the module is imported in `app.module.ts`
- Check that all file paths and class names match (NestJS is case-sensitive with imports)
- Run `npm run build` to see the exact error

---

## 12. Architecture Reference

### Request Flow

```
HTTP Request
  │
  ▼
ValidationPipe              ← Transform + whitelist + forbidNonWhitelisted
  │
  ▼
JwtAuthGuard                ← Verify JWT token (skip if @Public)
  │
  ▼
RolesGuard                  ← Check @Roles match user role
  │
  ▼
Controller                  ← Parse params, delegate to service
  │
  ▼
Service                     ← Business logic, validation, exceptions
  │
  ▼
Repository                  ← Prisma queries, pagination, soft delete
  │
  ▼
PostgreSQL                  ← Data storage
  │
  ▼
HTTP Response
```

### Key Design Decisions

- **Global prefix `/api`** -- all routes are prefixed, keeping the root path free for frontend serving.
- **Global ValidationPipe** -- DTOs are validated automatically. Invalid requests never reach the service layer.
- **Global guards** -- JWT and Roles guards are applied globally. Use `@Public()` to opt out of auth on specific endpoints.
- **No response wrapper** -- controllers return data directly. List endpoints use Serwizz format: `{ entities, totalCount, pagination }`.
- **Repository pattern** -- Prisma queries are isolated in repository classes, making services testable without database access.

### Knowledge Files

| # | File | Description |
|---|------|-------------|
| 01 | `code-style.md` | ESLint, Prettier, naming conventions |
| 02 | `swagger-openapi.md` | API documentation decorators |
| 03 | `prisma-migrations.md` | Database schema and migrations |
| 04 | `prisma-patterns.md` | PrismaService, repository, queries |
| 05 | `service-patterns.md` | Business logic and validation |
| 06 | `controller-security.md` | HTTP layer, JWT, guards |
| 07 | `error-handling.md` | Exception filters and error format |
| 08 | `external-api-integration.md` | Third-party API integration |
| 09 | `module-organization.md` | NestJS module structure |
| 10 | `domain-scaffold.md` | End-to-end module creation guide |
| 11 | `git-and-pr-workflow.md` | Git branching and PR workflow |
| 12 | `media-and-s3.md` | File upload and S3 storage |
| 13 | `email-and-notifications.md` | Email and push notifications |
| 14 | `docker-cicd-config.md` | Docker, Dockerfile, CI/CD |
| 15 | `dependency-management.md` | npm and version management |
| 16 | `interceptors-middleware.md` | Response wrapping and logging |
| 17 | `project-bootstrap.md` | New project setup guide |
| 18 | `testing-patterns.md` | Complete testing reference |

These files are the agent's knowledge base. Each one is a focused reference document covering a specific topic. The agent reads only the files relevant to the current task, keeping context usage efficient.

### Example Modules

The `examples/` directory contains complete, working reference implementations:

- **`simple-domain/`** -- Halls module. Basic CRUD with string and number fields. Good starting point for understanding the pattern.
- **`medium-domain/`** -- Equipment module. Foreign keys, enums, more complex queries. Shows how to handle relationships between modules.
- **`tests/`** -- Unit and E2E test examples. Shows mocking patterns, test setup, and assertion styles.

The agent uses these examples as templates when creating new modules, ensuring consistency across your codebase.

---

Built by [Workspace Studio](https://github.com/workspace-studio)
