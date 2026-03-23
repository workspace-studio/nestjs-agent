---
name: pr-review
description: Review current branch changes before creating a PR
---

Review all changes in the current branch before merge:

## Step 1: Understand the diff

Run `git diff main...HEAD` to see all changes.
Read every modified file top to bottom.
Map which modules, services, and controllers were touched.

## Step 2: Security scan

- Grep for hardcoded API keys, tokens, passwords
- Check .env files are in .gitignore
- Verify Zod/class-validator validation on all DTOs
- Check for SQL injection in raw queries
- Ensure no secrets in committed files

## Step 3: Architecture check

- Controller → Service → Repository pattern followed
- No PrismaService injected in controllers or services (only repositories)
- No business logic in controllers
- Proper use of @Roles, @Public, @ApiBearerAuth decorators

## Step 4: Code quality

- TypeScript strict: no `any`, no `as` casts
- Functions under 50 lines
- No duplicated logic (DRY)
- Descriptive variable names
- Proper error handling with correct exception types

## Step 5: Testing

- New code has corresponding tests
- Both success and failure paths tested
- `afterEach(() => jest.clearAllMocks())` in every describe block
- Run `npm run test` and `npm run test:e2e` to verify

## Step 6: Report

Format findings as: CRITICAL / WARNING / SUGGESTION
Always run `npm run build` before approving.
Block the commit if any CRITICAL found.
