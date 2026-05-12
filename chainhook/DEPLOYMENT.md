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
