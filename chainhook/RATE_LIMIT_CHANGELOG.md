# Rate Limit Configuration Changelog

## Version 1.1.0 - Runtime Reconfiguration

### Added

- Runtime rate limit reconfiguration via admin API endpoints
- `GET /api/admin/rate-limit` endpoint to retrieve current configuration
- `POST /api/admin/rate-limit` endpoint to update configuration
- Validation for rate limit parameters (maxRequests: 1-10000, windowMs: 1000-3600000)
- Configuration change logging for audit trail
- Management scripts for common operations
- Comprehensive documentation and runbooks

### Changed

- Rate limiter now supports dynamic configuration updates
- Configuration changes apply immediately without restart
- Previous configuration is returned when updating

### Security

- Admin endpoints require authentication token
- All configuration changes are logged
- Invalid parameters are rejected with detailed error messages

## Implementation Details

### API Endpoints

#### GET /api/admin/rate-limit

Returns current rate limit configuration.

**Authentication**: Required (CHAINHOOK_AUTH_TOKEN)

**Response**:
```json
{
  "maxRequests": 100,
  "windowMs": 60000,
  "windowSeconds": 60
}
```

#### POST /api/admin/rate-limit

Updates rate limit configuration at runtime.

**Authentication**: Required (CHAINHOOK_AUTH_TOKEN)

**Request**:
```json
{
  "maxRequests": 50,
  "windowMs": 30000
}
```

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

### Configuration Methods

Added to `RateLimiter` class:

- `updateConfig(maxRequests, windowMs)` - Update configuration at runtime
- `getConfig()` - Retrieve current configuration

### Logging

Configuration changes are logged with INFO level:

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

### Testing

Added comprehensive test coverage:

- Unit tests for configuration methods
- Integration tests for API endpoints
- Authentication tests for security
- Validation tests for parameter ranges

### Documentation

- RATE_LIMIT_RUNTIME_CONFIG.md - Complete API documentation
- RATE_LIMIT_RUNBOOK.md - Operations runbook
- DEPLOYMENT.md - Updated with runtime configuration guidance
- README.md - Updated with new endpoints

### Scripts

- rate-limit-check.sh - Check current configuration
- rate-limit-update.sh - Update configuration
- rate-limit-incident-response.sh - Automated incident response

## Migration Guide

### For Operators

No migration required. The feature is backward compatible:

1. Existing environment variables continue to work
2. Default behavior unchanged
3. New endpoints are opt-in

### For Monitoring

Add alerts for:

- Rate limit configuration changes
- Unauthorized configuration attempts
- Invalid configuration requests

### For Automation

Use new endpoints in incident response automation:

```bash
# Check configuration
curl http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}"

# Update configuration
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 50, "windowMs": 30000}'
```

## Breaking Changes

None. This is a backward-compatible addition.

## Deprecations

None.

## Known Limitations

- Configuration changes are not persisted across restarts
- No built-in configuration history
- No per-IP configuration support
- No automatic rollback mechanism

## Future Enhancements

Potential future improvements:

- Configuration persistence to database
- Configuration history and audit log
- Per-IP or per-route rate limits
- Automatic rate limit adjustment based on load
- Integration with external configuration management
- Webhook notifications for configuration changes
