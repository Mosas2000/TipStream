#!/usr/bin/env bash
# scripts/audit-post-conditions.sh
#
# Fail if any JavaScript or TypeScript source file uses
# PostConditionMode.Allow outside of test fixtures.
#
# Run locally:   bash scripts/audit-post-conditions.sh
# CI integration: see .github/workflows/ci.yml

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Directories to scan
DIRS=(
    "$ROOT/frontend/src"
    "$ROOT/scripts"
    "$ROOT/chainhook"
)

# Patterns that indicate Allow mode usage
PATTERNS=(
    "PostConditionMode\.Allow"
    "postConditionMode.*Allow"
    "PostConditionMode\[.Allow.\]"
)

FOUND=0

for dir in "${DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        continue
    fi

    for pattern in "${PATTERNS[@]}"; do
        # Exclude test files and comment-only lines (JSDoc, //, #)
        # The grep -n output format is "file:line: content", so filter on content after the second colon
        MATCHES=$(grep -rn --include='*.js' --include='*.jsx' --include='*.ts' --include='*.tsx' \
            -E "$pattern" "$dir" \
            | grep -v '__test__\|\.test\.\|\.spec\.\|test/\|\.eslintrc' \
            | grep -v ':[[:space:]]*//' \
            | grep -v ':[[:space:]]*\*' \
            | grep -v ':[[:space:]]*/\*' \
            | grep -v "message:.*Allow" || true)

        if [ -n "$MATCHES" ]; then
            echo "ERROR: Found PostConditionMode.Allow usage:"
            echo "$MATCHES"
            FOUND=1
        fi
    done
done

if [ "$FOUND" -eq 1 ]; then
    echo ""
    echo "PostConditionMode.Allow is banned in production code."
    echo "Use PostConditionMode.Deny with explicit post conditions."
    echo "See docs/POST-CONDITION-GUIDE.md for details."
    exit 1
fi

echo "Post-condition audit passed: no Allow mode usage found."
exit 0
