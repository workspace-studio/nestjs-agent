---
name: fix-issue
description: Analyze and fix a GitHub issue — read issue details, understand context, implement fix, write tests, create PR
---

# Fix GitHub Issue

Analyze and fix a GitHub issue end-to-end. Usage: `/fix-issue <issue-number>`

## Steps

### Step 1: Read the Issue

```bash
gh issue view $ARGUMENTS --json title,body,labels,assignees,comments
```

Parse the issue title, description, labels, and any comments for context.

### Step 2: Analyze

- Identify the type: bug fix, feature request, enhancement, refactor
- Identify affected modules and files from the description
- Read the relevant source code files
- Read relevant knowledge files based on the issue type:
  - Bug in service layer → `@knowledge/05-service-patterns.md`
  - Bug in controller → `@knowledge/06-controller-security.md`
  - Database issue → `@knowledge/04-prisma-patterns.md`
  - Test issue → `@knowledge/18-testing-patterns.md`

### Step 3: Plan the Fix

Before coding, outline:
- Root cause of the issue
- Files that need to change
- Any new tests needed
- Any migration needed

### Step 4: Implement

Follow established project patterns. Reference existing code as a guide.

If the fix involves:
- **New field**: Follow the add-field workflow
- **New endpoint**: Follow controller/service/repository patterns
- **Bug fix**: Write a failing test first, then fix the code

### Step 5: Write/Update Tests

- Write a test that would have caught this issue (regression test)
- Update existing tests if behavior changed
- Use test-writer subagent for comprehensive test coverage if needed

### Step 6: Validate

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

Fix any failures and re-run until all green.

### Step 7: Create PR

Use `/create-pr` skill or:

```bash
git checkout -b fix/issue-{number}-{brief-description}
git add src/ prisma/ test/
git commit -m "fix: {description of fix}

Resolves #{number}"
git push -u origin fix/issue-{number}-{brief-description}
gh pr create --title "Resolves #{number}: {issue title}" --body "$(cat <<'EOF'
## Summary
- Root cause: {explanation}
- Fix: {what was changed}

## Test plan
- [ ] Regression test added
- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `npm run test:e2e` passes

Resolves #{number}
EOF
)"
```
