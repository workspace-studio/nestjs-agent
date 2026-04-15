# Git & PR Workflow

## Branch Naming

Format: `{issue_number}-{short-description}`

No prefixes like `feature/`, `fix/`, `chore/`, etc. — just the issue number and a descriptive name.

Examples:

```bash
git checkout -b 11-add-equipment-domain
git checkout -b 23-fix-work-order-status-validation
git checkout -b 45-upgrade-nestjs-11
git checkout -b 32-extract-pagination-util
```

## Commit Message Format

Format: `#<issue_or_pr_number>: <description>`

Every commit message MUST start with the issue or PR number prefix. Do NOT use conventional commit prefixes (`feat:`, `fix:`, etc.) — use `#<number>:` instead.

Examples:

```bash
git commit -m "#11: Add equipment domain with CRUD operations

Co-Authored-By: NestJS Agent <noreply@anthropic.com>"

git commit -m "#11: Fix address Copilot review findings in reservations + auth

Co-Authored-By: NestJS Agent <noreply@anthropic.com>"
```

Multi-line commit for complex changes:

```bash
git commit -m "$(cat <<'EOF'
#11: Add equipment domain with CRUD operations

- Add Prisma model and migration
- Add repository, service, controller
- Add DTOs with class-validator decorators
- Add Swagger documentation
- Add unit and e2e tests

Co-Authored-By: NestJS Agent <noreply@anthropic.com>
EOF
)"
```

**Always include `Co-Authored-By: NestJS Agent <noreply@anthropic.com>` at the end of every commit message.**

## Pre-Push Checklist

Run these before pushing. All must pass:

```bash
# 1. Build compiles
npm run build

# 2. Lint passes
npm run lint

# 3. Unit tests pass
npm run test

# 4. E2E tests pass
npm run test:e2e
```

One-liner:

```bash
npm run build && npm run lint && npm run test && npm run test:e2e
```

## PR Creation

**IMPORTANT: Always ask the user "Who should review this PR? (GitHub username)" before creating the PR.**

```bash
# Push branch
git push -u origin 11-add-equipment-domain

# Create PR with gh CLI (use the reviewer username provided by the user)
gh pr create --reviewer <username> --title "Resolves #<task_number>: <task_title>" --body "$(cat <<'EOF'
## Summary
- Add Equipment Prisma model with migration
- Add full CRUD (controller, service, repository)
- Add DTOs with validation and Swagger docs
- Add unit and e2e tests

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run test:e2e` passes
- [ ] Swagger docs render correctly at /swagger-ui/index.html
- [ ] CRUD operations verified via API

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Post-Merge Cleanup

```bash
# Switch to main and pull
git checkout main
git pull

# Delete local branch
git branch -d 11-add-equipment-domain

# Delete remote branch (if not auto-deleted)
git push origin --delete 11-add-equipment-domain
```

## Handling Failed Pre-commit Hooks

If a pre-commit hook (lint, format) modifies files:

```bash
# Stage the auto-fixed files
git add .

# Create a NEW commit (never amend unless explicitly asked)
git commit -m "#<number>: Apply lint fixes"
```

## Commit Scope

- One logical change per commit
- Do not mix feature code with unrelated refactors
- Migrations get their own commit if large
- Test additions can be in the same commit as the feature

### Split Signals — stop and split the commit if any of these apply

- The commit message needs **"and"** or a comma between different subjects (e.g. "redesign court-closures **and** add reservations search") → split
- The commit touches two unrelated domain modules → split (unless one genuinely depends on the other)
- The commit mixes a schema/migration change with an unrelated feature → split
- The commit mixes a search/filter addition with a schema redesign → split
- The commit mixes a rename/cleanup with a behavior change → split
- The commit bundles ≥3 distinct features "while we're at it" → split

**One-line rule:** if you catch yourself writing **"also"** or **"additionally"** in the commit message body, stop and split.

### Incomplete commits are also scope violations

A commit must be internally complete. "Block users" that does not cancel their future reservations is not a smaller commit — it is a broken commit that will be retroactively fixed by the next one. If the Feature Design Pass (see `agents/nestjs.md`) lists N behaviors, all N ship together, or none of them do.
