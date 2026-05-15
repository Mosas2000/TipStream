# Deployment Migration Guide

## User Lookup Query Optimization

This guide covers the deployment and migration process for the user lookup query optimization feature.

## Overview

The optimization adds database indexes to improve the performance of the `/api/tips/user/:address` endpoint. This migration is required for PostgreSQL deployments.

## Prerequisites

- PostgreSQL database access
- Database connection string (DATABASE_URL)
- psql client or equivalent database tool

## Migration Steps

### 1. Backup Database (Recommended)

Before applying any migration, create a backup:

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Apply Migration

Run the migration script to add the indexes:

```bash
psql $DATABASE_URL < chainhook/migrations/001_add_user_lookup_indexes.sql
```

Or manually execute:

```sql
-- Add index for sender lookups
CREATE INDEX IF NOT EXISTS chainhook_events_sender_idx 
ON chainhook_events ((raw_event->'event'->>'sender')) 
WHERE event_type = 'tip-sent';

-- Add index for recipient lookups
CREATE INDEX IF NOT EXISTS chainhook_events_recipient_idx 
ON chainhook_events ((raw_event->'event'->>'recipient')) 
WHERE event_type = 'tip-sent';
```

### 3. Verify Index Creation

Check that the indexes were created successfully:

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'chainhook_events_sender_idx',
  'chainhook_events_recipient_idx'
);
```

Expected output:
```
 schemaname |    tablename     |          indexname           |                                    indexdef
------------+------------------+------------------------------+--------------------------------------------------------------------------------
 public     | chainhook_events | chainhook_events_sender_idx  | CREATE INDEX chainhook_events_sender_idx ON public.chainhook_events ...
 public     | chainhook_events | chainhook_events_recipient_idx | CREATE INDEX chainhook_events_recipient_idx ON public.chainhook_events ...
```

### 4. Deploy Application Code

Deploy the updated application code that includes the optimized query methods:
- Updated `chainhook/storage.js` with `listEventsByUser()` method
- Updated `chainhook/server.js` to use the optimized method

### 5. Verify Functionality

Test the endpoint after deployment:

```bash
# Test with a known user address
curl https://your-domain.com/api/tips/user/SP2SENDER

# Check response time (should be significantly faster)
time curl https://your-domain.com/api/tips/user/SP2SENDER
```

## Migration Characteristics

### Safety
- **Non-destructive:** Only adds indexes, no data changes
- **Idempotent:** Safe to run multiple times
- **Backward compatible:** Existing queries continue to work

### Performance Impact During Migration
- Index creation may take time on large tables
- Minimal impact on read operations
- Brief lock during index creation (typically milliseconds)
- For very large tables (>1M rows), consider creating indexes concurrently:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS chainhook_events_sender_idx 
ON chainhook_events ((raw_event->'event'->>'sender')) 
WHERE event_type = 'tip-sent';

CREATE INDEX CONCURRENTLY IF NOT EXISTS chainhook_events_recipient_idx 
ON chainhook_events ((raw_event->'event'->>'recipient')) 
WHERE event_type = 'tip-sent';
```

### Index Size Estimates
- Approximately 5-10% of table size
- Example: 100K events (~200MB) → indexes ~10-20MB each

## Rollback Procedure

If you need to rollback the migration:

```sql
-- Remove the indexes
DROP INDEX IF EXISTS chainhook_events_sender_idx;
DROP INDEX IF EXISTS chainhook_events_recipient_idx;
```

Then redeploy the previous application version.

## Monitoring

### Index Usage Statistics

Monitor index usage after deployment:

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexname IN (
  'chainhook_events_sender_idx',
  'chainhook_events_recipient_idx'
);
```

### Query Performance

Monitor query performance:

```sql
-- Enable query timing
\timing on

-- Test query performance
SELECT raw_event 
FROM chainhook_events 
WHERE event_type = 'tip-sent'
  AND (
    raw_event->'event'->>'sender' = 'SP2SENDER'
    OR raw_event->'event'->>'recipient' = 'SP2SENDER'
  )
ORDER BY ingested_at ASC, event_key ASC;
```

### Query Plan Analysis

Verify that indexes are being used:

```sql
EXPLAIN ANALYZE
SELECT raw_event 
FROM chainhook_events 
WHERE event_type = 'tip-sent'
  AND (
    raw_event->'event'->>'sender' = 'SP2SENDER'
    OR raw_event->'event'->>'recipient' = 'SP2SENDER'
  )
ORDER BY ingested_at ASC, event_key ASC;
```

Look for "Index Scan" or "Bitmap Index Scan" in the output.

## Environment-Specific Notes

### Development
- Migration runs automatically on server startup
- Uses in-memory storage by default (no migration needed)

### Staging
- Apply migration before deploying code
- Test thoroughly with production-like data volume

### Production
- Schedule migration during low-traffic period
- Monitor database performance during and after migration
- Keep backup readily available
- Consider using CONCURRENTLY option for large tables

## Troubleshooting

### Index Creation Fails

**Error:** `ERROR: index "chainhook_events_sender_idx" already exists`

**Solution:** This is expected if the index already exists. The migration uses `IF NOT EXISTS` to handle this gracefully.

### Slow Index Creation

**Issue:** Index creation takes a long time on large tables

**Solution:** 
1. Use `CREATE INDEX CONCURRENTLY` to avoid blocking
2. Monitor progress with:
```sql
SELECT 
  now()::time,
  query,
  state,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE query LIKE '%CREATE INDEX%';
```

### Index Not Being Used

**Issue:** Query plan shows sequential scan instead of index scan

**Solution:**
1. Run `ANALYZE chainhook_events;` to update statistics
2. Check if the query matches the index definition
3. Verify the index exists with `\d chainhook_events`

### Out of Disk Space

**Issue:** Not enough disk space for index creation

**Solution:**
1. Check available space: `df -h`
2. Estimate index size: ~5-10% of table size
3. Free up space or expand disk before migration

## Support

For issues or questions:
1. Check the performance benchmark: `chainhook/PERFORMANCE_BENCHMARK.md`
2. Review test coverage: `chainhook/storage-user-lookup.test.js`
3. Open an issue on GitHub with migration logs

## References

- Migration script: `chainhook/migrations/001_add_user_lookup_indexes.sql`
- Performance benchmark: `chainhook/PERFORMANCE_BENCHMARK.md`
- Storage implementation: `chainhook/storage.js`
- Test coverage: `chainhook/storage-user-lookup.test.js`
