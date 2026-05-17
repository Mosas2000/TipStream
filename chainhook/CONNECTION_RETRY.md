# Connection Retry Logic

## Overview

The chainhook service implements automatic retry with exponential backoff for transient database connection failures. When a PostgreSQL operation fails due to a network or connection error, the service retries the operation up to a configurable maximum before propagating the error.

This eliminates the need for manual restarts when the database is temporarily unavailable (e.g., during a rolling restart, network blip, or connection pool exhaustion).

## Behavior

### Retry Strategy

- **Algorithm**: Exponential backoff with full jitter
- **Default max attempts**: 5
- **Default base delay**: 200ms
- **Default max delay**: 30 seconds
- **Jitter**: Up to 100ms added to each delay to prevent thundering herd

The delay before attempt `n` (zero-indexed) is:

```
delay = min(baseDelay * 2^n, maxDelay) + random(0, jitter)
```

Example delays with defaults (no jitter):

| Attempt | Delay   |
|---------|---------|
| 1       | 200ms   |
| 2       | 400ms   |
| 3       | 800ms   |
| 4       | 1600ms  |
| 5       | 3200ms  |

### Retryable Errors

The following errors trigger a retry:

**Node.js network errors:**
- `ECONNREFUSED` — database not accepting connections
- `ECONNRESET` — connection dropped mid-operation
- `ETIMEDOUT` — connection attempt timed out
- `EPIPE` — broken pipe on an established connection
- `EHOSTUNREACH` — host unreachable
- `ENETUNREACH` — network unreachable

**PostgreSQL error codes:**
- `08000` — connection exception
- `08001` — client unable to establish connection
- `08003` — connection does not exist
- `08004` — server rejected connection
- `08006` — connection failure
- `57P03` — cannot connect now (database starting up)
- `53300` — too many connections
- `40001` — serialization failure (safe to retry)
- `40P01` — deadlock detected (safe to retry)

**Message patterns:**
- `connection refused`
- `connection terminated`
- `connection reset`
- `cannot connect`
- `too many connections`
- `client checkout timed out`
- `idle timeout`

### Non-Retryable Errors

Errors that indicate a programming or data problem are not retried:

- Constraint violations (`23505` duplicate key, etc.)
- Syntax errors (`42601`)
- Invalid input (`22003`, `22P02`)
- Permission errors (`42501`)
- Any error not matching the retryable patterns above

### Health Check

The `/health` endpoint uses a reduced retry budget (2 attempts) to avoid blocking health checks during extended outages. When the database is unreachable after retries, the endpoint returns:

```json
{
  "status": "degraded",
  "storage": {
    "healthy": false,
    "error": "connect ECONNREFUSED 127.0.0.1:5432"
  }
}
```

with HTTP status `503`.

When healthy:

```json
{
  "status": "healthy",
  "storage": {
    "healthy": true,
    "storage_mode": "postgres",
    "total_events": 1234
  }
}
```

with HTTP status `200`.

## Configuration

Retry behavior is tunable via environment variables:

| Variable               | Default | Description                                      |
|------------------------|---------|--------------------------------------------------|
| `DB_RETRY_MAX_ATTEMPTS`| `5`     | Maximum total attempts (1 = no retries)          |
| `DB_RETRY_BASE_DELAY_MS`| `200`  | Base delay in ms for exponential backoff         |
| `DB_RETRY_MAX_DELAY_MS`| `30000` | Maximum delay cap in ms between attempts         |

### Tuning for Different Environments

**Development** (fast feedback):
```bash
DB_RETRY_MAX_ATTEMPTS=2
DB_RETRY_BASE_DELAY_MS=50
DB_RETRY_MAX_DELAY_MS=500
```

**Production** (resilient to longer outages):
```bash
DB_RETRY_MAX_ATTEMPTS=5
DB_RETRY_BASE_DELAY_MS=200
DB_RETRY_MAX_DELAY_MS=30000
```

**High-availability** (tolerate rolling restarts):
```bash
DB_RETRY_MAX_ATTEMPTS=8
DB_RETRY_BASE_DELAY_MS=500
DB_RETRY_MAX_DELAY_MS=60000
```

## Logging

Each retry attempt is logged at `WARN` level:

```json
{
  "level": "WARN",
  "message": "Retrying operation after transient error",
  "operation": "postgres_insert_events",
  "attempt": 2,
  "max_attempts": 5,
  "delay_ms": 400,
  "error_code": "ECONNREFUSED",
  "error_message": "connect ECONNREFUSED 127.0.0.1:5432"
}
```

When all attempts are exhausted, the final failure is logged at `ERROR` level:

```json
{
  "level": "ERROR",
  "message": "Operation failed after retries",
  "operation": "postgres_insert_events",
  "attempts": 5
}
```

## Graceful Degradation

When the database is unavailable and retries are exhausted:

1. **Event ingestion** (`POST /api/chainhook/events`): Returns `503 Service Unavailable` with `Retry-After: 30` header. The Chainhook node will retry delivery.
2. **Read endpoints** (`GET /api/tips`, etc.): Return `503 Service Unavailable`.
3. **Health endpoint** (`GET /health`): Returns `503` with `status: "degraded"`.
4. **Metrics endpoint** (`GET /metrics`): Returns `503`.

The service does not crash. It continues accepting requests and retrying database operations as configured.

## Implementation

The retry logic lives in `chainhook/retry.js` and is used by:

- `chainhook/storage.js` — all `PostgresEventStore` and `PostgresScheduledTipStore` methods
- `chainhook/errors.js` — `classifyError` maps connection errors to `StorageUnavailableError`
- `chainhook/server.js` — health endpoint reflects storage health state

## Testing

```bash
# Run all retry-related tests
cd chainhook
npm test -- retry.test.js
npm test -- storage-retry.test.js
npm test -- health-retry.test.js

# Run the full suite
npm test
```

Test coverage includes:

- `isRetryable` — all retryable and non-retryable error codes
- `calculateBackoff` — exponential growth, cap, and jitter
- `withRetry` — success, recovery, non-retryable bail-out, exhaustion
- `parseRetryConfig` — env var parsing and defaults
- Storage integration — recovery from transient failures in query operations
- Health endpoint — 200/503 based on storage state
