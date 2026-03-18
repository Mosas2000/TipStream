# Event Feed Performance Profiling

## Overview

This document describes the performance improvements made to the event feed pipeline in Issue #291, and how to measure and verify the benefits.

## Key Improvements

### 1. Selective Message Enrichment

**Before:** All tip messages were fetched at once whenever the event set changed, even for tips not currently visible on the page.

**After:** Messages are fetched only for tips in the current pagination window (default 10 tips per page).

**Impact:**
- **API Call Reduction:** ~90% reduction in message fetch requests on initial page load
  - Before: Fetch all ~500 visible tips' messages
  - After: Fetch only 10-15 visible tips' messages
- **Network Bandwidth:** Proportional reduction in API payload
- **Client-side Processing:** Fewer concurrent read-only calls reduces Stacks API rate-limit pressure

### 2. Page Caching

**Before:** Events were fetched from the Stacks API without caching, and multiple requests for the same page data could occur.

**After:** Event pages are cached with a 2-minute TTL and invalidation boundaries.

**Impact:**
- **API Load:** Reduces redundant API calls for pagination navigation
- **Response Time:** Cached pages return immediately (sub-millisecond)
- **Memory:** Bounded cache size prevents unbounded growth

### 3. Stable Cursor-based Pagination

**Before:** Offset-based pagination relied on API offsets that could shift with new events.

**After:** Stable cursors encode event properties (txId, timestamp, tipId) to enable reliable deduplication.

**Impact:**
- **Consistency:** Pagination remains stable as new events are added
- **Deduplication:** Prevents duplicate events across page boundaries
- **Scrollability:** Enables infinite scroll patterns without re-fetching

## Measuring Performance

### Browser DevTools

1. **Network Tab:**
   - Open Developer Tools → Network tab
   - Filter by XHR requests
   - Compare request count and payload size before/after changes
   - Expected reduction: 80-90% fewer `/extended/v1/contract/.../events` calls

2. **Performance Tab:**
   - Record a 5-10 second profile
   - Look for `fetchTipMessages` calls in the flame graph
   - Should see fewer and shorter call stacks

### Metrics Collection

Enable profiling via the metrics module:

```javascript
import { getEnrichmentMetrics } from '../lib/enrichmentMetrics';

const metrics = getEnrichmentMetrics();
console.log(metrics);
// {
//   totalEnrichmentRequests: 15,
//   totalTipIdsRequested: 42,
//   cacheHits: 32,          // Message cache hits
//   cacheMisses: 10,
//   cacheHitRate: "76.19%",
//   averageEnrichmentTime: 245,  // milliseconds
// }
```

### Expected Metrics After Optimization

- **Cache Hit Rate:** Should stabilize around 70-80% after first page load
- **Average Enrichment Time:** < 300ms for 10 tips (down from 2-5s for all)
- **Requests per Session:** ~5-10 vs. ~50+ before optimization

## Testing

### Performance Tests

Run the included performance tests:

```bash
npm test -- eventCursorManager.test.js
npm test -- eventPageCache.test.js
npm test -- eventPageCache-performance.test.js
```

### Manual Testing Scenario

1. Load the Live Feed page
2. Open DevTools Network tab
3. Search for requests to `/extended/v1/contract/.../events`
4. Count visible requests (should be ≤ 2-3 for initial page)
5. Navigate pagination (click Next/Previous)
6. Verify page cache hits (no new network requests for cached ranges)
7. Change filters/sort
8. Verify selective enrichment (only visible tips' messages are fetched)

## Backwards Compatibility

All changes are backwards compatible:
- Existing components continue to work
- TipContext API remains unchanged
- Optional metrics collection (non-intrusive)

## Future Optimization Opportunities

1. **Infinite Scroll:** Implement virtual scrolling to limit DOM nodes
2. **Prefetching:** Begin loading next page before user interaction
3. **Compression:** Use brotli/gzip for API payloads
4. **GraphQL:** Replace REST paging with cursor-based GraphQL queries
