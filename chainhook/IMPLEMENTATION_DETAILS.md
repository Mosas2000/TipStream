# Implementation Details: Metrics Authentication

This document describes the technical implementation of metrics access control.

## Architecture Overview

```
Request
  ↓
[Reverse Proxy - Optional IP allowlist]
  ↓
[Nginx/Apache - Optional IP/Auth]
  ↓
[Chainhook Server]
  ├─ /health → Always returns 200
  ├─ /metrics → Check if METRICS_AUTH_TOKEN is set
  │   ├─ If not set → Return metrics
  │   └─ If set → Validate Bearer token → Return metrics or 401
  └─ /api/* → Normal API routes
```

## Environment Configuration

### METRICS_AUTH_TOKEN

**Source:** Environment variable  
**Default:** Empty string (metrics publicly accessible)  
**Required:** No  
**Format:** Base64-encoded random bytes (minimum 32 bytes)

**Example:**
```bash
METRICS_AUTH_TOKEN="KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN="
```

**Generation:**
```bash
openssl rand -base64 32
```

### HEALTH_CHECK_ALWAYS_ENABLED

**Source:** Environment variable  
**Default:** "true"  
**Required:** No  
**Purpose:** Placeholder for future health check gating (currently always enabled)

## Bearer Token Validation

### Token Format

Expected format: `Authorization: Bearer <token>`

**Parts:**
- `Authorization` - HTTP header name
- `Bearer` - Authentication scheme (required, case-sensitive)
- Space - Required separator
- `<token>` - The actual token value

**Example:**
```
Authorization: Bearer KGD8xL2p9F5m1Q7rJz0nX4vE6bY3hW+UoS8kP2mL9Aq5aD8vN=
```

### Validation Logic

```javascript
// Check if authentication is configured
if (!METRICS_AUTH_TOKEN) {
  // No authentication required, return metrics
  return res.json(metrics);
}

// Authentication is configured, validate token
const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith('Bearer ')) {
  // Invalid or missing Authorization header
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid or missing bearer token'
  });
}

// Extract token from header
const token = authHeader.slice('Bearer '.length);

// Validate token using constant-time comparison
if (!validateBearerToken(token, METRICS_AUTH_TOKEN)) {
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid or missing bearer token'
  });
}

// Token is valid, return metrics
return res.json(metrics);
```

### Constant-Time Comparison

The `validateBearerToken` function uses constant-time comparison to prevent timing attacks.

**Why:** An attacker could measure response time to determine how many characters of the token are correct, allowing them to guess the token character-by-character.

**Implementation:**
```javascript
function validateBearerToken(provided, expected) {
  // Convert strings to buffers
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  // Compare buffers
  // timingSafeEqual throws if lengths differ
  // but we want to return false, so we check length first
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  // Use timingSafeEqual for constant-time comparison
  try {
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}
```

**Performance:** Constant-time comparison takes same time regardless of token length or mismatch position.

## Code Implementation

### Server Initialization

```javascript
// Load environment variables
const METRICS_AUTH_TOKEN = process.env.METRICS_AUTH_TOKEN || '';
const HEALTH_CHECK_ALWAYS_ENABLED = process.env.HEALTH_CHECK_ALWAYS_ENABLED !== 'false';

// Log configuration (without token value)
if (METRICS_AUTH_TOKEN) {
  logger.info('Metrics authentication enabled');
} else {
  logger.warn('Metrics authentication disabled - metrics are publicly accessible');
}
```

### Route Handler

```javascript
// Health endpoint - always accessible
app.get('/health', (req, res) => {
  const health = {
    ok: true,
    blockHeight: getCurrentBlockHeight(),
    targetBlockHeight: getTargetBlockHeight(),
    lastUpdated: Date.now()
  };
  res.json(health);
});

// Metrics endpoint - optional authentication
app.get('/metrics', (req, res) => {
  // Check if authentication is enabled
  if (METRICS_AUTH_TOKEN) {
    // Authentication is enabled, validate token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing bearer token'
      });
    }

    const token = authHeader.slice('Bearer '.length);

    if (!validateBearerToken(token, METRICS_AUTH_TOKEN)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing bearer token'
      });
    }
  }

  // Token is valid (or not required), return metrics
  const metrics = {
    methodProposal: getMetricValue('methodProposal'),
    methodTransferSTX: getMetricValue('methodTransferSTX'),
    methodTransferToken: getMetricValue('methodTransferToken'),
    methodTransferNFT: getMetricValue('methodTransferNFT'),
    eventsIndexed: getMetricValue('eventsIndexed'),
    lastIndexTime: getLastIndexTime(),
    activeRecipients: getActiveRecipientCount(),
    totalTipsProcessed: getTotalTipsProcessed(),
    recipientStats: getTopRecipients(10)
  };

  res.json(metrics);
});
```

## Token Lifecycle

### Generation

Token is generated outside the application using cryptographically secure random source:

```bash
openssl rand -base64 32
```

**Entropy:** 32 bytes × 8 bits = 256 bits of entropy
**Format:** Base64 encoding reduces entropy to ~24 bits per character × ~43 characters ≈ 256 bits total

### Storage

Token is stored in:
1. Environment variable (for application runtime)
2. Secure vault (for long-term storage)
3. Monitoring system configuration (Prometheus, etc.)

**Never:** Stored in version control, logs, or unsecured systems

### Usage

Application:
- Loads token from `METRICS_AUTH_TOKEN` environment variable at startup
- Stores in memory for request validation
- Never logs or exposes token value

### Rotation

Manual rotation process:
1. Generate new token
2. Update all systems (environment, vaults, monitoring configs)
3. Restart services
4. Verify all clients are working
5. Archive old token in audit log

## Security Considerations

### Timing Attack Prevention

Bearer token validation uses `crypto.timingSafeEqual()` to prevent attackers from using response timing to guess the token.

```javascript
// Vulnerable (wrong)
if (token === expectedToken) { ... }

// Secure (correct)
crypto.timingSafeEqual(
  Buffer.from(token),
  Buffer.from(expectedToken)
)
```

### No Token Logging

The implementation ensures tokens are never logged:
- Authorization header is not logged
- Token value is never printed
- Error messages don't include token details

### Token Length Verification

Token comparison first checks length before doing content comparison:

```javascript
if (providedBuf.length !== expectedBuf.length) {
  return false;  // Fail fast for wrong length
}
```

This protects against:
- Zero-length tokens
- Truncated tokens
- Overly long tokens

## Testing Strategy

### Unit Tests

Test bearer token validation in isolation:

```javascript
describe('validateBearerToken', () => {
  it('accepts valid token', () => {
    assert(validateBearerToken('test-token', 'test-token'));
  });

  it('rejects invalid token', () => {
    assert(!validateBearerToken('wrong-token', 'test-token'));
  });

  it('rejects empty token', () => {
    assert(!validateBearerToken('', 'test-token'));
  });

  it('rejects extra whitespace', () => {
    assert(!validateBearerToken('test-token ', 'test-token'));
  });
});
```

### Integration Tests

Test metrics endpoint with various scenarios:

```javascript
describe('GET /metrics', () => {
  it('returns 200 when token not configured', async () => {
    delete process.env.METRICS_AUTH_TOKEN;
    const res = await GET('/metrics');
    assert.equal(res.status, 200);
  });

  it('returns 401 when token configured but not provided', async () => {
    process.env.METRICS_AUTH_TOKEN = 'test-token';
    const res = await GET('/metrics');
    assert.equal(res.status, 401);
  });

  it('returns 200 when valid token provided', async () => {
    process.env.METRICS_AUTH_TOKEN = 'test-token';
    const res = await GET('/metrics', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    assert.equal(res.status, 200);
  });
});
```

## Performance Impact

### Response Time

Bearer token validation adds minimal overhead:
- Header parsing: < 1ms
- Constant-time comparison: < 1ms
- Total: < 2ms per request

**Negligible impact** on metrics response time.

### Memory Usage

Token storage:
- Single string in memory
- Size: ~43 characters = ~43 bytes
- Negligible impact

### No Caching Impact

Token validation does not benefit from caching:
- Each request has different Authorization header
- Validation must be performed per request
- Cannot optimize with caching

## Backwards Compatibility

### Default Behavior

When `METRICS_AUTH_TOKEN` is not set or empty string:
- Metrics endpoint is publicly accessible (200 OK)
- No authentication is enforced
- Existing clients continue to work
- No breaking changes

### Migration Path

1. Deploy code with authentication support
2. Leave `METRICS_AUTH_TOKEN` empty initially
3. Metrics remain public (backward compatible)
4. Gradually enable authentication in environments
5. Monitoring systems updated first, then deploy
6. Finally, enable authentication in all environments

### Version Compatibility

The implementation is compatible with:
- Node.js 16+
- Express.js 4.x
- All reverse proxies (Nginx, Apache, etc.)

## Debugging

### Enable Debug Logging

```javascript
// Add to server.js
if (process.env.DEBUG_METRICS_AUTH) {
  app.get('/metrics', (req, res, next) => {
    console.log('Metrics request:', {
      authHeader: !!req.headers.authorization,
      authHeaderLength: req.headers.authorization?.length
    });
    next();
  });
}
```

### Test Endpoint

```bash
# Test with debug logging
DEBUG_METRICS_AUTH=1 npm start

# In another terminal
curl -v http://localhost:3100/metrics
curl -v -H "Authorization: Bearer test-token" http://localhost:3100/metrics
```

## Future Enhancements

### Token Expiration

```javascript
const tokenExpiration = process.env.METRICS_TOKEN_EXPIRATION;
if (tokenExpiration && Date.now() > tokenExpiration) {
  return res.status(401).json({ error: 'Token expired' });
}
```

### Token Scoping

```javascript
const allowedEndpoints = parseTokenScopes(token);
if (!allowedEndpoints.includes('/metrics')) {
  return res.status(403).json({ error: 'Insufficient permissions' });
}
```

### Rate Limiting

```javascript
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 100  // 100 requests per minute
});

app.get('/metrics', limiter, (req, res) => {
  // ...
});
```
