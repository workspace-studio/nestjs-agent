# nestjs-agent

Claude Code agent configuration for NestJS + Prisma + PostgreSQL backend projects.

## Structure

- `agents/` — subagent definitions (code-reviewer, test-writer, debugger, security-auditor, db-specialist)
- `skills/` — slash-command workflows (/scaffold, /fix-issue, /add-endpoint, /test-endpoint, /review-migration, etc.)
- `knowledge/` — domain knowledge files (01-30, loaded on demand by agent)
- `rules/` — auto-loaded guardrails scoped by file pattern
- `commands/` — one-word automations (/deploy, /pr-review, /build-fix)
- `hooks/` — shell scripts wired via settings.json (pre-commit, lint-on-save)
- `templates/` — CLAUDE.md and FOLDER-STRUCTURE.md templates for target projects
- `examples/` — reference code for simple/medium domain modules and tests
- `install.sh` — installs agent into a project's .claude/ directory

## Testing changes

1. Edit files in this repo
2. Run `./install.sh` in a test NestJS project directory
3. Verify: agent reads correct knowledge, skills invoke correctly, hooks fire on commit
