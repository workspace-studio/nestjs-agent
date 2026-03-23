---
name: build-fix
description: Automatically fix build and lint errors
---

Fix all build and lint errors in the project:

## Step 1: Run build and capture errors

```bash
npm run build 2>&1
```

Read the error output carefully. Identify each error by file and line number.

## Step 2: Categorize errors

- **Type errors** — missing types, incompatible types, missing imports
- **Import errors** — wrong paths, missing modules, circular dependencies
- **Lint errors** — formatting, unused variables, naming conventions

## Step 3: Fix errors

For each error:
1. Read the affected file
2. Understand the context
3. Apply the minimal fix
4. Do NOT refactor or improve surrounding code

## Step 4: Run lint fix

```bash
npm run lint -- --fix
```

Fix any remaining lint issues manually if `--fix` doesn't resolve them.

## Step 5: Verify

Run in order:
1. `npm run build` — must compile with zero errors
2. `npm run lint` — must pass with zero warnings
3. `npm run test` — must pass (fixes should not break tests)

## Rules

- Fix ONLY the reported errors — do not refactor
- If a fix requires changing tests, update the tests
- If a fix requires a new dependency, ask before installing
- Never suppress errors with `// @ts-ignore` or `any` casts
