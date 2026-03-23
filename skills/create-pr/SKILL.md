---
name: create-pr
description: Create a feature branch, commit changes, push, and open a GitHub pull request
disable-model-invocation: true
---

# Create Pull Request

Git workflow and PR creation. Usage: `/create-pr`

## Steps

### Step 1: Verify Changes

```bash
git status
git diff --stat
```

Ensure all changes are intentional. Do NOT commit `.env`, credentials, or build artifacts.

### Step 2: Create Branch

```bash
git checkout -b {issue_number}-{descriptive-name}
```

No prefixes like `feature/`, `fix/`, etc. — just the issue number and a descriptive name.

Example: `11-add-equipment-domain`, `23-fix-work-order-validation`

### Step 3: Update CLAUDE.md & FOLDER-STRUCTURE.md

If structural changes were made (new module, new migration, new infrastructure):
1. READ current CLAUDE.md and FOLDER-STRUCTURE.md
2. Folder tree changes → FOLDER-STRUCTURE.md
3. Other changes (commands, module descriptions) → CLAUDE.md
4. Keep it concise — factual entries only

### Step 4: Stage Files

Stage specific files (NEVER use `git add -A` or `git add .`):

```bash
git add src/ prisma/ test/ CLAUDE.md FOLDER-STRUCTURE.md
```

### Step 5: Commit

```bash
git commit -m "$(cat <<'EOF'
{type}: {concise description}

Co-Authored-By: NestJS Agent <noreply@anthropic.com>
EOF
)"
```

Commit types: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`

### Step 6: Push

```bash
git push -u origin {branch-name}
```

### Step 7: Create PR

**ASK the user**: "Who should review this PR? (GitHub username)"

Wait for the user's response, then:

```bash
gh pr create --reviewer {username} --title "Resolves #{task_number}: {task_title}" --body "$(cat <<'EOF'
## Summary
- {bullet points of changes}

## Test plan
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] `npm run test:e2e` passes
- [ ] Swagger docs render correctly at /swagger-ui/index.html

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Rules

- NEVER push to main directly
- NEVER force push
- NEVER use `git add -A` or `git add .`
- NEVER skip hooks (`--no-verify`)
- NEVER commit .env, credentials, or build artifacts
- One logical change per commit
