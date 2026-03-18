# Last-Known-Good Caching for API Resilience

## Overview

This system enables graceful fallback to cached data when read-heavy APIs are unavailable or degraded. Users continue to see recent data during outages instead of empty states, significantly improving perceived reliability.

## Architecture

```
Live API Request
    |
    v
Try Fetch (timeout: 10s)
    |
    ├─ Success?
    │  ├─ Yes: Cache result (TTL: 2-5 min)
    │  │        Return live data
    │  │        Mark as LIVE
    │  │
    │  └─ No: (timeout/error)
    │         Get cached data
    │         If cached: Return cache
    │         If not cached: Return error
    │         Mark as CACHE or NONE
    │
    v
Display with metadata
(freshness indicator)
```

## Components

### 1. Persistent Cache (`persistentCache.js`)

Low-level localStorage wrapper with TTL support.

```javascript
import { setCacheEntry, getCacheEntry, getCacheMetadata } from '../lib/persistentCache';

setCacheEntry('key', data, 300000);  // Cache for 5 minutes
const cached = getCacheEntry('key');  // null if expired/not found
const meta = getCacheMetadata('key'); // { timestamp, age, ttl, isExpired }
```

### 2. Cached Data Hook (`useCachedData`)

Automatically fetches live data and falls back to cache.

```javascript
import { useCachedData } from '../hooks/useCachedData';

const {
  data,           // The actual data (live or cached)
  source,         // 'live', 'cache', or 'none'
  isCached,       // boolean
  isLive,         // boolean
  metadata,       // { age, isExpired, expiresAt }
  error,          // Error message if fetch failed
  loading,        // Currently fetching
  retry,          // Manual refresh function
} = useCachedData('my-key', fetchFunction, {
  ttl: 300000,      // Cache for 5 minutes
  timeout: 10000,   // Fail if fetch takes > 10s
});
```

### 3. Freshness Indicator (`FreshnessIndicator.jsx`)

Visual feedback about data source and age.

```javascript
import { FreshnessIndicator } from '../components/FreshnessIndicator';

<FreshnessIndicator
  source={source}
  metadata={metadata}
  loading={loading}
  onRetry={retry}
/>
```

### 4. Transaction Lockout (`useTransactionLockout`)

Prevents transactions when live data unavailable.

```javascript
import { useTransactionLockout } from '../hooks/useTransactionLockout';

const { isLocked, lockReason, severity } = useTransactionLockout({
  primary: dataSource,  // 'live', 'cache', or 'none'
});

if (isLocked) {
  return <button disabled>{lockReason}</button>;
}
```

### 5. Cache Invalidation (`cacheInvalidationManager.js`)

Strategic cache clearing on state changes.

```javascript
import {
  invalidateOnTipSent,
  invalidateOnProfileUpdate,
  invalidateUserBalance,
} from '../lib/cacheInvalidationManager';

// Clear related caches when tip is sent
invalidateOnTipSent();  // Clears: leaderboard, stats, events_feed
```

## Usage Patterns

### Pattern 1: Simple Live Data with Fallback

```javascript
function Stats() {
  const { stats, source, metadata, retry } = useCachedStats(
    async () => {
      const res = await fetch('/api/stats');
      return res.json();
    }
  );

  return (
    <div>
      <FreshnessIndicator
        source={source}
        metadata={metadata}
        onRetry={retry}
      />
      <StatsList data={stats} />
    </div>
  );
}
```

### Pattern 2: Protected Transactions

```javascript
function SendTip() {
  const { stats, source } = useCachedStats(fetchStats);
  const { isLocked, lockReason } = useTransactionLockout({ primary: source });

  return (
    <form>
      {isLocked && <Alert>{lockReason}</Alert>}
      <button disabled={isLocked}>
        {isLocked ? 'Unavailable' : 'Send Tip'}
      </button>
    </form>
  );
}
```

### Pattern 3: Manual Cache Control

```javascript
function Leaderboard() {
  const { data, source, metadata, retry } = useCachedData(
    'leaderboard',
    fetchLeaderboard,
    { ttl: 300000, timeout: 8000 }
  );

  return (
    <>
      <button onClick={retry}>
        {source === 'cache' ? 'Refresh from server' : 'Retry'}
      </button>
      <LeaderboardTable entries={data} />
    </>
  );
}
```

## Cache TTL Guidelines

| View | TTL | Justification |
|---|---|---|
| Platform Stats | 2-5 min | Changed rarely, safe to cache |
| Leaderboard | 5-10 min | Aggregated data, not real-time |
| User Balance | 1 min | Used for transaction validation |
| Event Feed | 30 sec | Time-series data, freshness matters |
| User Profile | 10 min | Changed by user action, safe |

## Invalidation Triggers

### On Tip Sent
- Platform stats (total volume increased)
- Leaderboard (rankings may change)
- Event feed (new event added)

### On Profile Update
- User profile cache for that user
- Leaderboard (profile info changed)

### On Balance Change
- User balance cache

### Manual Refresh
- User clicks "Retry" button
- User navigates to a new view
- Explicit clearCache() call

## Visual Feedback

### Live Data (Green dot, pulses)
```
● Live data
```

### Cached Data (Amber dot)
```
● Last retrieved from cache (5m ago) [Retry]
```

### Unavailable (Red dot)
```
● Data unavailable
```

## Best Practices

✓ Set appropriate TTLs based on data change frequency
✓ Show freshness metadata so users know what they're seeing
✓ Use retry buttons on cached data to re-attempt live fetch
✓ Lock transactions when data source is 'none' or 'cache'
✓ Invalidate related caches to prevent stale cascades
✓ Test fallback behavior with network throttling

✗ Don't cache transactional data (confirmations, receipts)
✗ Don't hide that data is cached from the user
✗ Don't use indefinite TTLs
✗ Don't allow transactions with stale balance data
✗ Don't fail hard when cache is empty

## Testing

### Manual Testing

1. **Verify Live Fetch:**
   - Clear cache: `localStorage.clear()`
   - Load page
   - DevTools Network tab shows fetch
   - Indicator shows "Live data"

2. **Verify Cache Fallback:**
   - Load page successfully (populates cache)
   - Throttle network (DevTools → Network → Throttle)
   - Reload page
   - Indicator shows "Last retrieved from cache"

3. **Verify Invalidation:**
   - Send a tip
   - Leaderboard cache should be cleared
   - Leaderboard reloads on next view

4. **Verify Transaction Lock:**
   - Simulate offline: DevTools → Network → Offline
   - "Send Tip" button disabled with message

## Monitoring

Check cache stats in browser console:

```javascript
import { getCacheStats } from '../lib/persistentCache';

console.log(getCacheStats());
// {
//   totalEntries: 5,
//   totalSize: 84532,
//   entries: [
//     { key: 'platform_stats', age: 45000, ttl: 300000, isExpired: false }
//     ...
//   ]
// }
```

## Troubleshooting

### Data Always Shows "Cached"
- Check network tab: is fetch request being made?
- Check timeout value: might be too short
- Check browser console for fetch errors

### Cache Doesn't Show During Outage
- Verify TTL hasn't expired
- Check localStorage quota (might be full)
- Check browser privacy settings (might disable localStorage)

### Transactions Don't Lock
- Verify source is 'cache' or 'none' (check console)
- Verify `useTransactionLockout` is being used
- Check that `isLocked` is wired to button disabled state

### Stale Data After Update
- Verify invalidation trigger is called
- Check cache invalidation manager logs
- Manually clear cache: `localStorage.clear()`

## References

- See `persistentCache.js` for low-level API
- See `useCachedData.js` for fetch wrapping
- See `FreshnessIndicator.jsx` for UI patterns
- See `PlatformStats.jsx` for complete example
