# Changelog: Connection Retry Logic (Issue #400)

## Summary

Implements automatic retry with exponential backoff for transient database
connection failures in the chainhook service. The service no longer crashes
or requires a manual restart when the database is temporarily unavailable.

## Changes

### New Files

- `chainhook/retry.js` — Core retry module with `withRetry`, `isRetryable`,
  `calculateBackoff`, and `parseRetryConfig` exports.
- `chainhook/retry.test.js` — 59 tests covering all retry module functions.
- `chainhook/storage-retry.test.js` — 35 integration tests for storage-level
  retry behavior including recovery, exhaustion, and custom predicates.
- `chainhook/health-retry.test.js` — 8 tests for the health endpoint and
  metrics endpoint retry counter fields.
- `chainhook/metrics-retry.test.js` — 8 unit tests for `Metrics.recordDbRetry`.
- `chainhook/CONNECTION_RETRY.md` — Operator runbook covering behavior,
  configuration, logging, and troubleshooting.

### Modified Files

- `chainhook/storage.js`
  - Added `withRetry` wrapper to all `PostgresEventStore` query methods.
  - Added `withRetry` wrapper to all `PostgresScheduledTipStore` query methods.
  - Added connection probe in `#initialize()` for both store classes.
  - `health()` now returns `{ healthy: false }` instead of throwing when the
    database is unreachable.
  - `PostgresEventStore` and `PostgresScheduledTipStore` constructors accept
    `retryOptions` to override defaults per-instance.
  - `createEventStore` and `createScheduledTipStore` factories pass
    `retryOptions` through to the store constructors.
  - Imported `parseRetryConfig` to read retry settings from environment.

- `chainhook/errors.js`
  - Extended `classifyError` to cover all retryable PostgreSQL error codes
    (`08000`, `08001`, `08003`, `08004`, `08006`, `40001`, `40P01`) and
    Node.js codes (`EPIPE`, `ENETUNREACH`).
  - Added message-pattern matching for `connection terminated`, `connection
    reset`, `too many connections`, `client checkout timed out`, `idle timeout`.

- `chainhook/server.js`
  - `/health` endpoint returns HTTP `503` with `status: "degraded"` when
    storage health check fails, instead of always returning `200`.
  - Startup log now includes `db_retry_max_attempts` and `db_retry_base_delay_ms`.

- `chainhook/metrics.js`
  - Added `dbRetryAttempts`, `dbRetrySuccesses`, `dbRetryExhausted` counters.
  - Added `recordDbRetry(outcome)` method.
  - `toJSON()` includes `db_retry_attempts`, `db_retry_successes`,
    `db_retry_exhausted` fields.

- `chainhook/.env.example`
  - Added `DB_RETRY_MAX_ATTEMPTS`, `DB_RETRY_BASE_DELAY_MS`,
    `DB_RETRY_MAX_DELAY_MS` with documentation.

### Test Coverage

| File                          | Tests |
|-------------------------------|-------|
| retry.test.js                 | 59    |
| storage-retry.test.js         | 35    |
| health-retry.test.js          | 8     |
| metrics-retry.test.js         | 8     |
| errors.test.js (additions)    | 20    |
| storage.test.js (additions)   | 5     |
| **Total new/updated tests**   | **135** |

All 346 tests pass.

## Acceptance Criteria

- [x] Implement retry logic — `withRetry` in `retry.js`, applied to all
      Postgres query methods in `storage.js`
- [x] Exponential backoff (max 5 retries) — configurable via `DB_RETRY_*`
      env vars, defaults to 5 attempts with 200ms base delay
- [x] Log retry attempts — `WARN` log on each retry, `ERROR` on exhaustion
- [x] Update health endpoint — returns `503` with `healthy: false` when
      storage is unreachable
- [x] Graceful error handling — service continues running, returns `503` to
      callers instead of crashing
- [x] Add tests for retry scenarios — 135 new/updated tests across 6 files
