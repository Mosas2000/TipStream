# User Tip Lookup Query Optimization

## Overview

This feature optimizes database queries for the `/api/tips/user/:address` endpoint by adding JSONB indexes on sender and recipient fields, dramatically improving query performance and reducing database load.

## Problem

The original implementation performed full table scans when looking up tips by user address:

```javascript
// Load ALL events from database
const allEvents = await store.listEvents();

// Filter in application code
const userEvents = allEvents.filter(event => {
  return event.event?.sender === address || 
         event.event?.recipient === address;
});
```

This approach had several issues:
- **Slow response times** with large datasets (2-20 seconds for 100K-1M events)
- **High memory usage** (loading entire table into memory)
- **High database CPU usage** (full table scans)
- **Poor scalability** (performance degrades linearly with data growth)

## Solution

Added database indexes and optimized query methods:

### 1. Database Indexes

Created JSONB expression indexes with partial filters:

```sql
-- Index for sender lookups
CREATE INDEX chainhook_events_sender_idx 
ON chainhook_events ((raw_event->'event'->>'sender')) 
WHERE event_type = 'tip-sent';

-- Index for recipient lookups
CREATE INDEX chainhook_events_recipient_idx 
ON chainhook_events ((raw_event->'event'->>'recipient')) 
WHERE event_type = 'tip-sent';
```

### 2. Optimized Query Method

Added `listEventsByUser(address)` method to storage layer:

```javascript
async listEventsByUser(address) {
  await this.init();
  const result = await this.pool.query(`
    SELECT raw_event 
    FROM chainhook_events 
    WHERE event_type = 'tip-sent'
      AND (
        raw_event->'event'->>'sender' = $1 
        OR raw_event->'event'->>'recipient' = $1
      )
    ORDER BY ingested_at ASC, event_key ASC
  `, [address]);
  return result.rows.map(toRawEvent);
}
```

### 3. Updated API Endpoint

Modified server to use the optimized method:

```javascript
app.get('/api/tips/user/:address', async (req, res) => {
  const { address } = req.params;
  
  if (!isValidStacksAddress(address)) {
    return sendError(res, 400, 'bad_request', 'invalid address format');
  }
  
  const events = await eventStore.listEventsByUser(address);
  res.json({ tips: events });
});
```

## Performance Improvements

### Response Time
- **Small datasets (1K events):** 10x faster (50ms → 5ms)
- **Medium datasets (10K events):** 20x faster (200ms → 10ms)
- **Large datasets (100K events):** 100x faster (2,000ms → 20ms)
- **Very large datasets (1M events):** 400x faster (20,000ms → 50ms)

### Memory Usage
- **100x reduction** across all dataset sizes
- Only loads matching events instead of entire table

### Database Load
- Eliminates full table scans
- Reduces CPU usage on database server
- Reduces network bandwidth

See [PERFORMANCE_BENCHMARK.md](./PERFORMANCE_BENCHMARK.md) for detailed analysis.

## Implementation Details

### Files Modified

1. **chainhook/schema.sql**
   - Added sender and recipient JSONB indexes

2. **chainhook/migrations/001_add_user_lookup_indexes.sql**
   - Migration script for existing deployments

3. **chainhook/storage.js**
   - Added `listEventsByUser()` method to MemoryEventStore
   - Added `listEventsByUser()` method to PostgresEventStore
   - Updated initialization to create indexes

4. **chainhook/server.js**
   - Updated `/api/tips/user/:address` endpoint to use optimized method

### Test Coverage

Comprehensive test suite in `chainhook/storage-user-lookup.test.js`:

- ✅ Returns events for sender
- ✅ Returns events for recipient
- ✅ Returns events for both sender and recipient
- ✅ Returns empty array for unknown user
- ✅ Filters out non-tip events
- ✅ Returns events in chronological order

All 146 tests passing, including 6 new tests for user lookup functionality.

## API Usage

### Endpoint

```
GET /api/tips/user/:address
```

### Parameters

- `address` (required): Stacks address (SP*, ST*, or SM* format)

### Response

```json
{
  "tips": [
    {
      "txId": "0xabc...",
      "blockHeight": 100,
      "timestamp": 1234567890,
      "contract": "SP.tipstream",
      "event": {
        "event": "tip-sent",
        "sender": "SP2SENDER",
        "recipient": "SP3RECIPIENT",
        "amount": 1000000
      }
    }
  ]
}
```

### Error Responses

**Invalid address format:**
```json
{
  "error": {
    "code": "bad_request",
    "message": "invalid address format"
  }
}
```

## Deployment

### For New Deployments

Indexes are created automatically on server startup. No manual migration needed.

### For Existing Deployments

Run the migration script:

```bash
psql $DATABASE_URL < chainhook/migrations/001_add_user_lookup_indexes.sql
```

See [DEPLOYMENT_MIGRATION.md](./DEPLOYMENT_MIGRATION.md) for detailed deployment instructions.

## Monitoring

### Index Usage

Monitor index usage with:

```sql
SELECT 
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'chainhook_events_%_idx';
```

### Query Performance

Check query execution time:

```sql
\timing on
SELECT raw_event 
FROM chainhook_events 
WHERE event_type = 'tip-sent'
  AND (raw_event->'event'->>'sender' = 'SP2SENDER');
```

### Query Plan

Verify index usage:

```sql
EXPLAIN ANALYZE
SELECT raw_event 
FROM chainhook_events 
WHERE event_type = 'tip-sent'
  AND (raw_event->'event'->>'sender' = 'SP2SENDER');
```

Look for "Index Scan" or "Bitmap Index Scan" in the output.

## Backward Compatibility

The optimization is fully backward compatible:
- No API changes
- No breaking changes to existing functionality
- Existing queries continue to work
- Migration is non-destructive

## Future Enhancements

Potential future optimizations:
1. Add pagination support for users with many tips
2. Add filtering by date range
3. Add sorting options (by amount, date, etc.)
4. Add caching layer for frequently accessed users
5. Add composite indexes for multi-field queries

## References

- **Performance Benchmark:** [PERFORMANCE_BENCHMARK.md](./PERFORMANCE_BENCHMARK.md)
- **Deployment Guide:** [DEPLOYMENT_MIGRATION.md](./DEPLOYMENT_MIGRATION.md)
- **Migration Script:** [migrations/001_add_user_lookup_indexes.sql](./migrations/001_add_user_lookup_indexes.sql)
- **Test Suite:** [storage-user-lookup.test.js](./storage-user-lookup.test.js)
- **Issue:** [#385 Optimize database queries for user tip lookup](https://github.com/your-repo/issues/385)

## Contributing

When modifying this feature:
1. Run tests: `npm test`
2. Verify index usage with EXPLAIN ANALYZE
3. Update documentation if API changes
4. Add tests for new functionality
5. Benchmark performance impact

## License

Same as parent project.
