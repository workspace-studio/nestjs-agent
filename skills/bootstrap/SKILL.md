---
name: bootstrap
description: Bootstrap a new NestJS project from scratch with Prisma, PostgreSQL, JWT auth, Swagger, and Docker
---

# Bootstrap New NestJS Project

Set up a complete NestJS project from zero. Usage: `/bootstrap <project-name> — <description>`

Reference: `@knowledge/17-project-bootstrap.md` for full details.

## Steps

### Step 1: Create Project

```bash
npx @nestjs/cli new {project-name} --package-manager npm --strict
cd {project-name}
```

### Step 2: Install Dependencies

```bash
# Core
npm install @nestjs/config @nestjs/swagger class-validator class-transformer

# Auth
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt

# Database (Prisma 7 with adapter-pg)
npm install @prisma/client @prisma/adapter-pg pg
npm install -D prisma

# Email
npm install nodemailer
npm install -D @types/nodemailer

# Testing extras
npm install -D supertest @types/supertest

# Path alias (rewrites src/ imports in compiled JS)
npm install -D tsc-alias
```

### Step 3: Initialize Prisma

```bash
npx prisma init
```

Configure `prisma/schema.prisma` with PostgreSQL datasource and initial User model:

```prisma
enum EntityStatus {
  ACTIVE
  DELETED
}

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  name         String
  password     String
  role         String       @default("USER")
  isActive     Boolean      @default(true)
  entityStatus EntityStatus @default(ACTIVE)
  created      DateTime     @default(now())
  modified     DateTime     @updatedAt

  @@index([email])
  @@index([entityStatus])
  @@map("users")
}
```

### Step 3b: Configure Path Alias

Add `paths` to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": { "src/*": ["src/*"] }
  }
}
```

Update `package.json` build script:

```json
{ "scripts": { "build": "nest build && tsc-alias" } }
```

### Step 4: Docker Compose

Create `docker-compose.yml` with PostgreSQL 17 and Mailpit. See `@knowledge/14-docker-cicd-config.md`.

```bash
docker compose up -d
```

### Step 5: Run First Migration

```bash
npx prisma migrate dev --name init
```

### Step 6: Create Common Module

```
src/modules/common/
├── common.module.ts          # @Global module
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts     # Prisma 7 adapter-pg pattern
├── filters/
│   └── logging-exception.filter.ts
├── middleware/
│   └── http-logger.middleware.ts
└── dto/
    └── pagination-query.dto.ts
```

PrismaService uses adapter-pg pattern (see `@knowledge/04-prisma-patterns.md`).

### Step 7: Create Auth Module

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── decorators/
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   └── user.decorator.ts
├── interfaces/jwt-payload.interface.ts
├── enums/role.enum.ts
└── dto/
    ├── login.dto.ts
    └── register.dto.ts
```

See `@knowledge/06-controller-security.md` for all auth code.

### Step 8: Configure main.ts

```typescript
// Global prefix, CORS, ValidationPipe (transform + whitelist + forbidNonWhitelisted)
// NO enableImplicitConversion
// Swagger at /swagger-ui with bearerAuth scheme
// See @knowledge/16-interceptors-middleware.md
```

### Step 9: Create CLAUDE.md & FOLDER-STRUCTURE.md

Scan the project and generate both files at project root:

1. READ package.json → name, version, Node engine, NestJS version
2. READ prisma/schema.prisma → models, enums
3. READ docker-compose.yml → infrastructure services
4. GLOB src/modules/*/ → list all modules
5. READ src/main.ts → global prefix, pipes, swagger config

Generate CLAUDE.md from `@templates/CLAUDE.md.template` and FOLDER-STRUCTURE.md from `@templates/FOLDER-STRUCTURE.md.template`, filling in project-specific details.

### Step 10: Seed Data

Create `prisma/seed.ts` with an admin user. Add seed script to package.json.

### Step 11: Validate

```bash
npm run build
npm run lint
npm run test
npm run start:dev
# Visit http://localhost:3000/swagger-ui/index.html
```

### Step 12: First Domain Module

If the user specified domain requirements, use `/scaffold` to create the first business module.
