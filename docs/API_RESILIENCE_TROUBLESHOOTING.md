# API Resilience Troubleshooting Guide

Solutions for common issues with the Hiro API integration and cache fallback system.

## Cache System Overview

TipStream uses a multi-layer cache strategy:

1. **Memory Cache**: In-memory event cache with polling (30s interval)
2. **Message Cache**: 5-minute TTL for tip messages (lib/fetchTipDetails.js)
3. **Persistent Cache**: localStorage backup for feed/stats (useCachedData.js)
4. **Index Cache**: Page-level event cache with 2-minute TTL (eventPageCache.js)

## Troubleshooting: Common Scenarios

### Scenario 1: Feed Not Loading at All

**Symptoms**: RecentTips component shows spinner indefinitely, no data/error after 10 seconds

**Diagnostic Steps**:

```javascript
// In browser console:
window.printDiagnostics()

// Check cache status:
Object.keys(localStorage).filter(k => k.includes('tipstream'))

// Check TipContext state:
// (if dev tools enable inspection)
```

**Common Causes**:

| Cause | Check | Fix |
|---|---|---|
| Hiro API down | Network tab - GET /v2/smart_contracts/... fails | Wait for Hiro recovery or serve from cache |
| Bad contract address | Console for 404 | Verify CONTRACT_ADDRESS in config |
| Wallet not ready | Check connect state | Retry after wallet connection |
| Cache expired | Check localStorage age | Reload page to trigger refresh |
| CORS issue | Network tab shows CORS error | Check Hiro CORS config (shouldn't happen) |

**Resolution**:

- If API returns 503: System automatically falls back to cache
- If cache is empty: User sees empty state with "Retry" button
- If cache is stale: FreshnessIndicator shows "Last updated X minutes ago"

---

### Scenario 2: Feed Shows Stale Data, Won't Refresh

**Symptoms**: "Last retrieved from cache" shows, clicking Retry doesn't update, network appears
 online

**Diagnostic Steps**:

```javascript
// Check if online
navigator.onLine  // Should be true

// Check if fetch is actually happening:
// Network tab → Filter by XHR → Send request
// Should see new API call

// Check cache TTL:
const cached = JSON.parse(localStorage.getItem('tipstream_feed_cache'))
console.log(cached?.cachedAt, new Date().getTime() - cached?.cachedAt)
```

**Common Causes**:

| Cause | Indicator | Fix |
|---|---|---|
| API returning 500s | Network tab shows persistent 5xx | Wait for Hiro recovery |
| Cache still valid | Timestamp recent (< 2 min old) | Normal - cache won't refresh if < TTL |
| Poll not running | No XHR calls in Network every 30s | Reload page to restart polling |
| Selective enrichment stuck | Messages not appearing | Check browser console for JS errors |

**Resolution**:

- API 5xx errors → Cache serves indefinitely until API recovers
- Normal cache hit → FreshnessIndicator shows time since fetch
- Click "Retry" to force immediate fetch attempt

---

### Scenario 3: Transactions Disabled, Can't Send Tips

**Symptoms**: Send button grayed out with message "Temporarily unavailable" even though online

**Diagnostic Steps**:

```javascript
// Check if transaction lockout active:
const cacheOnlyMode = Boolean(
  localStorage.getItem('tipstream_cache_only_mode')
)
console.log('Cache-only mode:', cacheOnlyMode)

// Check data freshness:
const feed = JSON.parse(localStorage.getItem('tipstream_feed_cache'))
console.log('Feed age (ms):', Date.now() - feed?.cachedAt)
```

**Common Causes**:

| Cause | Indicator | Fix |
|---|---|---|
| API was down, now recovering | Network shows some 5xx then 200s | Reload page to exit cache-only mode |
| Cache-only flag stuck | localStorage key persists after recovery | Clear flags: `localStorage.clear()` then reload |
| Network actually offline | navigator.onLine === false | Restore network connectivity |
| API degradation ongoing | Persistent 503 in Network tab | Wait for Hiro API recovery |

**Why Transactions Are Locked**:

- During API outages, data may be stale
- Sending tips to stale addresses could be unsafe
- Transactions prevented to avoid user error
- When API recovers, transactions re-enabled automatically

**Manual Recovery**:

```javascript
// If stuck in cache-only mode after API recovery:
localStorage.removeItem('tipstream_cache_only_mode')
location.reload()
```

---

### Scenario 4: Messages Not Showing in Feed

**Symptoms**: Tips appear in feed but Message field is empty or shows "Loading..."

**Diagnostic Steps**:

```javascript
// Check selective enrichment status:
window.printDiagnostics()  // Look for enrichment metrics

// Check message cache:
const msgCache = JSON.parse(localStorage.getItem('tipstream_messages_cache')) || {}
console.log('Cached messages:', Object.keys(msgCache).length)

// Check pending requests:
// Network tab → Filter XHR → Look for read-only calls
```

**Common Causes**:

| Cause | Indicator | Fix |
|---|---|---|
| High concurrency limit hit | Many tips show "Loading..." | Wait (fetches at CONCURRENCY_LIMIT=5) |
| Message contract call fails | Console errors `read-only call failed` | Hiro API temporarily degraded, wait |
| Message cache expired | 5-minute TTL exceeded | Reload page to re-fetch |
| Selective enrichment not triggered | Only visible tips load messages | Scroll to more tips to trigger |

**How Selective Enrichment Works**:

1. Tips render initially without messages ("Loading...")
2. `useSelectiveMessageEnrichment` hook detects visible tips
3. Hook batches message fetches (5 concurrent max)
4. Messages populate as they return
5. Results cached for 5 minutes

**Performance Note**:

- Initial load shows ~10 tips without messages (fast)
- Messages load concurrently (30-500ms per batch)
- Scrolling triggers loading for new visible tips
- Cached messages appear instantly

---

### Scenario 5: Pagination Creates Duplicates or Skips

**Symptoms**: Scrolling shows same tip twice or sees tip A, then B, then A again

**Diagnostic Steps**:

```javascript
// Check cursor state:
window.printDiagnostics()  // Look for pagination cursor

// Monitor page loads:
// Network tab → Filter by "events" or contract calls
// Should see increasing pageNumber with different cursors
```

**Why This Shouldn't Happen**:

- Cursor-based pagination encodes: [txId, timestamp, tipId]
- Cursors stable even as new tips arrive
- Deduplication prevents duplicate rendering

**If Still Seeing Duplicates**:

| Cause | Check | Fix |
|---|---|---|
| Stale event cache | Events map timestamps before fetch | Reload page to reset cache |
| TipContext cache not updated | Check TipContext polling working | Verify polling interval still running |
| Cursor encoding bug | Check eventCursorManager.js | File issue with cursor example |

**Recovery**:

```javascript
// Clear caches and restart:
localStorage.clear()
location.reload()
```

---

### Scenario 6: Performance Degradation Over Time

**Symptoms**: Feed loads fast initially, but gets slower after 30+ minutes of usage

**Diagnostic Steps**:

```javascript
// Check memory usage (DevTools):
// Performance tab → Record for 30s of scrolling
// Look for growing heap size

// Check cache sizes:
Object.keys(localStorage).reduce((sum, k) =>
  sum + localStorage.getItem(k).length, 0) / 1024 / 1024
// Result in MB

// Check polling frequency:
// Network tab → Filter XHR → Count requests in 1 minute
// Should see ~2 requests/minute (1 every 30s)
```

**Common Causes**:

| Cause | Indicator | Fix |
|---|---|---|
| Unbounded event array | Heap grows over time | TipContext should paginate, not accumulate |
| Message cache too large | localStorage > 50MB | Clear expired caches (TTL should handle) |
| Polling too frequent | Network shows > 4 req/min from tips | Check POLL_INTERVAL_MS in contractEvents.js |
| React re-renders excessive | DevTools shows 100+ renders/min | Check memoization in RecentTips component |

**Expected Behavior After 30 Minutes**:

- ~30 API calls total (1 every 30s × 60min)
- localStorage stays under 10MB (feed + messages caches)
- JS memory stable (garbage collection active)
- UI responsive with <100ms interaction latency

---

## Prevention: Monitoring Checklist

**Daily**:
- [ ] Check Hiro API status page
- [ ] Test tip sending on tipstream.xyz
- [ ] Verify feed loads within 3 seconds

**Weekly**:
- [ ] Run `window.printDiagnostics()` in production
- [ ] Review error logs for API failures
- [ ] Check cache hit rate > 70%

**Monthly**:
- [ ] Load test with 100 concurrent users
- [ ] Verify pagination works across 10+ pages
- [ ] Check localStorage size stays reasonable

**Quarterly**:
- [ ] Review CONCURRENCY_LIMIT effectiveness
- [ ] Audit message cache TTL vs user expectations
- [ ] Profile memory usage on low-end devices

---

## Debug Mode

Enable comprehensive diagnostics:

```javascript
// In browser console:
// Enable debug logging
localStorage.setItem('tipstream_debug', 'true')
location.reload()

// Run diagnostics:
window.printDiagnostics()

// Check specific metrics:
console.log(window.tipstreamMetrics?.cacheSummary)
console.log(window.tipstreamMetrics?.apiFailures)
console.log(window.tipstreamMetrics?.enrichmentStats)
```

**Debug Output Includes**:
- Cache hit/miss counts
- API failure timestamps
- Enrichment queue status
- Memory consumption
- Current cursor state

---

## Escalation Procedures

### If Hiro API Is Down

1. **User Impact**: Feed shows cache, transactions disabled
2. **Expected Duration**: Typically 15-60 minutes
3. **Communication**: Post status in Discord/Twitter
4. **Resolution**: Wait for Hiro recovery (managed by Hiro team)

### If Contract Is Paused

1. **User Impact**: Transactions fail with "Contract paused" error
2. **Expected Duration**: Depends on pause reason
3. **Communication**: Admin posts explanation
4. **Resolution**: Admin unpauses when issue resolved

### If Multiple Systems Down

1. **Check Status**:
   - [ ] Hiro API status
   - [ ] Vercel deployment status
   - [ ] Stacks network status
2. **Notify Team**: Ping #incidents on Slack
3. **Document**: Log incident with timestamps and impact
4. **Post-mortem**: Review within 24 hours

---

## References

- [API Resilience Architecture](ARCHITECTURE.md#api-resilience-layer)
- [Last-Known-Good Caching (ADR-003)](ARCHITECTURE_DECISIONS.md#adr-003)
- [Resilience Monitoring](ARCHITECTURE_DECISIONS.md#adr-008)
- [useCachedData Hook](../frontend/src/hooks/useCachedData.js)
- [Resilience Utilities](../lib/resilience.js)

---

**Last Updated:** March 2026
**Maintained by:** TipStream Team
**SLA:** 99% uptime (Hiro API dependent)

