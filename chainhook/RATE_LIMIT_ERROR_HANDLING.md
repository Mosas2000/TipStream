# Rate Limit Configuration Error Handling

## Error Responses

### 400 Bad Request

Returned when configuration parameters are invalid.

**Causes**:
- `maxRequests` out of range (not between 1 and 10000)
- `windowMs` out of range (not between 1000 and 3600000)
- Missing required parameters
- Invalid JSON in request body
- Non-numeric parameter values

**Example Response**:
```json
{
  "error": "bad_request",
  "message": "maxRequests must be between 1 and 10000",
  "request_id": "abc-123"
}
```

**Resolution**:
- Check parameter values are within valid ranges
- Ensure both `maxRequests` and `windowMs` are provided
- Verify JSON is properly formatted
- Confirm values are numbers, not strings

### 401 Unauthorized

Returned when authentication fails.

**Causes**:
- Missing Authorization header
- Invalid token
- Malformed Authorization header
- Token mismatch

**Example Response**:
```json
{
  "error": "unauthorized",
  "message": "unauthorized",
  "request_id": "abc-123"
}
```

**Resolution**:
- Verify `CHAINHOOK_AUTH_TOKEN` is set correctly
- Check Authorization header format: `Bearer <token>`
- Ensure token matches server configuration
- Confirm token is not expired or revoked

### 404 Not Found

Returned when endpoint path is incorrect.

**Causes**:
- Incorrect URL path
- Typo in endpoint name
- Wrong HTTP method

**Example Response**:
```json
{
  "error": "not found",
  "path": "/api/admin/rate-limits"
}
```

**Resolution**:
- Verify endpoint path is correct
- Check HTTP method (GET or POST)
- Confirm server is running and accessible

### 500 Internal Server Error

Returned when server encounters unexpected error.

**Causes**:
- Server malfunction
- Unexpected exception
- Resource exhaustion

**Example Response**:
```json
{
  "error": "internal_error",
  "message": "internal server error",
  "request_id": "abc-123"
}
```

**Resolution**:
- Check server logs for details
- Verify server health via /health endpoint
- Contact system administrator
- Report bug if reproducible

## Error Handling Best Practices

### Client-Side

1. **Always Check Status Code**
```bash
response=$(curl -s -w "\n%{http_code}" -X POST \
  http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 50, "windowMs": 30000}')

status=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$status" -eq 200 ]; then
  echo "Success: $body"
else
  echo "Error ($status): $body"
fi
```

2. **Parse Error Messages**
```bash
error_msg=$(echo "$body" | jq -r '.message')
request_id=$(echo "$body" | jq -r '.request_id')
echo "Error: $error_msg (Request ID: $request_id)"
```

3. **Implement Retry Logic**
```bash
max_retries=3
retry_count=0

while [ $retry_count -lt $max_retries ]; do
  response=$(curl -s -w "\n%{http_code}" ...)
  status=$(echo "$response" | tail -n1)
  
  if [ "$status" -eq 200 ]; then
    break
  fi
  
  retry_count=$((retry_count + 1))
  sleep 2
done
```

### Server-Side

1. **Log All Errors**
- All errors are logged with request ID
- Include context (IP, parameters, etc.)
- Use appropriate log levels

2. **Return Detailed Messages**
- Validation errors include specific field
- Error messages are actionable
- Request ID included for tracking

3. **Maintain Audit Trail**
- Configuration changes logged
- Failed attempts logged
- Unauthorized access logged

## Common Error Scenarios

### Scenario 1: Invalid Parameter Range

**Request**:
```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 20000, "windowMs": 60000}'
```

**Response**:
```json
{
  "error": "bad_request",
  "message": "maxRequests must be between 1 and 10000",
  "request_id": "abc-123"
}
```

**Fix**: Use value within range (1-10000)

### Scenario 2: Missing Authentication

**Request**:
```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 50, "windowMs": 30000}'
```

**Response**:
```json
{
  "error": "unauthorized",
  "message": "unauthorized",
  "request_id": "abc-123"
}
```

**Fix**: Add Authorization header with valid token

### Scenario 3: Malformed JSON

**Request**:
```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{maxRequests: 50, windowMs: 30000}'
```

**Response**:
```json
{
  "error": "bad_request",
  "message": "invalid payload",
  "request_id": "abc-123"
}
```

**Fix**: Use proper JSON syntax with quoted keys

### Scenario 4: Missing Required Field

**Request**:
```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 50}'
```

**Response**:
```json
{
  "error": "bad_request",
  "message": "windowMs must be a number",
  "request_id": "abc-123"
}
```

**Fix**: Include both maxRequests and windowMs

## Debugging Tips

### Enable Verbose Logging

```bash
curl -v -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 50, "windowMs": 30000}'
```

### Check Server Logs

```bash
tail -f /var/log/chainhook.log | grep -E "(rate.limit|error)"
```

### Verify Server Health

```bash
curl http://localhost:3100/health
```

### Test with Valid Request

```bash
# Known good configuration
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 100, "windowMs": 60000}'
```

## Error Recovery

### Automatic Recovery

The service automatically recovers from:
- Invalid configuration attempts (rejected, no state change)
- Authentication failures (no impact on service)
- Malformed requests (logged and rejected)

### Manual Recovery

If configuration becomes problematic:

1. **Revert to Known Good Configuration**
```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 100, "windowMs": 60000}'
```

2. **Restart Service** (reverts to environment variables)
```bash
systemctl restart chainhook
```

3. **Check Current Configuration**
```bash
curl http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}"
```

## Monitoring and Alerts

### Set Up Alerts For

- High rate of 400 errors (configuration issues)
- 401 errors (unauthorized access attempts)
- 500 errors (server problems)
- Repeated failed configuration attempts

### Monitor Metrics

```bash
curl http://localhost:3100/metrics \
  -H "Authorization: Bearer ${METRICS_AUTH_TOKEN}" \
  | grep -E "(requests_failed|error)"
```

## Support

If errors persist:

1. Check server logs for detailed error messages
2. Verify network connectivity
3. Confirm authentication tokens are correct
4. Review recent configuration changes
5. Contact system administrator with request ID
