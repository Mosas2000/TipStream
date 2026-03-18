/**
 * Event Feed Architecture Guide
 *
 * This guide explains how the event feed pipeline works and how to
 * extend or customize it.
 *
 * @file lib/EVENT_FEED_ARCHITECTURE.md
 */

# Event Feed Architecture & Integration Guide

## Overview

The event feed implements a scalable, cursor-based pagination system
with selective message enrichment. This document explains the components
and how to integrate new features.

## Components

### 1. Low-Level Fetching (`contractEvents.js`)

Handles raw API communication with the Hiro API.

```javascript
import { fetchEventPage } from '../lib/contractEvents';

const page = await fetchEventPage(0);
// Returns: { events: [...], offset: 50, total: 12000, hasMore: true }
```

**When to use:** Direct API fetching, background sync tasks

### 2. Page Caching (`eventPageCache.js`)

Manages in-memory cache of event pages with TTL and invalidation.

```javascript
import {
  getCachedPage,
  setCachedPage,
  invalidatePagesWithSize,
} from '../lib/eventPageCache';

const cached = getCachedPage(10, 0);  // Get page 0, size 10
setCachedPage(10, 0, events, { total: 5000, hasMore: true });
invalidatePagesWithSize(10, 100);  // Clear pages < offset 100
```

**When to use:** Avoid redundant fetches, manage memory carefully

### 3. Cursor Management (`eventCursorManager.js`)

Creates and manages stable cursors for deduplication.

```javascript
import {
  createCursorFromPosition,
  filterEventsAfterCursor,
} from '../lib/eventCursorManager';

const cursor = createCursorFromPosition(events, 9);  // After 10th event
const newEvents = filterEventsAfterCursor(moreEvents, cursor);
```

**When to use:** Implementing infinite scroll, pagination state

### 4. Message Enrichment (`useSelectiveMessageEnrichment.js`)

Hook for selective message fetching (only visible tips).

```javascript
import { useSelectiveMessageEnrichment } from '../hooks/useSelectiveMessageEnrichment';

const { enrichedTips, loading } = useSelectiveMessageEnrichment(visibleTips);
// Fetches messages only for visibleTips
```

**When to use:** React components displaying tips, reducing API load

### 5. Pagination Hook (`usePaginatedEvents.js`)

Manages paginated event loading with caching.

```javascript
import { usePaginatedEvents } from '../hooks/usePaginatedEvents';

const { events, nextPage, cursor, hasMore } = usePaginatedEvents();
```

**When to use:** Custom event list components, advanced pagination

### 6. Unified Hook (`useFilteredAndPaginatedEvents.js`)

Combines filtering, sorting, pagination, and enrichment.

```javascript
import { useFilteredAndPaginatedEvents } from '../hooks/useFilteredAndPaginatedEvents';

const {
  enrichedTips,
  filteredTips,
  currentPage,
  totalPages,
  searchQuery,
  setSearchQuery,
  prevPage,
  nextPage,
} = useFilteredAndPaginatedEvents(events);
```

**When to use:** Most common use case, event listing UI components

## Common Patterns

### Pattern 1: Build a Custom Event Feed

```javascript
function MyEventFeed() {
  const [customFilter, setCustomFilter] = useState('');
  const { enrichedTips, setSearchQuery } = useFilteredAndPaginatedEvents(events);

  const filtered = enrichedTips.filter(t => customFilter ? t.sender.includes(customFilter) : true);

  return (
    <div>
      <input value={customFilter} onChange={(e) => setCustomFilter(e.target.value)} />
      {filtered.map(tip => <TipCard key={tip.tipId} tip={tip} />)}
    </div>
  );
}
```

### Pattern 2: Infinite Scroll

```javascript
function InfiniteEventScroll() {
  const { events, nextPage, hasMore } = usePaginatedEvents();
  const scrollRef = useRef();

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore) nextPage();
    });
    if (scrollRef.current) obs.observe(scrollRef.current);
    return () => obs.disconnect();
  }, [hasMore, nextPage]);

  return (
    <>
      {events.map(e => <div key={e.tipId}>{e.event}</div>)}
      <div ref={scrollRef}>Loading...</div>
    </>
  );
}
```

### Pattern 3: Measure Performance

```javascript
import { getEnrichmentMetrics } from '../lib/enrichmentMetrics';

function PerformanceMonitor() {
  const metrics = getEnrichmentMetrics();
  return <pre>{JSON.stringify(metrics, null, 2)}</pre>;
}
```

## Best Practices

### DO

✓ Use `useFilteredAndPaginatedEvents` for standard event listing
✓ Call `useSelectiveMessageEnrichment` only with visible tips
✓ Check `hasMore` before calling `nextPage()`
✓ Monitor metrics in development with `getEnrichmentMetrics()`
✓ Cache cursors for bookmark/share functionality

### DON'T

✗ Bypass page cache for frequent fetches (always try cache first)
✗ Fetch all tip messages at once (use selective enrichment)
✗ Create multiple `usePaginatedEvents` in the same component tree
✗ Modify cached page objects directly (they're copies)
✗ Trust offset-based pagination for long-running sessions

## Extending the System

### Adding Custom Cache Invalidation

```javascript
import { invalidatePagesWithSize } from '../lib/eventPageCache';

// When a new tip is sent, invalidate early pages
function onTipSent(tipId) {
  invalidatePagesWithSize(10, 100);  // Clear cache before offset 100
}
```

### Adding Custom Metrics

```javascript
import { recordEnrichmentRequest } from '../lib/enrichmentMetrics';

// Track custom operation
recordEnrichmentRequest(25, 18, 142);  // 25 tips, 18 cache hits, 142ms
```

### Creating a Custom Hook

```javascript
function useRecentTips(limit = 5) {
  const { events } = usePaginatedEvents();
  return events.slice(0, limit).sort((a, b) => b.timestamp - a.timestamp);
}
```

## Troubleshooting

### "Messages not loading"

Check that `useSelectiveMessageEnrichment` is receiving actual paginated
tips, not the entire events array.

### "Pagination jumps around"

Verify that `useFilteredAndPaginatedEvents` is receiving a stable events
array from TipContext (use `useCallback` in parent if needed).

### "Cache not working"

Check that page size matches in both setCachedPage and getCachedPage calls.
Default is 10 - ensure all consumers use the same constant.

### "Performance not improving"

Use `getEnrichmentMetrics()` to verify cache hit rate is > 70%.
If hits are low, messages may be loading for all tips instead of visible only.

## Testing

```javascript
import { describe, it, expect } from 'vitest';
import { useFilteredAndPaginatedEvents } from './useFilteredAndPaginatedEvents';
import { renderHook, act } from '@testing-library/react';

describe('useFilteredAndPaginatedEvents', () => {
  it('filters tips by search query', () => {
    const events = [
      { event: 'tip-sent', sender: 'alice', recipient: 'bob' },
      { event: 'tip-sent', sender: 'charlie', recipient: 'dave' },
    ];
    const { result } = renderHook(() => useFilteredAndPaginatedEvents(events));

    act(() => {
      result.current.setSearchQuery('alice');
    });

    expect(result.current.filteredTips).toHaveLength(1);
  });
});
```

## References

- `docs/PERFORMANCE_PROFILING.md` - Performance measurement guide
- `ARCHITECTURE.md` - System architecture overview
- `frontend/src/components/RecentTips.jsx` - Example implementation
