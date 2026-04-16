#!/bin/bash
# ------------------------------------------------
# Lint-on-save hook for NestJS projects
# Runs ESLint --fix on .ts files after Edit/Write.
# Claude Code passes tool input as JSON on stdin.
# ------------------------------------------------

INPUT=$(cat)
FILEPATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -n "$FILEPATH" ] && [[ "$FILEPATH" == *.ts ]]; then
    npx eslint --fix "$FILEPATH" 2>/dev/null || true
fi
