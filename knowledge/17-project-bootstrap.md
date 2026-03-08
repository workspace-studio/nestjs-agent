# Project Bootstrap — New Project from Zero

## Step 1: Create NestJS Project

```bash
npx @nestjs/cli new my-app --package-manager npm --strict
cd my-app
```

## Step 2: Install Dependencies

```bash
# Core
npm install @nestjs/config @nestjs/swagger class-validator class-transformer

# Auth
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt

# Database
npm install @prisma/client
npm install -D prisma

# HTTP client
npm install @nestjs/axios axios

# S3
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid
npm install -D @types/uuid

# Email
npm install nodemailer
npm install -D @types/nodemailer

# Testing extras
npm install -D supertest @types/supertest

# Linting
npm install -D eslint-plugin-import
```

## Step 3: Initialize Prisma

```bash
npx prisma init
```

Update `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  MANAGER
  TECHNICIAN
  EMPLOYEE
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      UserRole @default(EMPLOYEE)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@index([email])
  @@index([deletedAt])
  @@map("users")
}
```

## Step 4: Docker Compose

Create `docker-compose.yml` — see `14-docker-cicd-config.md` for the full file.

## Step 5: Start Infrastructure

```bash
docker compose up -d
```

## Step 6: Run First Migration

```bash
npx prisma migrate dev --name init
```

## Step 7: Common Module

Create these files:

```
src/common/
  common.module.ts
  prisma/
    prisma.module.ts
    prisma.service.ts
  filters/
    exception.filter.ts
  interceptors/
    response.interceptor.ts
    timeout.interceptor.ts
  middleware/
    logging.middleware.ts
  utils/
    pagination.ts
```

### common.module.ts

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  exports: [PrismaModule],
})
export class CommonModule {}
```

### prisma.service.ts

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

### prisma.module.ts

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### exception.filter.ts

See `07-error-handling.md` for full implementation.

### response.interceptor.ts

See `16-interceptors-middleware.md` for full implementation.

### pagination.ts

See `04-prisma-patterns.md` for full implementation.

## Step 8: Auth Module

Create:

```
src/auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  strategies/
    jwt.strategy.ts
  guards/
    jwt-auth.guard.ts
    roles.guard.ts
  decorators/
    public.decorator.ts
    roles.decorator.ts
    user.decorator.ts
  interfaces/
    jwt-payload.interface.ts
  enums/
    role.enum.ts
  dto/
    login.dto.ts
    register.dto.ts
```

See `06-controller-security.md` for all auth code.

## Step 9: main.ts Setup

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { LoggingExceptionFilter } from './common/filters/exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalFilters(new LoggingExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('My App API')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
```

## Step 10: First Domain Module

Follow `10-domain-scaffold.md` to create your first business domain (e.g., User module).

## Step 11: Jest Config

`package.json` (Jest section):

```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s",
      "!**/*.module.ts",
      "!**/main.ts",
      "!**/*.dto.ts",
      "!**/*.interface.ts",
      "!**/*.enum.ts"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^src/(.*)$": "<rootDir>/$1"
    }
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

`test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  }
}
```

## Step 12: Environment Files

Create `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp_dev
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRATION=1d
SMTP_HOST=localhost
SMTP_PORT=1025
EMAIL_FROM=noreply@myapp.local
```

Create `.env.example` (same but with placeholder values). Add `.env` to `.gitignore`.

## Step 13: CLAUDE.md

Create a `CLAUDE.md` at project root documenting:

- Project overview and tech stack
- Build/run/test commands
- Architecture and folder structure
- Key patterns (repository, service, DTOs)
- Code style rules

## Verify Everything Works

```bash
docker compose up -d
npx prisma migrate dev
npm run build
npm run lint
npm run test
npm run start:dev
# Visit http://localhost:3000/api/docs
```
