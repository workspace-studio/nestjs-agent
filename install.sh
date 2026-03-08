#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_URL="https://github.com/workspace-studio/nestjs-agent"
if [ -f "$SCRIPT_DIR/agents/nestjs.md" ]; then
    SOURCE_DIR="$SCRIPT_DIR"
else
    TEMP_DIR=$(mktemp -d)
    trap 'rm -rf "$TEMP_DIR"' EXIT
    git clone --depth 1 "$REPO_URL" "$TEMP_DIR" 2>/dev/null
    SOURCE_DIR="$TEMP_DIR"
fi
if [ ! -f "package.json" ] && [ ! -f "nest-cli.json" ]; then
    echo "WARNING: No package.json or nest-cli.json found."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi
mkdir -p .claude/{agents,knowledge,examples}
cp "$SOURCE_DIR/agents/nestjs.md" .claude/agents/nestjs.md
cp "$SOURCE_DIR/knowledge/"*.md .claude/knowledge/
cp -r "$SOURCE_DIR/examples/"* .claude/examples/ 2>/dev/null || true
echo ""
echo "=== NestJS Agent Installed ==="
echo "  Agent:     $(ls .claude/agents/*.md | wc -l | tr -d ' ') file"
echo "  Knowledge: $(ls .claude/knowledge/*.md | wc -l | tr -d ' ') files"
echo "  Examples:  $(find .claude/examples -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ') directories"
echo ""
echo "Usage: cd $(pwd) && claude → /agents → NestJS"
