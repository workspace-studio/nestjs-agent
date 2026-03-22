---
name: refactor
description: Refactor existing NestJS code — improve structure, extract patterns, rename, split modules — while preserving all tests
---

# Refactor Code

Safely refactor existing code while keeping all tests green. Usage: `/refactor <description of what to refactor>`

## Rules

1. **Tests must pass before AND after** — run `npm run test && npm run test:e2e` before starting, and after every significant change
2. **Small steps** — make one change at a time, verify tests pass, then proceed
3. **No behavior changes** — refactoring changes structure, not behavior. If tests break, the refactoring is wrong.
4. **Use code-reviewer subagent** before starting to identify what needs refactoring

## Common Refactoring Tasks

### Extract Service (split when >8 methods)

When a service exceeds ~8 public methods, split into `QueryingService` + `MutationService`:

1. Read `@knowledge/05-service-patterns.md` for the split pattern
2. Create `{domain}-querying.service.ts` (read operations)
3. Create `{domain}-mutation.service.ts` (write operations)
4. Update module providers and exports
5. Update controller to inject both services
6. Update all tests
7. Verify: `npm run test && npm run test:e2e`

### Extract Shared Logic

When multiple modules duplicate logic:

1. Identify the shared pattern
2. Create a utility in `src/modules/common/utils/` or a shared service
3. Replace duplicated code with the shared implementation
4. Update tests
5. Verify

### Rename Module/Entity

1. Update Prisma schema (`@@map` stays the same to avoid migration)
2. Rename all files (controller, service, repository, DTOs, module, tests)
3. Update all imports
4. Update AppModule imports
5. Update CLAUDE.md
6. Run `npm run build` — fix any compilation errors
7. Verify: `npm run test && npm run test:e2e`

### Improve Repository Patterns

1. Read `@knowledge/04-prisma-patterns.md`
2. Add missing `ALLOWED_SORT_FIELDS` validation
3. Add missing P2002 error handling
4. Fix `findUnique` vs `findFirst` usage
5. Ensure all queries filter by `entityStatus: 'ACTIVE'`
6. Verify

## Steps

1. **Analyze** — use code-reviewer subagent to identify issues
2. **Plan** — list specific changes in order
3. **Baseline** — run tests to confirm they pass before changes
4. **Execute** — one change at a time, test after each
5. **Verify** — full test suite green
6. **Update docs** — update CLAUDE.md if structure changed
