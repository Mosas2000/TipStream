# Rate Limit Configuration Validation

## Overview

Comprehensive validation for rate limit configuration parameters to prevent service instability from invalid values.

## Validation Rules

### Type Validation

All configuration parameters must be:
- **Numbers**: Not strings, objects, or other types
- **Finite**: Not `Infinity` or `-Infinity`
- **Not NaN**: Must be valid numeric values
- **Integers**: No decimal values allowed

### Range Validation

#### maxRequests
- **Minimum**: 1 request per window
- **Maximum**: 10,000 requests per window
- **Rationale**: Values below 1 would block all traffic; values above 10,000 could indicate misconfiguration

#### windowMs
- **Minimum**: 1,000ms (1 second)
- **Maximum**: 3,600,000ms (1 hour)
- **Rationale**: Windows shorter than 1 second are impractical; windows longer than 1 hour defeat the purpose of rate limiting

## Validation Points

### 1. Startup Validation

Rate limit configuration is validated when the server starts:

```javascript
// Environment variables are parsed and validated
const ipRateLimitConfig = parseRateLimitEnv(
  process.env.RATE_LIMIT_MAX_REQUESTS || "100",
  process.env.RATE_LIMIT_WINDOW_MS || "60000",
  "IP rate limit"
);
```

**Behavior**: Server fails to start with clear error message if configuration is invalid.

### 2. Constructor Validation

Both `RateLimiter` and `AddressRateLimiter` validate parameters in their constructors:

```javascript
const limiter = new RateLimiter(maxRequests, windowMs);
// Throws: Error: Invalid rate limit configuration: <specific error>
```

### 3. Runtime Update Validation

The `updateConfig()` method validates new values before applying them:

```javascript
limiter.updateConfig(newMaxRequests, newWindowMs);
// Throws: Error: Invalid rate limit configuration: <specific error>
```

## Error Messages

All validation errors include specific, actionable messages:

- `"maxRequests must be a number"` - Type error
- `"maxRequests must be a finite number"` - Infinity or -Infinity provided
- `"maxRequests must be an integer"` - Decimal value provided
- `"maxRequests must be at least 1"` - Value too low
- `"maxRequests must not exceed 10000"` - Value too high
- `"windowMs must be at least 1000ms (1 second)"` - Window too short
- `"windowMs must not exceed 3600000ms (1 hour)"` - Window too long

## Configuration Constants

Validation bounds are exported as constants for testing and documentation:

```javascript
export const RATE_LIMIT_BOUNDS = {
  MAX_REQUESTS_MIN: 1,
  MAX_REQUESTS_MAX: 10000,
  WINDOW_MS_MIN: 1000,
  WINDOW_MS_MAX: 3600000,
};
```

## Environment Variables

### Required Format

All rate limit environment variables must be:
- Valid integer strings (e.g., `"100"`, `"60000"`)
- Within the acceptable ranges
- Not empty or whitespace-only

### Example Configuration

```bash
# IP-based rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Address-based rate limiting
ADDRESS_RATE_LIMIT_MAX_REQUESTS=50
ADDRESS_RATE_LIMIT_WINDOW_MS=60000
```

### Invalid Examples

```bash
# These will cause startup failure:
RATE_LIMIT_MAX_REQUESTS=0           # Below minimum
RATE_LIMIT_MAX_REQUESTS=20000       # Above maximum
RATE_LIMIT_WINDOW_MS=500            # Below minimum (1 second)
RATE_LIMIT_WINDOW_MS=7200000        # Above maximum (1 hour)
RATE_LIMIT_MAX_REQUESTS=100.5       # Not an integer
RATE_LIMIT_MAX_REQUESTS=invalid     # Not a number
```

## API Validation

The `/api/admin/rate-limit` endpoint validates configuration updates:

```bash
# Valid update
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 200, "windowMs": 120000}'

# Invalid update (returns 400 Bad Request)
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 0, "windowMs": 60000}'
```

## Testing

Comprehensive test coverage includes:
- Type validation (number, finite, integer)
- Range validation (min/max boundaries)
- Constructor validation
- Runtime update validation
- Environment variable parsing
- Error message accuracy

Run tests:
```bash
npm test -- rate-limit.test.js
```

## Migration Notes

### Breaking Changes

If you have existing configurations with:
- Window values less than 1000ms
- Window values greater than 3600000ms
- Decimal values for maxRequests or windowMs
- Values outside the acceptable ranges

You must update them to valid values before upgrading.

### Recommended Values

For most applications:
- **IP rate limit**: 100 requests per 60 seconds
- **Address rate limit**: 50 requests per 60 seconds

For high-traffic applications:
- **IP rate limit**: 1000 requests per 60 seconds
- **Address rate limit**: 500 requests per 60 seconds

For development/testing:
- **IP rate limit**: 10000 requests per 60 seconds
- **Address rate limit**: 10000 requests per 60 seconds

## Benefits

1. **Fail Fast**: Invalid configurations are caught at startup, not during runtime
2. **Clear Errors**: Specific error messages make debugging easy
3. **Type Safety**: Prevents common mistakes like passing strings instead of numbers
4. **Range Safety**: Prevents extreme values that could cause service issues
5. **Consistent Validation**: Same rules apply at startup, construction, and runtime updates
