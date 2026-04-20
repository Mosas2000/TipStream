#!/bin/bash

# Chainhook Metrics Validation Script
# Validates bearer token authentication for metrics endpoint

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BASE_URL="${1:-http://localhost:3100}"
TOKEN="${METRICS_AUTH_TOKEN:-}"

echo "Chainhook Metrics Validation Script"
echo "===================================="
echo "Base URL: $BASE_URL"
echo "Token configured: $([ -n "$TOKEN" ] && echo 'yes' || echo 'no')"
echo ""

# Function to print results
pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  exit 1
}

warn() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

# Test 1: Health endpoint
echo -n "Test 1: Health endpoint is accessible... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$HTTP_CODE" = "200" ]; then
  pass "health endpoint returns 200"
else
  fail "health endpoint returned $HTTP_CODE (expected 200)"
fi

# Test 2: Health check returns valid JSON
echo -n "Test 2: Health check returns valid JSON... "
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | jq . > /dev/null 2>&1; then
  pass "health endpoint returns valid JSON"
else
  fail "health endpoint did not return valid JSON"
fi

# Test 3: Health check contains required fields
echo -n "Test 3: Health check contains required fields... "
if echo "$HEALTH" | jq -e '.ok and .blockHeight and .lastUpdated' > /dev/null; then
  pass "health check contains ok, blockHeight, lastUpdated"
else
  fail "health check missing required fields"
fi

# Test 4: Metrics endpoint without token
echo -n "Test 4: Metrics endpoint without token... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/metrics")
if [ -n "$TOKEN" ]; then
  if [ "$HTTP_CODE" = "401" ]; then
    pass "metrics returns 401 when token required"
  else
    fail "metrics returned $HTTP_CODE (expected 401 when token configured)"
  fi
else
  if [ "$HTTP_CODE" = "200" ]; then
    pass "metrics publicly accessible (no token configured)"
  else
    fail "metrics returned $HTTP_CODE (expected 200)"
  fi
fi

# Test 5: Metrics endpoint with token
if [ -n "$TOKEN" ]; then
  echo -n "Test 5: Metrics endpoint with valid token... "
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" "$BASE_URL/metrics")
  if [ "$HTTP_CODE" = "200" ]; then
    pass "metrics returns 200 with valid token"
  else
    fail "metrics returned $HTTP_CODE (expected 200)"
  fi

  # Test 6: Metrics endpoint with invalid token
  echo -n "Test 6: Metrics endpoint with invalid token... "
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer invalid-token" "$BASE_URL/metrics")
  if [ "$HTTP_CODE" = "401" ]; then
    pass "metrics returns 401 with invalid token"
  else
    fail "metrics returned $HTTP_CODE (expected 401)"
  fi
fi

# Test 7: Metrics returns valid JSON
if [ "$HTTP_CODE" = "200" ]; then
  echo -n "Test 7: Metrics returns valid JSON... "
  if [ -n "$TOKEN" ]; then
    METRICS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/metrics")
  else
    METRICS=$(curl -s "$BASE_URL/metrics")
  fi
  
  if echo "$METRICS" | jq . > /dev/null 2>&1; then
    pass "metrics endpoint returns valid JSON"
  else
    fail "metrics endpoint did not return valid JSON"
  fi

  # Test 8: Metrics contains expected fields
  echo -n "Test 8: Metrics contains required fields... "
  if echo "$METRICS" | jq -e '.methodProposal and .eventsIndexed and .lastIndexTime' > /dev/null; then
    pass "metrics contains methodProposal, eventsIndexed, lastIndexTime"
  else
    fail "metrics missing required fields"
  fi
fi

# Test 9: Bearer token format validation
echo -n "Test 9: Bearer token format validation... "
if [ -n "$TOKEN" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: token $TOKEN" "$BASE_URL/metrics")
  if [ "$HTTP_CODE" = "401" ]; then
    pass "invalid bearer format (token instead of Bearer) returns 401"
  else
    fail "expected 401 for invalid bearer format"
  fi
fi

# Test 10: Response time acceptable
echo -n "Test 10: Checking response time... "
START=$(date +%s%N)
if [ -n "$TOKEN" ]; then
  curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/metrics" > /dev/null
else
  curl -s "$BASE_URL/metrics" > /dev/null
fi
END=$(date +%s%N)
ELAPSED=$((($END - $START) / 1000000))  # Convert nanoseconds to milliseconds

if [ $ELAPSED -lt 1000 ]; then
  pass "response time is ${ELAPSED}ms (< 1000ms)"
else
  warn "response time is ${ELAPSED}ms (> 1000ms)"
fi

echo ""
echo "All tests completed successfully!"
echo ""

# Print summary
echo "Validation Summary:"
echo "==================="
if [ -n "$TOKEN" ]; then
  echo "✓ Metrics authentication is ENABLED"
  echo "  - Metrics require bearer token"
  echo "  - Health check is always accessible"
  echo "  - Token validation is working correctly"
else
  echo "⚠ Metrics authentication is DISABLED"
  echo "  - Metrics are publicly accessible"
  echo "  - Consider enabling authentication for production"
fi

echo ""
echo "Health check status:"
curl -s "$BASE_URL/health" | jq '.'
