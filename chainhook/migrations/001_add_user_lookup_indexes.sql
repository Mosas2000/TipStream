-- Migration: Add indexes for user tip lookup optimization
-- Issue: #385
-- Description: Add JSONB indexes on sender and recipient fields to improve query performance

-- Add index for sender lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS chainhook_events_sender_idx 
ON chainhook_events ((raw_event->'event'->>'sender')) 
WHERE event_type = 'tip-sent';

-- Add index for recipient lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS chainhook_events_recipient_idx 
ON chainhook_events ((raw_event->'event'->>'recipient')) 
WHERE event_type = 'tip-sent';

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'chainhook_events'
AND indexname IN ('chainhook_events_sender_idx', 'chainhook_events_recipient_idx');
