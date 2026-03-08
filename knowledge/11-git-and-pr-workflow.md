# Git & PR Workflow

## Branch Naming

```
feature/<short-description>    # New features
fix/<short-description>        # Bug fixes
chore/<short-description>      # Maintenance, deps, config
docs/<short-description>       # Documentation only
refactor/<short-description>   # Code restructuring
test/<short-description>       # Adding/fixing tests
```

Examples:

```bash
git checkout -b feature/add-equipment-domain
git checkout -b fix/work-order-status-validation
git checkout -b chore/upgrade-nestjs-11
git checkout -b refactor/extract-pagination-util
```

## Conventional Commits

Format: `<type>: <description>`

| Type       | When                                           |
|------------|------------------------------------------------|
| `feat:`    | New feature or endpoint                        |
| `fix:`     | Bug fix                                        |
| `chore:`   | Dependencies, config, build                    |
| `docs:`    | Documentation changes                          |
| `test:`    | Adding or fixing tests                         |
| `refactor:`| Code restructuring without behavior change     |
| `style:`   | Formatting, lint fixes                         |
| `perf:`    | Performance improvement                        |

Examples:

```bash
git commit -m "feat: add equipment domain with CRUD operations

Co-Authored-By: NestJS Agent <noreply@anthropic.com>"

git commit -m "fix: validate due date is in the future for work orders

Co-Authored-By: NestJS Agent <noreply@anthropic.com>"
```

Multi-line commit for complex changes:

```bash
git commit -m "$(cat <<'EOF'
feat: add equipment domain with CRUD operations

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
git push -u origin feature/add-equipment-domain

# Create PR with gh CLI (use the reviewer username provided by the user)
gh pr create --reviewer <username> --title "feat: add equipment domain" --body "$(cat <<'EOF'
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
- [ ] Swagger docs render correctly at /api/docs
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
git branch -d feature/add-equipment-domain

# Delete remote branch (if not auto-deleted)
git push origin --delete feature/add-equipment-domain
```

## Handling Failed Pre-commit Hooks

If a pre-commit hook (lint, format) modifies files:

```bash
# Stage the auto-fixed files
git add .

# Create a NEW commit (never amend unless explicitly asked)
git commit -m "style: apply lint fixes"
```

## Commit Scope

- One logical change per commit
- Do not mix feature code with unrelated refactors
- Migrations get their own commit if large
- Test additions can be in the same commit as the feature
