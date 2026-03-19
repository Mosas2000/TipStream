# Monitoring & Observability Guide

Comprehensive guide to monitoring TipStream health and performance in production.

## Monitoring Objectives

**Availability**: > 99% uptime (Hiro API dependent)
**Performance**: Feed loads < 3 sec, transactions < 30 sec
**Reliability**: Zero unhandled errors, < 0.1% failed transactions
**Responsiveness**: Cache hit rate > 70%

## Key Metrics

### User-Facing Metrics

| Metric | Target | Alert | Tool |
|---|---|---|---|
| Page Load Time | < 3s | > 5s | DevTools/Lighthouse |
| Tip Send Latency | < 30s | > 60s | Client instrumentation |
| Feed Cache Hit Rate | > 70% | < 50% | window.printDiagnostics() |
| Error Rate | < 0.1% | > 1% | Sentry/Console |

### Infrastructure Metrics

| Metric | Target | Alert | Tool |
|---|---|---|---|
| Hiro API Latency | < 500ms | > 1s | Network tab |
| Hiro API Uptime | 99%+ | Outage | Hiro status page |
| Vercel Response Time | < 200ms | > 500ms | Vercel dashboard |

### Business Metrics

| Metric | Unit | View | Note |
|---|---|---|---|
| Tips Sent | Per hour | Hiro Explorer | Real transactions |
| Total Tips | Cumulative | Contract read-only | All-time count |
| Fee Revenue | STX | Admin dashboard | Collected fees |
| Active Users | DAU | Wallet connects | From Hiro API |

## Browser Instrumentation

### Diagnostic Console: window.printDiagnostics()

Invoke in any production browser to get instant diagnostics:

```javascript
// In browser console (user can run this):
window.printDiagnostics()

// Output: {
//   timestamp: 1234567890,
//   cacheSummary: {
//     feedCache: { hits: 42, misses: 8, rate: 0.84 },
//     messageCache: { hits: 105, misses: 15, rate: 0.88 },
//     pageCache: { hits: 12, misses: 3, rate: 0.80 },
//   },
//   apiFailures: [
//     { endpoint: '/call-read', error: 'timeout', count: 1 },
//   ],
//   enrichmentStats: {
//     pending: 5,
//     completed: 47,
//     failed: 0,
//     avgTime: 315,
//   },
//   memory: { heapUsed: 28000000, heapLimit: 67000000 },
// }
```

**What to Look For**:

- `rate` < 0.5 → Cache not working well (investigate)
- `apiFailures` length > 0 → API issues
- `heapUsed` > 100MB → Memory leak possible
- `enrichmentStats.failed` > 0 → Message fetch issues

### Real-time Monitoring

```javascript
// Enable continuous logging:
localStorage.setItem('tipstream_debug', 'true')
location.reload()

// Now console.log shows:
// [tipstream] Cache hit: feed (6ms)
// [tipstream] Cache miss: messages/tip-123
// [tipstream] API call: get-contract-events (254ms)
// [tipstream] Enrichment: 10 messages queued
```

**Log Format**: `[tipstream] [operation] [details]`

## Server-Side Monitoring (Future)

### Proposed Telemetry Endpoint

Once backend exists:

```javascript
// Send metrics to /api/telemetry
const telemetry = {
  timestamp: new Date(),
  pageLoadTime: 1234,
  cacheHits: 42,
  apiErrors: 0,
  userAgent: navigator.userAgent,
}

fetch('/api/telemetry', {
  method: 'POST',
  body: JSON.stringify(telemetry),
})
```

## Vercel Monitoring

### Dashboard Checks

1. **Deployment Status**
   - Navigate to: vercel.com/tipstream
   - Check: Latest deployment green
   - Alert: Red (build failed) or orange (slow)

2. **Performance Metrics**
   - Analytics tab → Web Vitals
   - Check: First Contentful Paint < 1s
   - Check: Largest Contentful Paint < 2.5s
   - Check: Cumulative Layout Shift < 0.1

3. **Error Tracking**
   - Integrations → Sentry (if configured)
   - Check: No unhandled exceptions
   - Check: Error rate < 0.1%

### Vercel CLI Monitoring

```bash
# Check deployment status
vercel deployments

# View logs from latest deployment
vercel logs

# Check project settings
vercel project info
```

## Hiro API Health

### Status Check (Automated)

```javascript
// Periodic health check (could run in background)
async function checkHiroHealth() {
  try {
    const response = await fetch('https://api.hiro.so/v2/status', {
      timeout: 5000,
    })
    return response.ok
  } catch {
    return false
  }
}
```

### Manual Status Verification

```bash
# Check Hiro API status page
https://status.hiro.so

# Test API from command line
curl -s https://api.hiro.so/v2/status | jq .

# Expected response:
# {
#   server_version: "...",
#   status: "ok"
# }
```

### API Call Monitoring

In browser Network tab:

1. Filter by XHR requests
2. Look for calls to `/v2/smart_contracts/...`
3. Monitor:
   - Response time (should be < 500ms)
   - Success rate (should be 100%)
   - Error responses (5xx errors indicate outage)

## Incident Response

### Health Check Workflows

**Workflow 1: Page Not Loading**

1. Check: Browser console for JS errors
2. Check: Network tab for failed requests
3. Check: Is Hiro API responding? → `curl api.hiro.so/v2/status`
4. Check: Is Vercel up? → `curl tipstream.xyz/ping`
5. Action: Wait 5 min, then reload page

**Workflow 2: Feed Shows Stale Data**

1. Check: FreshnessIndicator (shows "Last cached X min ago")
2. Check: Network tab for active XHR requests
3. Check: Hiro status → Still operational?
4. Action: Click "Retry" button to force refresh
5. Action: If still stale after 30s, check Hiro status page

**Workflow 3: Transactions Failing**

1. Check: Is "Not Enough STX" error? → User funding issue
2. Check: Is "Contract Paused" error? → Admin paused contract
3. Check: Is "PostCondition Failed"? → Fee calculation issue
4. Check: Is timeout? → Hiro API slow
5. Action: Notify user of specific error

**Workflow 4: Visible Performance Degradation**

1. Check: Memory (DevTools → Memory tab)
   - Heap usage growing? → Memory leak
   - Stable? → Continue to check other factors
2. Check: Network (DevTools → Network tab)
   - Many parallel requests? → Selective enrichment working as designed
   - Constant polling? → High refresh rate detected
3. Check: CPU (DevTools → Performance tab)
   - High usage? → Expensive rendering
   - Normal? → Issue might be network-bound

## Dashboards & Reporting

### Weekly Operator Report

Email to #operations channel (template):

```
Weekly TipStream Operations Report
==================================

Availability: 99.8% (1 API hiccup Tuesday 3-4am)
Peak Load: 12 concurrent users (Wed 2pm)
Total Tips: 487 this week
Cache Hit Rate: 78% (target: >70%) ✅
Error Rate: 0.08% (target: <0.1%) ✅

Incidents:
- None this week

Alerts Triggered:
- None

Recommendations:
- Continue monitoring Hiro API latency
- Consider increasing CONCURRENCY_LIMIT if load grows
```

### Monthly Health Dashboard

Create simple HTML dashboard (optional):

```html
<h2>TipStream Health Dashboard</h2>
<p>Uptime: 99.9%</p>
<p>Average Response Time: 420ms</p>
<p>Cache Hit Rate: 76%</p>
<p>Last Updated: 2026-03-19 14:32 UTC</p>
```

Could live at: `tipstream.xyz/admin/health` (admin-only)

## Alerting

### Critical Alerts (Immediate Escalation)

| Condition | Threshold | Action |
|---|---|---|
| Hiro API down | 503 for > 30min | Page on-call, post to #incidents |
| Vercel down | Any | Revert deployment or fix ASAP |
| Contract paused unexpectedly | User sees error | Contact admin,check Git history |
| High error rate | > 1% of transactions | Check logs, consider pause until fix |

**Escalation Path**:
1. First alert → Monitor situation
2. 5 min unchanged → Notify @lead-on-call
3. 15 min unchanged → All-hands notification
4. 30+ min → Consider emergency pause

### Non-Critical Alerts (Monitoring)

| Condition | Threshold | Action |
|---|---|---|
| Slow API responses | > 1s average | Document trend, monitor |
| High memory usage | > 80MB JavaScript | Check for leaks in DevTools |
| Cache hit rate low | < 60% | Investigate if TTL too short |
| Occasional failures | < 0.5% | Monitor for patterns |

## Debug Mode

### Enabling in Production

For authorized operators only:

```javascript
// In browser console (admin/staff only):
localStorage.setItem('tipstream_debug', 'true')
location.reload()

// Disable:
localStorage.removeItem('tipstream_debug')
location.reload()
```

**Debug Features**:
- Detailed console logging of all operations
- Metrics available via `window.printDiagnostics()`
- Network request logging
- Cache contents visible

### Exported Diagnostics

```javascript
// Export diagnostics as JSON for analysis:
const diagnostics = window.getTipstreamDiagnostics?.()
const json = JSON.stringify(diagnostics, null, 2)

// Could be emailed or uploaded to support system
```

## Performance Budgeting

### Acceptable Ranges

| Metric | Baseline | Yellow | Red |
|---|---|---|---|
| Feed Load | 1.5s | 2.5s | > 3s |
| Pagination | 300ms | 800ms | > 1s |
| Message Fetch | 2s | 3s | > 4s |
| Transaction | 20s | 30s | > 60s |
| API Latency | 300ms | 700ms | > 1s |

**When to Investigate**:
- Yellow: Trend toward red, look for cause
- Red: Take action immediately (optimize/debug)

## References

- [API_RESILIENCE_TROUBLESHOOTING.md](API_RESILIENCE_TROUBLESHOOTING.md)
- [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md)
- [CONFIGURATION_REFERENCE.md](CONFIGURATION_REFERENCE.md)
- [lib/resilience.js](../lib/resilience.js) - Diagnostic utilities

---

**Last Updated:** March 2026
**Review Schedule:** Quarterly
**Maintained by:** Operations Team
**On-Call Contact**: #operations on Discord

