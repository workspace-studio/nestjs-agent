#!/bin/bash
# ------------------------------------------------
# Pre-commit hook for NestJS projects
# Runs build + lint + tests before EVERY commit.
# If anything fails, the commit is blocked.
# ------------------------------------------------

RED="\033[0;31m"
GREEN="\033[0;32m"
NC="\033[0m"

# Step 1: Run TypeScript type check
echo "Checking types..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo -e "${RED}Type errors found. Fix before committing.${NC}"
    exit 2
fi

# Step 2: Run ESLint on staged files
echo "Linting staged files..."
STAGED=$(git diff --cached --name-only --diff-filter=d | grep -E "\.(ts|tsx)$")
if [ -n "$STAGED" ]; then
    npx eslint $STAGED --quiet
    if [ $? -ne 0 ]; then
        echo -e "${RED}Lint errors. Run npm run lint to see details.${NC}"
        exit 2
    fi
fi

# Step 3: Run unit test suite
echo "Running unit tests..."
npm test -- --silent
if [ $? -ne 0 ]; then
    echo -e "${RED}Unit tests failed. Commit blocked.${NC}"
    exit 2
fi

# Step 4: Run e2e test suite
echo "Running e2e tests..."
npm run test:e2e -- --silent
if [ $? -ne 0 ]; then
    echo -e "${RED}E2E tests failed. Commit blocked.${NC}"
    exit 2
fi

echo -e "${GREEN}All checks passed!${NC}"
exit 0
