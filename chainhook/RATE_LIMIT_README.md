# Rate Limiting Module

## Overview

The rate limiting module provides comprehensive request rate limiting for the TipStream chainhook service. It implements both IP-based and address-based rate limiting with configurable limits and whitelist support.

## Features

- **IP-based rate limiting**: Prevents abuse from individual IP addresses
- **Address-based rate limiting**: Prevents wallet-based abuse from users rotating IPs
- **Whitelist support**: Allows trusted addresses to bypass rate limits
- **Runtime configuration**: Update limits without restarting the service
- **Comprehensive validation**: Ensures all configuration values are valid
- **Sliding window algorithm**: Accurate rate limiting with minimal memory overhead

## Components

### RateLimiter

Basic rate limiter for IP addresses using sliding window counters.

```javascript
import { RateLimiter } from './rate-limit.js';

const limiter = new RateLimiter(100, 60000); // 100 requests per 60 seconds

if (limiter.isAllowed(clientIp)) {
  // Process request
} else {
  // Reject request
  const remaining = limiter.getRemaining(clientIp);
  console.log(`Rate limited. ${remaining} requests remaining.`);
}
```

### AddressRateLimiter

Rate limiter for Stacks wallet addresses with whitelist support.

```javascript
import { AddressRateLimiter } from './rate-limit.js';

const limiter = new AddressRateLimiter(
  50,
  60000,
  ['SP1ABC...', 'SP2DEF...'] // Whitelist
);

if (limiter.isAllowed(senderAddress)) {
  // Process tip
} else {
  // Reject tip
}
```

## Configuration

### Environment Variables

```bash
# IP-based rate limiting
RATE_LIMIT_MAX_REQUESTS=100        # Max requests per window
RATE_LIMIT_WINDOW_MS=60000         # Window duration in milliseconds

# Address-based rate limiting
ADDRESS_RATE_LIMIT_MAX_REQUESTS=50
ADDRESS_RATE_LIMIT_WINDOW_MS=60000
ADDRESS_RATE_LIMIT_WHITELIST=SP1ABC...,SP2DEF...
```

### Validation Rules

All configuration values must meet these requirements:

- **maxRequests**: Integer between 1 and 10,000
- **windowMs**: Integer between 1,000 (1 second) and 3,600,000 (1 hour)

Invalid configurations will cause startup failure with clear error messages.

## API

### Validation Functions

#### validateRateLimitConfig(maxRequests, windowMs)

Validates rate limit configuration parameters.

```javascript
const validation = validateRateLimitConfig(100, 60000);
if (!validation.valid) {
  console.error(validation.error);
}
```

Returns:
```javascript
{
  valid: boolean,
  error?: string
}
```

#### isValidRateLimitConfig(maxRequests, windowMs)

Quick validation check without detailed error.

```javascript
if (isValidRateLimitConfig(100, 60000)) {
  // Configuration is valid
}
```

#### parseRateLimitEnv(maxRequestsStr, windowMsStr, configName)

Parses and validates environment variables.

```javascript
const config = parseRateLimitEnv(
  process.env.RATE_LIMIT_MAX_REQUESTS,
  process.env.RATE_LIMIT_WINDOW_MS,
  "IP rate limit"
);
```

Throws on invalid configuration with descriptive error message.

#### formatValidationError(validation, maxRequests, windowMs)

Formats validation errors for logging.

```javascript
const validation = validateRateLimitConfig(0, 60000);
const formatted = formatValidationError(validation, 0, 60000);
console.log(formatted);
// {
//   valid: false,
//   error: "maxRequests must be at least 1",
//   provided: { maxRequests: 0, windowMs: 60000 },
//   bounds: { ... }
// }
```

### RateLimiter Methods

#### constructor(maxRequests, windowMs)

Creates a new rate limiter instance.

```javascript
const limiter = new RateLimiter(100, 60000);
```

Throws if configuration is invalid.

#### isAllowed(ip)

Checks if a request from the given IP should be allowed.

```javascript
if (limiter.isAllowed('192.168.1.1')) {
  // Allow request
}
```

Returns `true` if allowed, `false` if rate limited.

#### getRemaining(ip)

Gets the number of remaining requests for an IP.

```javascript
const remaining = limiter.getRemaining('192.168.1.1');
console.log(`${remaining} requests remaining`);
```

#### updateConfig(maxRequests, windowMs)

Updates rate limit configuration at runtime.

```javascript
limiter.updateConfig(200, 120000);
```

Throws if new configuration is invalid.

#### getConfig()

Gets current configuration.

```javascript
const config = limiter.getConfig();
console.log(config.maxRequests, config.windowMs);
```

#### cleanup()

Removes expired entries to prevent memory leaks.

```javascript
setInterval(() => limiter.cleanup(), 60000);
```

### AddressRateLimiter Methods

All RateLimiter methods plus:

#### isWhitelisted(address)

Checks if an address is whitelisted.

```javascript
if (limiter.isWhitelisted('SP1ABC...')) {
  // Address bypasses rate limits
}
```

#### addToWhitelist(address)

Adds an address to the whitelist.

```javascript
limiter.addToWhitelist('SP1ABC...');
```

#### removeFromWhitelist(address)

Removes an address from the whitelist.

```javascript
limiter.removeFromWhitelist('SP1ABC...');
```

#### getWhitelist()

Gets all whitelisted addresses.

```javascript
const whitelist = limiter.getWhitelist();
console.log(whitelist); // ['SP1ABC...', 'SP2DEF...']
```

## Admin API

### GET /api/admin/rate-limit

Get current IP rate limit configuration.

```bash
curl http://localhost:3100/api/admin/rate-limit
```

Response:
```json
{
  "maxRequests": 100,
  "windowMs": 60000,
  "windowSeconds": 60
}
```

### POST /api/admin/rate-limit

Update IP rate limit configuration.

```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 200, "windowMs": 120000}'
```

Response:
```json
{
  "ok": true,
  "previous": {
    "maxRequests": 100,
    "windowMs": 60000
  },
  "current": {
    "maxRequests": 200,
    "windowMs": 120000,
    "windowSeconds": 120
  }
}
```

### GET /api/admin/address-rate-limit

Get current address rate limit configuration.

### POST /api/admin/address-rate-limit

Update address rate limit configuration.

### POST /api/admin/address-rate-limit/whitelist

Add an address to the whitelist.

```bash
curl -X POST http://localhost:3100/api/admin/address-rate-limit/whitelist \
  -H "Content-Type: application/json" \
  -d '{"address": "SP1ABC..."}'
```

### DELETE /api/admin/address-rate-limit/whitelist

Remove an address from the whitelist.

## Constants

### RATE_LIMIT_BOUNDS

Configuration bounds for validation.

```javascript
export const RATE_LIMIT_BOUNDS = {
  MAX_REQUESTS_MIN: 1,
  MAX_REQUESTS_MAX: 10000,
  WINDOW_MS_MIN: 1000,
  WINDOW_MS_MAX: 3600000,
};
```

## Error Handling

All validation errors include specific, actionable messages:

- `"maxRequests must be a number"` - Type error
- `"maxRequests must be a finite number"` - Infinity provided
- `"maxRequests must be an integer"` - Decimal value provided
- `"maxRequests must be at least 1"` - Value too low
- `"maxRequests must not exceed 10000"` - Value too high
- `"windowMs must be at least 1000ms (1 second)"` - Window too short
- `"windowMs must not exceed 3600000ms (1 hour)"` - Window too long

## Best Practices

1. **Set appropriate limits**: Balance security with usability
2. **Monitor rate limit hits**: Track how often limits are reached
3. **Use whitelist sparingly**: Only for trusted addresses
4. **Clean up regularly**: Call `cleanup()` periodically
5. **Validate before updating**: Use `isValidRateLimitConfig()` for pre-checks
6. **Log configuration changes**: Track all runtime updates

## Testing

Run rate limit tests:

```bash
npm test -- rate-limit.test.js
npm test -- rate-limit-startup.test.js
npm test -- address-rate-limit.test.js
```

## Documentation

- [RATE_LIMIT_VALIDATION.md](./RATE_LIMIT_VALIDATION.md) - Validation details
- [VALIDATION_CHANGELOG.md](./VALIDATION_CHANGELOG.md) - Change history
- [RATE_LIMIT_RUNBOOK.md](./RATE_LIMIT_RUNBOOK.md) - Operations guide

## License

See LICENSE file in project root.
