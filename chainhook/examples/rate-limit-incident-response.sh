#!/bin/bash
# Incident response script for rate limit adjustment

set -e

CHAINHOOK_URL="${CHAINHOOK_URL:-http://localhost:3100}"
AUTH_TOKEN="${CHAINHOOK_AUTH_TOKEN:-}"
SCENARIO="${1:-}"

if [ -z "$AUTH_TOKEN" ]; then
  echo "Error: CHAINHOOK_AUTH_TOKEN environment variable is required"
  exit 1
fi

function show_usage() {
  echo "Usage: $0 <scenario>"
  echo
  echo "Scenarios:"
  echo "  attack     - Tighten limits for DDoS mitigation (10 req/min)"
  echo "  moderate   - Moderate tightening (50 req/min)"
  echo "  normal     - Return to normal limits (100 req/min)"
  echo "  spike      - Handle legitimate traffic spike (200 req/min)"
  echo "  check      - Check current configuration"
  echo
  echo "Examples:"
  echo "  $0 attack    # Respond to DDoS attack"
  echo "  $0 normal    # Return to normal after incident"
  echo "  $0 check     # Check current settings"
  exit 1
}

function update_config() {
  local max_requests=$1
  local window_ms=$2
  local description=$3

  echo "Applying $description..."
  echo "  Max Requests: $max_requests per $(($window_ms / 1000)) seconds"
  echo

  curl -s -X POST "${CHAINHOOK_URL}/api/admin/rate-limit" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"maxRequests\": $max_requests, \"windowMs\": $window_ms}" \
    | jq '.'

  echo
  echo "Configuration updated successfully"
  echo "Previous: $(jq -r '.previous.maxRequests' <<< "$response") req/$(jq -r '.previous.windowMs' <<< "$response")ms"
  echo "Current: $(jq -r '.current.maxRequests' <<< "$response") req/$(jq -r '.current.windowMs' <<< "$response")ms"
}

function check_config() {
  echo "Current rate limit configuration:"
  echo

  curl -s "${CHAINHOOK_URL}/api/admin/rate-limit" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    | jq '.'
}

case "$SCENARIO" in
  attack)
    update_config 10 60000 "DDoS attack mitigation"
    ;;
  moderate)
    update_config 50 60000 "moderate rate limiting"
    ;;
  normal)
    update_config 100 60000 "normal rate limiting"
    ;;
  spike)
    update_config 200 60000 "high traffic allowance"
    ;;
  check)
    check_config
    ;;
  *)
    show_usage
    ;;
esac
