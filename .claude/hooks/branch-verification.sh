#!/usr/bin/env bash
# Hook: block source edits on main/master (admin repo version).
# Type: PreToolUse (Edit|Write). Exit 2 = block, exit 0 = allow.
# Adapted from the app's hook: admin source lives in src/ and scripts/, and
# upstream/ is skipped here because upstream-readonly.sh blocks it outright.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { console.log(JSON.parse(d).tool_input?.file_path || ''); } catch { console.log(''); }
  });
")
FILE_PATH=$(echo "$FILE_PATH" | sed 's|\\|/|g')
# Windows paths are case-insensitive, so SRC/Main.TSX must match like src/main.tsx.
LOWER_PATH=$(echo "$FILE_PATH" | tr '[:upper:]' '[:lower:]')

case "$LOWER_PATH" in
  */upstream/*) exit 0 ;;
esac

if ! echo "$LOWER_PATH" | grep -qE "/(src|scripts)/.*\.(ts|tsx|js|jsx|mjs|json|css)$"; then
  exit 0
fi

# An inherited GIT_DIR / GIT_WORK_TREE (say, from a git hook or a wrapper) would
# make `git -C` read another repository's branch; clear them the way git's own
# scripts do (git-sh-setup's clear_local_git_env).
unset $(git rev-parse --local-env-vars)

# Resolve the branch from the edited file's directory (worktree-aware), falling
# back to the project root when that directory does not exist yet.
BRANCH=$(git -C "$(dirname "$FILE_PATH")" branch --show-current 2>/dev/null)
if [ -z "$BRANCH" ]; then
  BRANCH=$(git -C "$CLAUDE_PROJECT_DIR" branch --show-current 2>/dev/null)
fi

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "You are editing source files on '$BRANCH'. Create a feature branch first." >&2
  exit 2
fi
exit 0
