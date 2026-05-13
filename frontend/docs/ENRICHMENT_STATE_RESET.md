# Enrichment State Reset on Visible Set Changes

## Problem

The `useSelectiveMessageEnrichment` hook was keeping previous enrichment state while the visible tip set was changing quickly during pagination or filtering. This caused:

- Stale loading indicators remaining visible
- Stale message mappings persisting across page changes
- Infinite loops when `tipMessages` was included in effect dependencies

## Solution

### 1. Visible Set Change Detection

Added detection logic to identify when the visible tip set has materially changed:

```javascript
const visibleSetChanged = useMemo(() => {
  const current = new Set(visibleTipIds);
  const previous = new Set(previousIdsRef.current);
  
  if (current.size !== previous.size) return true;
  
  for (const id of current) {
    if (!previous.has(id)) return true;
  }
  
  return false;
}, [visibleTipIds, clearCounter]);
```

### 2. Request ID Tracking

Implemented request ID tracking to properly cancel stale requests:

```javascript
const requestId = ++activeRequestIdRef.current;

// In promise handlers:
if (requestId !== activeRequestIdRef.current) return;
```

This ensures that only the most recent request updates the state, preventing race conditions during rapid pagination.

### 3. Ref-Based Cache Tracking

Used a ref to track the cache state without triggering effect re-runs:

```javascript
const tipMessagesRef = useRef({});

// Update both state and ref
setTipMessages(prev => {
  const updated = { ...prev, ...obj };
  tipMessagesRef.current = updated;
  return updated;
});

// Check cache using ref to avoid dependency loop
const uncachedIds = visibleTipIds.filter(id => !tipMessagesRef.current[id]);
```

This prevents the infinite loop that occurred when `tipMessages` was in the effect dependencies.

### 4. State Reconciliation

When the visible set changes:

- **No overlap**: Clear all cached messages (complete page change)
- **Partial overlap**: Keep only messages for IDs still visible
- **Subset**: Reuse all cached messages (filtering to fewer items)

### 5. Loading State Management

Improved loading state management to handle edge cases:

- Set loading to false when visible set is empty
- Set loading to false when all IDs are cached
- Set loading to true only when fetching uncached IDs
- Always set loading to false in finally block for active requests

## Testing

Added comprehensive tests for:

- Rapid pagination without stale state
- Stale loading indicator prevention
- Rapid filtering changes
- State reconciliation on partial set changes
- Manual clear and re-fetch behavior

All 14 tests pass successfully.

## Impact

- Eliminates stale loading indicators during rapid navigation
- Prevents stale message data from appearing on wrong pages
- Fixes infinite loop that caused performance issues
- Maintains cache efficiency for overlapping page changes
- Improves user experience during pagination and filtering
