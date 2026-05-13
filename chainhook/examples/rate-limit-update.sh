#!/bin/bash
# Update rate limit configuration

set -e

CHAINHOOK_URL="${CHAINHOOK_URL:-http://localhost:3100}"
AUTH_TOKEN="${CHAINHOOK_AUTH_TOKEN:-}"
MAX_REQUESTS="${1:-}"
WINDOW_MS="${2:-}"

if [ -z "$AUTH_TOKEN" ]; then
  echo "Error: CHAINHOOK_AUTH_TOKEN environment variable is required"
  exit 1
fi

if [ -z "$MAX_REQUESTS" ] || [ -z "$WINDOW_MS" ]; then
  echo "Usage: $0 <maxRequests> <windowMs>"
  echo
  echo "Examples:"
  echo "  $0 50 30000    # 50 requests per 30 seconds"
  echo "  $0 100 60000   # 100 requests per 60 seconds"
  echo "  $0 200 60000   # 200 requests per 60 seconds"
  echo
  echo "Constraints:"
  echo "  maxRequests: 1-10000"
  echo "  windowMs: 1000-3600000 (1 second to 1 hour)"
  exit 1
fi

echo "Updating rate limit configuration..."
echo "  Max Requests: $MAX_REQUESTS"
echo "  Window: $WINDOW_MS ms ($(($WINDOW_MS / 1000)) seconds)"
echo

curl -s -X POST "${CHAINHOOK_URL}/api/admin/rate-limit" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"maxRequests\": $MAX_REQUESTS, \"windowMs\": $WINDOW_MS}" \
  | jq '.'

echo
echo "Configuration updated successfully"
