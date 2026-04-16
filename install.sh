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
mkdir -p .claude/{agents,knowledge,examples,rules,commands,hooks}
for skill in scaffold bootstrap fix-issue add-field write-tests create-pr refactor add-endpoint test-endpoint review-migration add-queue add-cron add-cache; do
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

# --- Copy rules ---
if [ -d "$SOURCE_DIR/rules" ]; then
    cp "$SOURCE_DIR/rules/"*.md .claude/rules/
fi

# --- Copy commands ---
if [ -d "$SOURCE_DIR/commands" ]; then
    cp "$SOURCE_DIR/commands/"*.md .claude/commands/
fi

# --- Copy hooks ---
if [ -d "$SOURCE_DIR/hooks" ]; then
    cp "$SOURCE_DIR/hooks/"*.sh .claude/hooks/
    chmod +x .claude/hooks/*.sh
fi

# --- Install settings.json with hooks (only if not exists) ---
if [ ! -f ".claude/settings.json" ]; then
    cat > .claude/settings.json << 'SETTINGS_EOF'
{
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test *)",
      "Bash(npm run build)",
      "Bash(npm run start:dev)",
      "Bash(npx prisma *)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git status)",
      "Bash(gh issue *)",
      "Bash(gh pr *)"
    ],
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(secrets/**)",
      "Bash(rm -rf *)",
      "Bash(git push --force *)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(git commit*)",
        "hooks": [{
          "type": "command",
          "command": ".claude/hooks/pre-commit.sh"
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "command": ".claude/hooks/lint-on-save.sh"
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
echo "  Rules:     $(ls .claude/rules/*.md 2>/dev/null | wc -l | tr -d ' ') files"
echo "  Commands:  $(ls .claude/commands/*.md 2>/dev/null | wc -l | tr -d ' ') files"
echo "  Hooks:     $(ls .claude/hooks/*.sh 2>/dev/null | wc -l | tr -d ' ') scripts"
echo "  Examples:  $(find .claude/examples -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ') directories"
echo "  Settings:  $([ -f .claude/settings.json ] && echo 'yes (permissions + hooks)' || echo 'no')"
echo "  CLAUDE.md:           $([ -f CLAUDE.md ] && echo 'present' || echo 'skipped')"
echo "  FOLDER-STRUCTURE.md: $([ -f FOLDER-STRUCTURE.md ] && echo 'present' || echo 'skipped')"
echo ""
echo "  Skills:   /scaffold  /bootstrap  /fix-issue  /add-field  /add-endpoint  /write-tests  /test-endpoint  /review-migration  /create-pr  /refactor"
echo "  Commands: /deploy  /pr-review  /build-fix"
echo ""
echo "  Usage: cd $(pwd) && claude"
