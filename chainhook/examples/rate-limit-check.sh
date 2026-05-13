#!/bin/bash
# Check current rate limit configuration

set -e

CHAINHOOK_URL="${CHAINHOOK_URL:-http://localhost:3100}"
AUTH_TOKEN="${CHAINHOOK_AUTH_TOKEN:-}"

if [ -z "$AUTH_TOKEN" ]; then
  echo "Error: CHAINHOOK_AUTH_TOKEN environment variable is required"
  exit 1
fi

echo "Checking rate limit configuration..."
echo

curl -s "${CHAINHOOK_URL}/api/admin/rate-limit" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  | jq '.'

echo
echo "Configuration retrieved successfully"
