# Dependency Management

## Core Dependencies

```bash
# NestJS core
npm install @nestjs/core @nestjs/common @nestjs/platform-express rxjs reflect-metadata

# Configuration
npm install @nestjs/config

# Validation
npm install class-validator class-transformer

# Swagger/OpenAPI
npm install @nestjs/swagger

# Database (Prisma)
npm install @prisma/client
npm install -D prisma

# Auth
npm install @nestjs/passport @nestjs/jwt passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt

# HTTP client (external APIs)
npm install @nestjs/axios axios

# S3 file storage
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid
npm install -D @types/uuid

# Email
npm install nodemailer
npm install -D @types/nodemailer

# Push notifications (optional)
npm install web-push
npm install -D @types/web-push
```

## Dev Dependencies

```bash
# TypeScript
npm install -D typescript ts-node ts-loader tsconfig-paths

# Testing
npm install -D jest ts-jest @nestjs/testing @types/jest supertest @types/supertest

# Linting & Formatting
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier eslint-plugin-prettier eslint-plugin-import

# Types
npm install -D @types/node @types/express @types/multer
```

## Auditing

```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# View outdated packages
npm outdated

# Update a specific package
npm install @nestjs/core@latest
```

## NestJS Major Upgrade Guide

### Safe Upgrade Order

1. **Update NestJS packages together** (they must match versions):

```bash
npm install @nestjs/core@latest @nestjs/common@latest @nestjs/platform-express@latest
npm install @nestjs/config@latest @nestjs/swagger@latest
npm install @nestjs/passport@latest @nestjs/jwt@latest
npm install @nestjs/axios@latest
npm install -D @nestjs/testing@latest @nestjs/cli@latest @nestjs/schematics@latest
```

2. **Update Prisma**:

```bash
npm install @prisma/client@latest
npm install -D prisma@latest
npx prisma generate
```

3. **Update TypeScript** (check NestJS compatibility first):

```bash
npm install -D typescript@latest
```

4. **Update testing deps**:

```bash
npm install -D jest@latest ts-jest@latest @types/jest@latest supertest@latest @types/supertest@latest
```

5. **Update everything else**:

```bash
npm install class-validator@latest class-transformer@latest
npm install rxjs@latest
```

### After Upgrading

```bash
# Regenerate Prisma client
npx prisma generate

# Build to check for compilation errors
npm run build

# Run all tests
npm run test
npm run test:e2e

# Run lint
npm run lint
```

## Lock File

- Always commit `package-lock.json`
- Use `npm ci` in CI/CD (installs from lock file exactly)
- Use `npm install` only when adding/updating packages locally
- Never delete `package-lock.json` unless absolutely necessary

## Checking Compatibility

Before upgrading, check:

```bash
# View what would be updated
npm outdated

# Check a specific package's changelog
npm view @nestjs/core versions --json | tail -5
```
