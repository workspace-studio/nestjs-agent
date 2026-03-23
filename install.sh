#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/workspace-studio/nestjs-agent"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Source resolution ---
if [ -f "$SCRIPT_DIR/agents/nestjs.md" ]; then
    SOURCE_DIR="$SCRIPT_DIR"
else
    TEMP_DIR=$(mktemp -d)
    trap 'rm -rf "$TEMP_DIR"' EXIT
    echo "Downloading NestJS Agent..."
    git clone --depth 1 "$REPO_URL" "$TEMP_DIR" 2>/dev/null
    SOURCE_DIR="$TEMP_DIR"
fi

# --- Validate target ---
if [ ! -f "package.json" ] && [ ! -f "nest-cli.json" ]; then
    echo "WARNING: No package.json or nest-cli.json found in $(pwd)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
fi

# --- Create directory structure ---
mkdir -p .claude/{agents,knowledge,examples}
for skill in scaffold bootstrap fix-issue add-field write-tests create-pr refactor; do
    mkdir -p ".claude/skills/$skill"
done

# --- Copy agents ---
cp "$SOURCE_DIR/agents/"*.md .claude/agents/

# --- Copy skills ---
for skill_dir in "$SOURCE_DIR/skills/"*/; do
    skill_name=$(basename "$skill_dir")
    cp "$skill_dir"SKILL.md ".claude/skills/$skill_name/SKILL.md" 2>/dev/null || true
done

# --- Copy knowledge + examples ---
cp "$SOURCE_DIR/knowledge/"*.md .claude/knowledge/
cp -r "$SOURCE_DIR/examples/"* .claude/examples/ 2>/dev/null || true

# --- Install settings.json with hooks (only if not exists) ---
if [ ! -f ".claude/settings.json" ]; then
    cat > .claude/settings.json << 'SETTINGS_EOF'
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": { "tool": "Edit" },
        "hooks": [{
          "type": "command",
          "command": "npx eslint --fix $FILEPATH 2>/dev/null || true"
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": { "tool": "Bash", "command": "git commit" },
        "hooks": [{
          "type": "command",
          "command": "npm run build --quiet && npm run lint --quiet && npm run test --quiet"
        }]
      }
    ]
  }
}
SETTINGS_EOF
fi

# --- Install CLAUDE.md from template (only if not exists) ---
if [ ! -f "CLAUDE.md" ]; then
    PROJECT_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "My Project")
    sed "s/{PROJECT_NAME}/$PROJECT_NAME/g" "$SOURCE_DIR/templates/CLAUDE.md.template" > CLAUDE.md
fi

# --- Install FOLDER-STRUCTURE.md from template (only if not exists) ---
if [ ! -f "FOLDER-STRUCTURE.md" ]; then
    cp "$SOURCE_DIR/templates/FOLDER-STRUCTURE.md.template" FOLDER-STRUCTURE.md
fi

# --- Summary ---
echo ""
echo "=== NestJS Agent Installed ==="
echo "  Agents:    $(ls .claude/agents/*.md 2>/dev/null | wc -l | tr -d ' ') files"
echo "  Skills:    $(find .claude/skills -name 'SKILL.md' 2>/dev/null | wc -l | tr -d ' ') skills"
echo "  Knowledge: $(ls .claude/knowledge/*.md 2>/dev/null | wc -l | tr -d ' ') files"
echo "  Examples:  $(find .claude/examples -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ') directories"
echo "  Hooks:     $([ -f .claude/settings.json ] && echo 'yes' || echo 'no')"
echo "  CLAUDE.md:           $([ -f CLAUDE.md ] && echo 'present' || echo 'skipped')"
echo "  FOLDER-STRUCTURE.md: $([ -f FOLDER-STRUCTURE.md ] && echo 'present' || echo 'skipped')"
echo ""
echo "  Skills:  /scaffold  /bootstrap  /fix-issue  /add-field  /write-tests  /create-pr  /refactor"
echo ""
echo "  Usage: cd $(pwd) && claude"
