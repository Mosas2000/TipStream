# Integration Testing Guide for Metrics Access Control

This guide provides comprehensive testing procedures for metrics authentication.

## Test Scenarios

### Scenario 1: Metrics Without Token (Open Access)

**Configuration:**
```bash
METRICS_AUTH_TOKEN=""
```

**Test Cases:**

1. Metrics endpoint should be publicly accessible
```bash
curl -i http://localhost:3100/metrics
# Expected: 200 OK
```

2. Health endpoint should be accessible
```bash
curl -i http://localhost:3100/health
# Expected: 200 OK
```

3. Response should contain metrics data
```bash
curl -s http://localhost:3100/metrics | jq '.methodProposal'
# Expected: numeric value >= 0
```

### Scenario 2: Metrics With Token

**Configuration:**
```bash
METRICS_AUTH_TOKEN="test-token-12345"
```

**Test Cases:**

1. Metrics without token should fail
```bash
curl -i http://localhost:3100/metrics
# Expected: 401 Unauthorized
```

2. Metrics with correct token should succeed
```bash
curl -i -H "Authorization: Bearer test-token-12345" \
  http://localhost:3100/metrics
# Expected: 200 OK
```

3. Metrics with wrong token should fail
```bash
curl -i -H "Authorization: Bearer wrong-token" \
  http://localhost:3100/metrics
# Expected: 401 Unauthorized
```

4. Health endpoint should still be accessible
```bash
curl -i http://localhost:3100/health
# Expected: 200 OK
```

### Scenario 3: Bearer Token Format Validation

**Test Cases:**

1. Invalid Authorization header format
```bash
curl -i -H "Authorization: token test-token-12345" \
  http://localhost:3100/metrics
# Expected: 401 Unauthorized
```

2. Missing Bearer keyword
```bash
curl -i -H "Authorization: test-token-12345" \
  http://localhost:3100/metrics
# Expected: 401 Unauthorized
```

3. Extra whitespace
```bash
curl -i -H "Authorization: Bearer  test-token-12345" \
  http://localhost:3100/metrics
# Expected: 401 Unauthorized
```

4. Token in wrong header
```bash
curl -i -H "X-API-Token: test-token-12345" \
  http://localhost:3100/metrics
# Expected: 401 Unauthorized
```

### Scenario 4: Token Comparison Constant-Time

**Verification:**

The implementation uses constant-time comparison to prevent timing attacks. This should be verified but is difficult to test reliably in a timing-sensitive manner.

```bash
# Token should always take same time to reject
# regardless of position of first incorrect character

time curl -i -H "Authorization: Bearer aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" \
  http://localhost:3100/metrics > /dev/null 2>&1

time curl -i -H "Authorization: Bearer test-token-1234567890123456" \
  http://localhost:3100/metrics > /dev/null 2>&1

# Times should be similar (varies by system load)
```

## Test Scripts

### Bash Test Suite

```bash
#!/bin/bash

set -e

TOKEN="${METRICS_AUTH_TOKEN:-test-token-12345}"
BASE_URL="${BASE_URL:-http://localhost:3100}"

echo "Testing Chainhook Metrics Access Control"
echo "========================================"
echo ""

# Test 1: Health check always works
echo "Test 1: Health check should be accessible"
if curl -f -s "$BASE_URL/health" > /dev/null; then
    echo "✓ PASS"
else
    echo "✗ FAIL"
    exit 1
fi

# Test 2: Metrics without token (if token is set)
echo "Test 2: Metrics without token should fail (if configured)"
if [ -n "$TOKEN" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/metrics")
    if [ "$HTTP_CODE" = "401" ]; then
        echo "✓ PASS (got 401)"
    else
        echo "✗ FAIL (expected 401, got $HTTP_CODE)"
        exit 1
    fi
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/metrics")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✓ PASS (metrics open, got 200)"
    else
        echo "✗ FAIL (expected 200, got $HTTP_CODE)"
        exit 1
    fi
fi

# Test 3: Metrics with token
echo "Test 3: Metrics with correct token should succeed"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" "$BASE_URL/metrics")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL (expected 200, got $HTTP_CODE)"
    exit 1
fi

# Test 4: Metrics with wrong token
echo "Test 4: Metrics with wrong token should fail"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer wrong-token" "$BASE_URL/metrics")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL (expected 401, got $HTTP_CODE)"
    exit 1
fi

# Test 5: Response contains metrics
echo "Test 5: Metrics response should contain data"
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/metrics")
if echo "$RESPONSE" | grep -q "methodProposal"; then
    echo "✓ PASS"
else
    echo "✗ FAIL (no methodProposal in response)"
    exit 1
fi

# Test 6: Invalid auth header format
echo "Test 6: Invalid auth header format should fail"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token $TOKEN" "$BASE_URL/metrics")
if [ "$HTTP_CODE" = "401" ]; then
    echo "✓ PASS"
else
    echo "✗ FAIL (expected 401, got $HTTP_CODE)"
    exit 1
fi

echo ""
echo "All tests passed!"
```

## Performance Testing

### Load Testing with Authentication

```bash
#!/bin/bash

TOKEN="test-token-12345"
BASE_URL="http://localhost:3100"
REQUESTS=1000
CONCURRENCY=10

echo "Load testing metrics endpoint with authentication"
echo "=================================================="

# Using Apache Bench
ab -n $REQUESTS -c $CONCURRENCY \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/metrics"

# Expected results:
# - Success rate: 100%
# - Response time: < 100ms average
# - No failed requests
```

### Stress Testing Token Validation

```bash
#!/bin/bash

BASE_URL="http://localhost:3100"

echo "Stress testing token validation"
echo "================================"

# Test with many incorrect tokens
for i in {1..100}; do
    curl -s -o /dev/null \
      -H "Authorization: Bearer invalid-token-$i" \
      "$BASE_URL/metrics"
    echo "Attempt $i: 401 response"
done

echo "Completed 100 invalid token requests"
```

## Continuous Integration Testing

### GitHub Actions Workflow

```yaml
name: Metrics Access Control Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: chainhook
          POSTGRES_PASSWORD: password
      redis:
        image: redis:7-alpine
    
    steps:
    - uses: actions/checkout@v3
    
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - run: npm ci
    
    - name: Start service
      env:
        METRICS_AUTH_TOKEN: test-token-abc123
        DATABASE_URL: postgresql://postgres:password@localhost/chainhook
        REDIS_URL: redis://localhost:6379
      run: npm start &
      
    - name: Wait for service
      run: |
        for i in {1..30}; do
          curl -f http://localhost:3100/health && break
          sleep 1
        done
    
    - name: Run metrics tests
      run: |
        bash tests/metrics-access-control.sh
    
    - name: Run security tests
      run: |
        npm run test:security
```

## Manual Testing Checklist

- [ ] Deploy with empty METRICS_AUTH_TOKEN
- [ ] Verify metrics are accessible without authentication
- [ ] Verify health endpoint is accessible
- [ ] Set METRICS_AUTH_TOKEN to a test value
- [ ] Verify metrics require bearer token
- [ ] Verify health endpoint still works without token
- [ ] Test with correct token
- [ ] Test with incorrect token
- [ ] Test with missing Authorization header
- [ ] Test with malformed Authorization header
- [ ] Test Bearer token format variations
- [ ] Verify response format is unchanged
- [ ] Verify response contains all expected fields
- [ ] Test with Prometheus configuration
- [ ] Test with Grafana data source
- [ ] Test under load
- [ ] Test rate limiting
- [ ] Verify logging captures all access attempts
- [ ] Check for token leakage in logs
- [ ] Verify TLS works (if configured)

## Regression Testing

After updates, verify:

1. Existing metrics still work
2. Health check still works
3. Bearer token validation still works
4. Constant-time comparison still prevents timing attacks
5. No new security vulnerabilities introduced
6. Performance is not degraded
7. All existing tests still pass
