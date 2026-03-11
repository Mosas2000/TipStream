#!/bin/bash
set -euo pipefail

# Verify that the repository does not contain leaked secrets.
# Intended for local use and CI pipelines.
#
# Usage:  ./scripts/verify-no-secrets.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

ERRORS=0

echo "=== TipStream Secret Verification ==="
echo ""

# 1. Mainnet.toml must not be tracked
if git ls-files --error-unmatch settings/Mainnet.toml &>/dev/null; then
    echo -e "${RED}FAIL: settings/Mainnet.toml is tracked by git${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}PASS: settings/Mainnet.toml is not tracked${NC}"
fi

# 2. Testnet.toml must not be tracked
if git ls-files --error-unmatch settings/Testnet.toml &>/dev/null; then
    echo -e "${RED}FAIL: settings/Testnet.toml is tracked by git${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}PASS: settings/Testnet.toml is not tracked${NC}"
fi

# 3. No .env file tracked
if git ls-files --error-unmatch .env &>/dev/null; then
    echo -e "${RED}FAIL: .env is tracked by git${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}PASS: .env is not tracked${NC}"
fi

# 4. Scan tracked files for mnemonic-like patterns
MNEMONIC_HITS=$(git grep -l 'mnemonic\s*=\s*"[a-z]\+ [a-z]\+ [a-z]\+' -- ':!settings/Devnet.toml' ':!*.example' ':!*.md' ':!scripts/hooks/*' ':!.gitleaks.toml' 2>/dev/null || true)
if [ -n "$MNEMONIC_HITS" ]; then
    echo -e "${RED}FAIL: mnemonic patterns found in tracked files:${NC}"
    echo "$MNEMONIC_HITS"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}PASS: no mnemonic patterns in tracked files${NC}"
fi

# 5. Scan tracked files for private key patterns (64-hex)
KEY_HITS=$(git grep -lE '(secret_key|private_key)\s*[:=]\s*[0-9a-f]{64}' -- ':!settings/Devnet.toml' ':!*.example' ':!*.md' ':!.gitleaks.toml' 2>/dev/null || true)
if [ -n "$KEY_HITS" ]; then
    echo -e "${RED}FAIL: private key patterns found in tracked files:${NC}"
    echo "$KEY_HITS"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}PASS: no private key patterns in tracked files${NC}"
fi

# 6. Check that .gitignore entries exist
for PATTERN in "settings/Mainnet.toml" "settings/Testnet.toml" ".env"; do
    if ! grep -qF "$PATTERN" .gitignore 2>/dev/null; then
        echo -e "${RED}FAIL: $PATTERN is missing from .gitignore${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done
echo -e "${GREEN}PASS: .gitignore contains expected credential patterns${NC}"

echo ""
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}$ERRORS issue(s) found. Fix them before pushing.${NC}"
    exit 1
else
    echo -e "${GREEN}All checks passed.${NC}"
fi
