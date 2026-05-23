# Pagination Implementation Changelog

## Issue #383: Implement pagination for tip history endpoint

### Summary

Implemented cursor-based pagination for the `/api/tips` and `/api/tips/user/:address` endpoints to improve scalability and performance as the dataset grows.

### Changes

#### Backend API

- **GET /api/tips**
  - Added `cursor` query parameter for pagination continuation
  - Changed default `limit` from 20 to 50 items per page
  - Response now includes `nextCursor` for fetching subsequent pages
  - Response includes `total` count of all tips

- **GET /api/tips/user/:address**
  - Added cursor-based pagination with same parameters as `/api/tips`
  - Maintains optimized JSONB index queries
  - Response format matches `/api/tips` for consistency

#### Storage Layer

- **MemoryEventStore**
  - Added `listTips({ limit, cursor })` method
  - Added `listTipsByUser(address, { limit, cursor })` method
  - In-memory cursor implementation using event keys

- **PostgresEventStore**
  - Added `listTips({ limit, cursor })` method with database-level pagination
  - Added `listTipsByUser(address, { limit, cursor })` method
  - Added composite indexes for efficient cursor queries:
    - `chainhook_events_tips_cursor_idx` on `(event_timestamp DESC, event_key DESC)`
    - `chainhook_events_sender_cursor_idx` on `(sender, event_timestamp DESC, event_key DESC)`
    - `chainhook_events_recipient_cursor_idx` on `(recipient, event_timestamp DESC, event_key DESC)`

#### Validation

- Added `sanitizeCursor()` helper to validate cursor tokens
- Cursor length limited to 512 characters
- Null/empty cursors handled gracefully

#### Documentation

- Updated chainhook README with pagination examples
- Added JSDoc to all new methods
- Documented environment variable `TIPS_DEFAULT_PAGE_SIZE`

### Benefits

- **Scalability**: Database-level pagination prevents loading entire dataset into memory
- **Performance**: Consistent query time regardless of total tip count
- **Stability**: Cursor-based approach provides stable ordering across pages
- **Backward Compatibility**: Existing clients continue to work with default pagination

### Testing

- 46 integration tests covering pagination behavior
- 26 storage unit tests for both memory and Postgres implementations
- 34 validation tests including cursor sanitization
- All 484 existing tests continue to pass

### Migration Notes

- No database migration required (indexes created automatically on startup)
- Existing API clients receive paginated responses with default limit of 50
- Clients can opt into larger page sizes up to 100 items
- `nextCursor` is `null` when no more results exist

### Performance Impact

- **Before**: O(n) query loading all tips, then slicing in JavaScript
- **After**: O(log n) indexed query with LIMIT clause
- **Memory**: Reduced from loading all rows to loading only requested page
- **Response time**: Consistent regardless of dataset size
