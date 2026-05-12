# PostgreSQL Pool Configuration Changes

## Summary

Added explicit PostgreSQL connection pool sizing and timeout settings to address issue #347.

## Changes Made

### Code Changes

1. **storage.js**
   - Added pool configuration constants (max, idle timeout, connection timeout, statement timeout)
   - Created `parsePoolConfig()` function to parse environment variables
   - Updated `PostgresEventStore` constructor to accept and apply pool configuration
   - Updated `createEventStore()` factory to pass pool configuration
   - Added pool configuration to health check response
   - Added validation warning for excessive pool sizes

2. **storage.test.js**
   - Added comprehensive tests for `parsePoolConfig()` function
   - Added tests for pool configuration integration
   - Added tests for default constants
   - Added test for validation warning
   - All 101 tests passing

### Configuration

3. **.env.example**
   - Added `DB_POOL_MAX` (default: 20)
   - Added `DB_POOL_IDLE_TIMEOUT_MS` (default: 30000)
   - Added `DB_POOL_CONNECTION_TIMEOUT_MS` (default: 5000)
   - Added `DB_STATEMENT_TIMEOUT_MS` (default: 30000)

### Documentation

4. **DEPLOYMENT.md** (new)
   - Comprehensive deployment guide for pool configuration
   - Detailed explanation of each configuration option
   - Example configurations for different environments
   - Monitoring recommendations
   - Troubleshooting guide
   - Best practices

5. **README.md** (new)
   - Service overview
   - Configuration guide with pool settings
   - API endpoints documentation
   - Quick start instructions

6. **examples/.env.production** (new)
   - Production environment configuration example
   - Optimized pool settings for high-traffic scenarios

7. **examples/.env.development** (new)
   - Development environment configuration example
   - Relaxed settings for local development

## Acceptance Criteria

- [x] Add explicit pool sizing and timeout configuration
- [x] Document the defaults in the deployment guide
- [x] Add tests for the configured pool options

## Default Values

- `DB_POOL_MAX`: 20 connections
- `DB_POOL_IDLE_TIMEOUT_MS`: 30000ms (30 seconds)
- `DB_POOL_CONNECTION_TIMEOUT_MS`: 5000ms (5 seconds)
- `DB_STATEMENT_TIMEOUT_MS`: 30000ms (30 seconds)

## Benefits

1. Prevents connection exhaustion under load
2. Protects against slow or hanging queries
3. Provides predictable connection behavior
4. Enables production tuning based on workload
5. Improves observability through health endpoint

## Testing

All tests pass (101/101):
- Unit tests for configuration parsing
- Integration tests for pool configuration
- Validation tests for edge cases
- Full test suite verification
