#!/bin/sh
# Shared by the git hooks. Usage: run-app-checks.sh <script-name> <changed-files>
#
# For each app folder with changes (backend/, frontend/, …) whose package.json defines
# <script-name>, runs that script and fails if it fails. Apps opt in just by adding the script,
# so a rewritten frontend needs no hook changes: add "check:commit" / "check:push" to it.
set -u

script="$1"
changed="$2"
root="$(git rev-parse --show-toplevel)"
failed=0

for app in $(printf '%s\n' "$changed" | grep '/' | cut -d/ -f1 | sort -u); do
    manifest="$root/$app/package.json"
    [ -f "$manifest" ] || continue
    grep -q "\"$script\"" "$manifest" || continue

    # Use the app's own package manager.
    if [ -f "$root/$app/bun.lock" ]; then runner="bun run"; else runner="npm run --silent"; fi
    tool="${runner%% *}"
    if ! command -v "$tool" >/dev/null 2>&1; then
        echo "✗ $app: '$tool' is not installed, so its checks can't run." >&2
        failed=1
        continue
    fi

    echo "▶ $app: $script"
    if ! (cd "$root/$app" && $runner "$script"); then
        echo "✗ $app: $script failed." >&2
        failed=1
    fi
done

exit "$failed"
