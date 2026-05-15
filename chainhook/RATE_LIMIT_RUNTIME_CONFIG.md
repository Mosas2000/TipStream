# Runtime Rate Limit Reconfiguration

## Overview

The chainhook server supports runtime reconfiguration of rate limiting parameters without requiring a restart. This enables rapid incident response when ingress patterns change.

## Configuration Endpoints

### GET /api/admin/rate-limit

Retrieve the current rate limit configuration.

**Authentication**: Requires `CHAINHOOK_AUTH_TOKEN` if configured

**Response**:
```json
{
  "maxRequests": 100,
  "windowMs": 60000,
  "windowSeconds": 60
}
```

### POST /api/admin/rate-limit

Update the rate limit configuration at runtime.

**Authentication**: Requires `CHAINHOOK_AUTH_TOKEN` if configured

**Request Body**:
```json
{
  "maxRequests": 50,
  "windowMs": 30000
}
```

**Validation**:
- `maxRequests`: Must be between 1 and 10000
- `windowMs`: Must be between 1000 (1 second) and 3600000 (1 hour)

**Response**:
```json
{
  "ok": true,
  "previous": {
    "maxRequests": 100,
    "windowMs": 60000
  },
  "current": {
    "maxRequests": 50,
    "windowMs": 30000,
    "windowSeconds": 30
  }
}
```

## Usage Examples

### Check Current Configuration

```bash
curl http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer your-token-here"
```

### Tighten Rate Limits During Attack

```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "maxRequests": 10,
    "windowMs": 60000
  }'
```

### Relax Rate Limits After Incident

```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "maxRequests": 200,
    "windowMs": 60000
  }'
```

## Incident Response Workflow

1. **Detect Anomaly**: Monitor metrics endpoint for rate limit violations
2. **Assess Threat**: Determine if traffic is legitimate or malicious
3. **Adjust Limits**: Use POST endpoint to tighten or relax limits
4. **Verify**: Check GET endpoint to confirm new configuration
5. **Monitor**: Watch metrics to ensure desired effect
6. **Document**: Update environment variables for next restart

## Behavior

- Changes apply immediately to all new requests
- Existing rate limit counters are preserved
- No service restart required
- Configuration is not persisted across restarts
- Default values are loaded from environment variables on startup

## Environment Variables

Set default rate limits at startup:

```bash
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

These values are used when the server starts. Runtime changes override these until the next restart.

## Security Considerations

- Always use authentication tokens in production
- Log all configuration changes for audit trail
- Monitor for unauthorized configuration attempts
- Consider implementing additional authorization for admin endpoints
- Rate limit the admin endpoints themselves to prevent abuse

## Monitoring

The rate limit configuration is logged when changed:

```json
{
  "level": "INFO",
  "message": "Rate limit configuration updated",
  "old_max_requests": 100,
  "old_window_ms": 60000,
  "new_max_requests": 50,
  "new_window_ms": 30000,
  "request_id": "..."
}
```

## Limitations

- Configuration changes are not persisted to disk
- After restart, server reverts to environment variable values
- No built-in configuration history or rollback
- Changes affect all IPs equally (no per-IP configuration)

## Best Practices

1. **Document Changes**: Keep a log of why and when limits were changed
2. **Test First**: Verify new limits in staging before production
3. **Gradual Adjustment**: Make incremental changes rather than drastic ones
4. **Monitor Impact**: Watch metrics after each change
5. **Update Defaults**: After incident, update environment variables to reflect new baseline
6. **Automate Response**: Consider scripting common incident response scenarios
