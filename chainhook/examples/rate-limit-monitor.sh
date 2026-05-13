#!/bin/bash
# Monitor rate limit metrics in real-time

set -e

CHAINHOOK_URL="${CHAINHOOK_URL:-http://localhost:3100}"
METRICS_AUTH_TOKEN="${METRICS_AUTH_TOKEN:-}"
INTERVAL="${1:-5}"

if [ -z "$METRICS_AUTH_TOKEN" ]; then
  echo "Warning: METRICS_AUTH_TOKEN not set, metrics endpoint may require authentication"
fi

echo "Monitoring rate limit metrics (refresh every ${INTERVAL}s)"
echo "Press Ctrl+C to stop"
echo

while true; do
  clear
  echo "=== Rate Limit Metrics ==="
  echo "Time: $(date)"
  echo

  if [ -n "$METRICS_AUTH_TOKEN" ]; then
    METRICS=$(curl -s "${CHAINHOOK_URL}/metrics" \
      -H "Authorization: Bearer ${METRICS_AUTH_TOKEN}")
  else
    METRICS=$(curl -s "${CHAINHOOK_URL}/metrics")
  fi

  echo "Rate Limit Violations:"
  echo "$METRICS" | grep -E "rate_limit" || echo "  No rate limit metrics found"
  
  echo
  echo "Request Metrics:"
  echo "$METRICS" | grep -E "requests_total|requests_failed" || echo "  No request metrics found"
  
  echo
  echo "Current Configuration:"
  if [ -n "$CHAINHOOK_AUTH_TOKEN" ]; then
    curl -s "${CHAINHOOK_URL}/api/admin/rate-limit" \
      -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
      | jq '.' 2>/dev/null || echo "  Unable to fetch configuration"
  else
    echo "  Set CHAINHOOK_AUTH_TOKEN to view configuration"
  fi

  sleep "$INTERVAL"
done
