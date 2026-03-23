#!/bin/bash
# ------------------------------------------------
# Lint-on-save hook for NestJS projects
# Runs ESLint --fix on files after Edit/Write.
# ------------------------------------------------

if [ -n "$FILEPATH" ] && [[ "$FILEPATH" == *.ts ]]; then
    npx eslint --fix "$FILEPATH" 2>/dev/null || true
fi
