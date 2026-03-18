# Migration Guide: Last-Known-Good Caching (Issue #290)

## Overview

This guide helps you integrate last-known-good caching into existing read-heavy components to improve resilience during API outages.

## What Each Component Does

| Component | Purpose | Use When |
|---|---|---|
| `useCachedData` | Generic fetch + cache + fallback | Building custom data sources |
| `useCachedStats` | Platform stats-specific | Displaying platform statistics |
| `useCachedLeaderboard` | Leaderboard-specific | Displaying leaderboard rankings |
| `cachedApiClient` | Transparent HTTP wrapper | Replacing fetch() globally |
| `FreshnessIndicator` | Visual cache status | Any cached data display |
| `useTransactionLockout` | Transaction gate | Send/Batch tip forms |
| `ResilienceContext` | Global resilience state | App-level coordination |

## Step 1: Wrap a Component with Resilience Provider

In your App root:

```javascript
import { ResilienceProvider } from '../context/ResilienceContext';

function App() {
  return (
    <ResilienceProvider>
      <TipProvider>
        {/* your app */}
      </TipProvider>
    </ResilienceProvider>
  );
}
```

## Step 2: Migrate Read-Heavy Components

### Before: Direct API Fetch

```javascript
function PlatformStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return loading ? <Spinner /> : <StatsDisplay stats={stats} />;
}
```

### After: With Cache Fallback

```javascript
import { useCachedStats } from '../hooks/useCachedStats';
import { FreshnessIndicator } from '../components/FreshnessIndicator';

function PlatformStats() {
  const {
    stats,
    loading,
    source,
    metadata,
    retry,
  } = useCachedStats(() => fetch('/api/stats').then(r => r.json()));

  return (
    <>
      <FreshnessIndicator
        source={source}
        metadata={metadata}
        loading={loading}
        onRetry={retry}
      />
      {loading ? <Spinner /> : <StatsDisplay stats={stats} />}
    </>
  );
}
```

## Step 3: Protect Transactions

### Before: Always Allow

```javascript
function SendTip() {
  const [sending, setSending] = useState(false);

  return (
    <button onClick={handleSend} disabled={sending}>
      Send Tip
    </button>
  );
}
```

### After: Check Resilience Status

```javascript
import { useTransactionLockout } from '../hooks/useTransactionLockout';
import { useCachedStats } from '../hooks/useCachedStats';

function SendTip() {
  const { stats, source } = useCachedStats(fetchBalance);
  const { isLocked, lockReason } = useTransactionLockout({ primary: source });
  const [sending, setSending] = useState(false);

  if (isLocked) {
    return (
      <div>
        <Alert>{lockReason}</Alert>
        <button disabled>{sending ? 'Sending...' : 'Temporarily unavailable'}</button>
      </div>
    );
  }

  return (
    <button onClick={handleSend} disabled={sending}>
      {sending ? 'Sending...' : 'Send Tip'}
    </button>
  );
}
```

## Step 4: Handle Cache Invalidation

### On Tip Sent

```javascript
import { useResilience } from '../context/ResilienceContext';

function TipForm() {
  const { notifyTipSent } = useResilience();

  const handleTipSent = useCallback(async (tip) => {
    // ... send the tip ...
    notifyTipSent();  // Invalidate related caches
  }, [notifyTipSent]);
}
```

### On Profile Update

```javascript
import { useResilience } from '../context/ResilienceContext';

function ProfileForm() {
  const { notifyProfileUpdate } = useResilience();

  const handleProfileUpdate = useCallback(async (profile) => {
    // ... update the profile ...
    notifyProfileUpdate();  // Invalidate related caches
  }, [notifyProfileUpdate]);
}
```

## Step 5: Optional - Use Transparent API Client

Replace fetch with automatic caching across your app:

```javascript
// Old
const data = await fetch('/api/endpoint').then(r => r.json());

// New
import { cachedGet } from '../lib/cachedApiClient';
const data = await cachedGet('/api/endpoint');
```

Benefits:
- No component changes needed
- Caching automatic based on endpoint
- POST requests bypass cache automatically

## Common Patterns

### Pattern 1: Show Stale Data During Outage

```javascript
function Leaderboard() {
  const { entries, source, metadata, retry } = useCachedLeaderboard(fetch);

  return (
    <>
      {source === 'cache' && (
        <Warning>
          Showing cached data from {formatTime(metadata.age)} ago.
          <button onClick={retry}>Refresh</button>
        </Warning>
      )}
      <LeaderboardTable entries={entries} />
    </>
  );
}
```

### Pattern 2: Disable Risky Actions

```javascript
function SettingsForm() {
  const { stats, source } = useCachedStats(fetch);
  const { isLocked, lockReason } = useTransactionLockout({ primary: source });

  return (
    <form>
      <input name="email" {...props} />
      <button type="submit" disabled={isLocked} title={lockReason}>
        Update Email
      </button>
    </form>
  );
}
```

### Pattern 3: Cascade Invalidation

```javascript
function BatchTip() {
  const { notifyTipSent } = useResilience();

  const handleBatchSuccess = useCallback(() => {
    notifyTipSent();  // Clears: leaderboard, stats, events_feed
  }, [notifyTipSent]);
}
```

## Troubleshooting

### "Data always shows as cached"

Check that the fetch is actually being made:
- DevTools Network tab
- Browser console for fetch errors
- Check timeout value (not too aggressive)

### "Cache doesn't appear during outage"

Debug storage:
```javascript
import { getCacheStats } from '../lib/persistentCache';
console.log(getCacheStats());  // Check what's cached
console.log(localStorage);  // Check storage size
```

### "Transactions not locking"

Verify source is actually 'cache' or 'none':
```javascript
const { stats, source } = useCachedStats(...);
console.log('Current source:', source);  // Should be 'cache' during outage
```

### "Old data persists too long"

Check TTL: data won't fall back to cache after TTL expires.
Adjust in hook calls:
```javascript
useCachedStats(fetchFn, { ttl: 60000 })  // 1 minute cache
```

## Testing Your Implementation

### Manual Test: Simulate Outage

1. Open app and load a page
2. DevTools → Network → Offline
3. Modify data (if UI allows)
4. Verify:
   - Data still displays ✓
   - Freshness indicator shows cache ✓
   - Transactions are locked ✓

### Manual Test: Verify Invalidation

1. Send a tip successfully
2. Immediately check leaderboard
3. Verify it reloaded (not showing stale rank)

### Manual Test: Check Cache Size

```javascript
import { getCacheStats } from '../lib/persistentCache';
const stats = getCacheStats();
console.log(`Cached ${stats.totalEntries} items, ${stats.totalSize} bytes`);
```

## Performance Considerations

- Cache TTL balanced between freshness and resilience
- Storage limited by localStorage quota (~5-10MB)
- Regular invalidation prevents stale data
- Monitor `getCacheStats()` to catch issues

## Backwards Compatibility

All changes are additive and non-breaking:
- Existing components continue working unchanged
- New components can gradually adopt caching
- No migration required for transactional components

## Next Steps

1. Wrap ResilienceProvider at app root
2. Migrate read-heavy views (stats, leaderboard)
3. Add transaction locks to forms
4. Test during network degradation
5. Monitor cache stats in production

## References

- LAST_KNOWN_GOOD_CACHING.md - Full system documentation
- useCachedData.js - Low-level API
- persistentCache.js - Storage layer
- FreshnessIndicator.jsx - UI component
