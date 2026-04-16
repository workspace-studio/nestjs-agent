---
description: Git workflow enforcement — commit format, branch naming, push rules
globs:
  - "**"
---

# Git Rules

## Commits
- One logical change per commit — if the message needs "and" or "also", split
- Never commit .env, credentials, or build artifacts
- Never use `--no-verify` to skip hooks
- Never amend published commits

## Branches
- Format: `{issue_number}-{descriptive-name}` (no `feature/`, `fix/`, or other prefixes)
- Never push directly to main
- Never force push

## PRs
- Include test plan checklist in body
- One PR per logical feature
