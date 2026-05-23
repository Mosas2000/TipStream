# Chainhook Service Deployment Guide

## PostgreSQL Pool Configuration

The chainhook service uses connection pooling to manage database connections efficiently. Proper pool configuration is essential for production deployments to prevent connection exhaustion and ensure optimal performance.

### Configuration Options

The following environment variables control PostgreSQL pool behavior:

#### DB_POOL_MAX
Maximum number of connections in the pool.

- **Default**: 20
- **Recommended**: 10-50 depending on workload
- **Considerations**: 
  - Higher values allow more concurrent requests but consume more database resources
  - Should not exceed your PostgreSQL max_connections setting
  - Consider your application's concurrency requirements

#### DB_POOL_IDLE_TIMEOUT_MS
Time in milliseconds before an idle connection is closed.

- **Default**: 30000 (30 seconds)
- **Recommended**: 30000-60000
- **Considerations**:
  - Shorter timeouts free up connections faster but may cause reconnection overhead
  - Longer timeouts reduce reconnection overhead but may hold connections unnecessarily

#### DB_POOL_CONNECTION_TIMEOUT_MS
Maximum time in milliseconds to wait for a connection from the pool.

- **Default**: 5000 (5 seconds)
- **Recommended**: 3000-10000
- **Considerations**:
  - Shorter timeouts fail fast under load
  - Longer timeouts may cause request queuing during high traffic

#### DB_STATEMENT_TIMEOUT_MS
Maximum time in milliseconds for a query to execute.

- **Default**: 30000 (30 seconds)
- **Recommended**: 10000-60000 depending on query complexity
- **Considerations**:
  - Prevents long-running queries from blocking connections
  - Should be tuned based on your slowest expected query
  - Too short may cause legitimate queries to fail

### Example Configuration

```bash
# Production settings for moderate load
DB_POOL_MAX=25
DB_POOL_IDLE_TIMEOUT_MS=45000
DB_POOL_CONNECTION_TIMEOUT_MS=7000
DB_STATEMENT_TIMEOUT_MS=30000
```

```bash
# High-traffic production settings
DB_POOL_MAX=50
DB_POOL_IDLE_TIMEOUT_MS=60000
DB_POOL_CONNECTION_TIMEOUT_MS=10000
DB_STATEMENT_TIMEOUT_MS=45000
```

```bash
# Development settings
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
DB_STATEMENT_TIMEOUT_MS=30000
```

### Monitoring

Monitor these metrics to tune your pool configuration:

- Connection pool utilization
- Connection wait times
- Query execution times
- Connection errors and timeouts

### Troubleshooting

**Connection pool exhausted**: Increase `DB_POOL_MAX` or reduce `DB_POOL_IDLE_TIMEOUT_MS`

**Slow response times**: Check if `DB_POOL_CONNECTION_TIMEOUT_MS` is being exceeded

**Query timeouts**: Increase `DB_STATEMENT_TIMEOUT_MS` or optimize slow queries

**Database connection limit reached**: Reduce `DB_POOL_MAX` across all service instances

### Best Practices

1. Start with default values and adjust based on monitoring data
2. Set `DB_POOL_MAX` lower than your database's max_connections limit
3. Monitor connection pool metrics in production
4. Use longer timeouts for batch operations
5. Test pool configuration under expected load before deploying
6. Document any custom pool settings in your deployment notes


## Graceful Shutdown

The service implements graceful shutdown to prevent request failures during deployments and restarts.

### Shutdown Sequence

1. **Signal received** (SIGTERM or SIGINT)
2. **Request rejection begins** - New ingest requests immediately receive 503 responses
3. **In-flight requests complete** - Existing requests are allowed to finish
4. **Resources cleanup** - Database connections and intervals are closed
5. **Process exit** - Clean termination after 30 seconds maximum

### Client Behavior

When the service is shutting down, clients receive:

**HTTP Response:**
- Status: 503 Service Unavailable
- Retry-After: 30 seconds

**Response Body:**
```json
{
  "error": "service_unavailable",
  "message": "service is shutting down",
  "request_id": "..."
}
```

### Deployment Recommendations

1. Configure load balancers to respect 503 responses
2. Implement retry logic with exponential backoff
3. Use health checks to remove instances before shutdown
4. Allow 30-60 seconds for graceful termination
5. Monitor shutdown metrics to tune timeout values


## Rate Limit Configuration

### Startup Configuration

Rate limits are configured via environment variables at startup:

```bash
RATE_LIMIT_MAX_REQUESTS=100    # Maximum requests per window
RATE_LIMIT_WINDOW_MS=60000     # Time window in milliseconds (60 seconds)
```

### Runtime Reconfiguration

Rate limits can be adjusted at runtime without restarting the service. This is critical for incident response when traffic patterns change unexpectedly.

#### Check Current Configuration

```bash
curl http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}"
```

Response:
```json
{
  "maxRequests": 100,
  "windowMs": 60000,
  "windowSeconds": 60
}
```

#### Update Configuration

```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "maxRequests": 50,
    "windowMs": 30000
  }'
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
    "maxRequests": 50,
    "windowMs": 30000,
    "windowSeconds": 30
  }
}
```

### Incident Response Workflow

1. **Detect**: Monitor `/metrics` endpoint for rate limit violations
2. **Assess**: Determine if traffic is legitimate or attack
3. **Respond**: Adjust limits via POST endpoint
4. **Verify**: Confirm new configuration via GET endpoint
5. **Monitor**: Watch metrics for desired effect
6. **Document**: Update environment variables for next restart

### Example Scenarios

#### Scenario 1: DDoS Attack Mitigation

Tighten rate limits immediately:

```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 10, "windowMs": 60000}'
```

#### Scenario 2: Legitimate Traffic Spike

Relax rate limits temporarily:

```bash
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 200, "windowMs": 60000}'
```

#### Scenario 3: Gradual Adjustment

Make incremental changes while monitoring:

```bash
# Step 1: Moderate tightening
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 75, "windowMs": 60000}'

# Wait and monitor...

# Step 2: Further tightening if needed
curl -X POST http://localhost:3100/api/admin/rate-limit \
  -H "Authorization: Bearer ${CHAINHOOK_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"maxRequests": 50, "windowMs": 60000}'
```

### Validation Rules

- `maxRequests`: Must be between 1 and 10000
- `windowMs`: Must be between 1000 (1 second) and 3600000 (1 hour)

### Important Notes

- Runtime changes are not persisted across restarts
- After restart, service reverts to environment variable values
- Changes apply immediately to all new requests
- Existing rate limit counters are preserved
- All configuration changes are logged for audit trail

### Monitoring

Rate limit configuration changes are logged:

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

Monitor these metrics:
- Rate limit violations per IP
- Total requests vs rate limited requests
- Configuration change frequency
- Response times during rate limit adjustments

### Best Practices

1. **Test in Staging**: Verify new limits before applying to production
2. **Gradual Changes**: Make incremental adjustments rather than drastic ones
3. **Document Changes**: Keep a log of why and when limits were changed
4. **Update Defaults**: After incident, update environment variables to reflect new baseline
5. **Automate Response**: Script common incident response scenarios
6. **Monitor Impact**: Watch metrics after each change
7. **Coordinate with Team**: Communicate rate limit changes to operations team

### Security Considerations

- Always use authentication tokens in production
- Restrict admin endpoint access to authorized personnel
- Log all configuration changes for audit trail
- Monitor for unauthorized configuration attempts
- Consider implementing additional authorization layers

See [RATE_LIMIT_RUNTIME_CONFIG.md](./RATE_LIMIT_RUNTIME_CONFIG.md) for complete documentation.


## Pagination Performance

The tip history endpoints use cursor-based pagination to maintain consistent performance as the dataset grows.

### Database Indexes

The following composite indexes support efficient cursor queries:

- `chainhook_events_tips_cursor_idx` on `(event_timestamp DESC, event_key DESC)`
- `chainhook_events_sender_cursor_idx` on `(sender, event_timestamp DESC, event_key DESC)`
- `chainhook_events_recipient_cursor_idx` on `(recipient, event_timestamp DESC, event_key DESC)`

These indexes are created automatically on service startup if they do not exist.

### Configuration

```bash
TIPS_DEFAULT_PAGE_SIZE=50    # Default items per page (1-100)
```

### Performance Characteristics

- **Query Time**: O(log n) indexed lookup regardless of dataset size
- **Memory Usage**: Only requested page loaded into memory
- **Consistency**: Cursor-based approach provides stable ordering across pages

### Monitoring

Monitor these metrics for pagination performance:

- Average query execution time for `/api/tips` and `/api/tips/user/:address`
- Index usage statistics in PostgreSQL
- Memory consumption per request
- Client pagination patterns

### Optimization Tips

1. **Index Maintenance**: Run `ANALYZE` periodically to update query planner statistics
2. **Page Size**: Default of 50 balances response size and query efficiency
3. **Client Behavior**: Encourage clients to use cursors rather than fetching all pages
4. **Database Tuning**: Ensure `work_mem` is sufficient for index scans

See [PAGINATION_CHANGELOG.md](./PAGINATION_CHANGELOG.md) for implementation details.
