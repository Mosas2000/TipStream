# Telemetry and Web Vitals Monitoring

TipStream includes comprehensive telemetry infrastructure for monitoring production performance, user behavior, and application health. This system distinguishes between local development, staging, and production environments.

## Overview

The telemetry system tracks:

- Web Vitals (LCP, CLS, INP, FCP, TTFB)
- User conversion funnels (wallet connection, tip submission, confirmation)
- Route usage and navigation patterns
- Error tracking and failure patterns
- Wallet metrics (connections, retention, drop-off)
- Batch tip statistics

## Architecture

### Environment Detection

The system automatically detects the runtime environment:

- **Local**: `localhost` or `127.0.0.1`
- **Development**: Vite dev server
- **Staging**: Hostnames containing `staging` or `preview`
- **Production**: All other hostnames

Telemetry data is stored separately per environment to prevent cross-contamination.

### Storage Layer

All telemetry is stored in browser `localStorage` with environment-specific keys:

```javascript
tipstream_telemetry_{environment}_{key}
```

This allows operators to distinguish local testing from real production signals.

### Data Collection

The system collects data through the `analytics` module:

- **Page views**: Tracked on route change
- **Wallet events**: Connect, disconnect
- **Tip lifecycle**: Started, submitted, confirmed, cancelled, failed
- **Batch tips**: Same lifecycle plus batch size tracking
- **Web Vitals**: Automatic via `web-vitals` library
- **Errors**: Caught by error boundaries and logged

### Export Capabilities

Telemetry can be exported in multiple formats:

- **JSON**: Full data export with all environments
- **CSV**: Tabular summary for spreadsheet analysis
- **Clipboard**: Quick copy for sharing

## Accessing the Dashboard

Navigate to `/telemetry` (admin-only route). The dashboard displays:

- **Environment indicator**: Shows current environment (local/staging/production)
- **Key metrics cards**: Sessions, page views, tips confirmed, conversion rate
- **Web Vitals panel**: Core Web Vitals with ratings and overall score
- **Conversion funnels**: Tip and batch tip funnels with drop-off analysis
- **Route usage**: Top pages by view count
- **Error log**: Most common errors
- **Wallet metrics**: Connection patterns and retention

## Remote Telemetry Sink

For production deployments, configure a remote ingestion endpoint:

### Configuration

Set the following environment variables:

```bash
VITE_TELEMETRY_ENABLED=true
VITE_TELEMETRY_ENDPOINT=https://telemetry.example.com/ingest
VITE_TELEMETRY_API_KEY=your-secret-key
```

### Sink Behavior

When enabled:

- Events are queued in-memory (batch size: 10)
- Automatic flush every 30 seconds
- Retry on failure (3 attempts with exponential backoff)
- Bearer token authentication if API key provided

### Manual Sync

Click the "Sync" button in the dashboard to immediately send a snapshot to the configured endpoint.

## Web Vitals Thresholds

The system uses Google's recommended thresholds:

| Metric | Good        | Needs Improvement | Poor      |
|--------|-------------|-------------------|-----------|
| LCP    | ≤ 2.5s      | ≤ 4.0s            | > 4.0s    |
| CLS    | ≤ 0.1       | ≤ 0.25            | > 0.25    |
| INP    | ≤ 200ms     | ≤ 500ms           | > 500ms   |
| FCP    | ≤ 1.8s      | ≤ 3.0s            | > 3.0s    |
| TTFB   | ≤ 800ms     | ≤ 1.8s            | > 1.8s    |

### Overall Score

The dashboard computes an overall score based on Core Web Vitals (LCP, CLS, INP):

- **Excellent**: ≥ 90
- **Good**: ≥ 75
- **Needs Work**: ≥ 50
- **Poor**: < 50

## Conversion Funnels

### Tip Funnel Stages

1. **Wallet Connected**: User authenticated with wallet
2. **Tip Started**: User opened tip form
3. **Tip Submitted**: Transaction sent to wallet
4. **Tip Confirmed**: Transaction confirmed on-chain

Drop-off alerts trigger when:

- **High severity**: > 50% drop at any stage
- **Medium severity**: > 25% drop at any stage

### Batch Tip Funnel

Similar stages for batch operations, plus:

- **Average batch size**: Mean recipients per batch
- **Batch size distribution**: Frequency of each batch size

## Error Tracking

Errors are captured with context:

```
{component}:{message}
```

The dashboard shows the top 10 errors by frequency. Use this to identify:

- Recurring failures
- Contract call rejections
- Network issues
- Validation errors

## Storage Management

The dashboard footer displays storage usage:

- **Total storage**: All localStorage data
- **Telemetry storage**: Only telemetry data

To clear all telemetry data, click the "Reset" button (requires confirmation).

## Testing Telemetry

All telemetry modules have comprehensive test coverage:

```bash
npm test telemetry-env
npm test telemetry-storage
npm test telemetry-export
npm test telemetry-sink
npm test telemetry-vitals
npm test telemetry-funnel
```

## Privacy Considerations

- No personally identifiable information (PII) is collected
- Wallet addresses are not included in telemetry
- All data stays in the user's browser unless remote sink is configured
- The remote sink is opt-in and requires explicit configuration

## Production Best Practices

1. **Enable remote sink** for persistent monitoring
2. **Review Web Vitals weekly** to catch performance regressions
3. **Monitor conversion funnels** to identify UX friction
4. **Track error trends** for proactive issue resolution
5. **Export historical data** before major deployments

## Troubleshooting

### Dashboard shows no data

- Check that analytics events are firing (browser console)
- Verify localStorage is enabled
- Ensure you're on the correct environment

### Sink sync fails

- Verify endpoint URL is reachable
- Check API key is correct
- Review browser console for error details
- Ensure CORS is configured on the ingestion endpoint

### Web Vitals not recorded

- Web Vitals require real user interaction
- Some vitals only report on page navigation or load
- Check that `reportWebVitals()` is called in `main.jsx`

## API Reference

### Telemetry Modules

- `lib/telemetry-env.js`: Environment detection
- `lib/telemetry-storage.js`: localStorage abstraction
- `lib/telemetry-export.js`: Export and download
- `lib/telemetry-sink.js`: Remote ingestion
- `lib/telemetry-vitals.js`: Web Vitals utilities
- `lib/telemetry-funnel.js`: Conversion funnel calculations

### Configuration

- `config/telemetry.js`: Sink configuration and initialization

### Components

- `components/TelemetryDashboard.jsx`: Main dashboard UI
