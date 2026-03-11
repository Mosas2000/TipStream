#!/bin/bash
set -euo pipefail

# Install project git hooks.
# Run once after cloning:  ./scripts/setup-hooks.sh

HOOK_SRC="scripts/hooks/pre-commit"
HOOK_DST=".git/hooks/pre-commit"

if [ ! -d ".git" ]; then
    echo "Error: run this script from the repository root."
    exit 1
fi

if [ ! -f "$HOOK_SRC" ]; then
    echo "Error: $HOOK_SRC not found."
    exit 1
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"
echo "Installed pre-commit hook at $HOOK_DST"
