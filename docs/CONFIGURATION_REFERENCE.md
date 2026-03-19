# Configuration Reference

Complete guide to all TipStream configuration options for frontend and backend.

## Frontend Configuration

### Environment Variables

Create `.env.local` in frontend root:

```env
# Stacks Network
VITE_STACKS_NETWORK=mainnet                    # mainnet | testnet | devnet
VITE_STACKS_API_URL=https://api.hiro.so        # Hiro API endpoint

# Contract Configuration
VITE_CONTRACT_ADDRESS=SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream
VITE_CONTRACT_PRINCIPAL=SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T

# Feature Flags
VITE_ENABLE_BATCH_TIPPING=true                 # Batch send feature
VITE_ENABLE_PRIVACY_BLOCKING=true              # User blocking feature
VITE_ENABLE_RECURSIVE_TIPPING=true             # Tip-a-tip feature

# API Configuration
VITE_API_POLLING_INTERVAL_MS=30000             # Poll every 30 seconds
VITE_MESSAGE_CACHE_TTL_MS=300000               # 5 minutes
VITE_FEED_CACHE_TTL_MS=7200000                 # 2 hours
VITE_PAGE_CACHE_TTL_MS=120000                  # 2 minutes

# Pagination
VITE_EVENT_PAGE_LIMIT=50                       # Events per page in feed
VITE_MAX_INITIAL_PAGES=10                      # Initial bulk load
VITE_MESSAGE_CONCURRENCY_LIMIT=5               # Parallel message fetches

# Resilience
VITE_ENABLE_CACHE_FALLBACK=true                # Last-known-good cache
VITE_CACHE_EXPIRY_GRACE_PERIOD_MS=3600000      # 1 hour grace period
VITE_API_TIMEOUT_MS=10000                      # Request timeout

# Analytics (optional)
VITE_ENABLE_DIAGNOSTICS=false                  # Debug mode (disable in prod)
VITE_TELEMETRY_ENDPOINT=                       # Optional: Send metrics

# UI Configuration
VITE_ITEMS_PER_PAGE=10                         # Pagination size
VITE_MAX_MESSAGE_LENGTH=280                    # Tip message char limit
VITE_MIN_TIP_AMOUNT_STX=0.001                  # Minimum tip (microSTX)

# Wallet Configuration
VITE_WALLET_NETWORKS=mainnet,testnet           # Supported networks
VITE_WALLET_PROVIDERS=leather,xverse           # Supported wallets
```

### Runtime Configuration

Key configuration files:

**`frontend/src/config/constants.js`**:

```javascript
export const CONFIG = {
  // Network
  NETWORK: import.meta.env.VITE_STACKS_NETWORK ?? 'mainnet',
  API_URL: import.meta.env.VITE_STACKS_API_URL,

  // Contract
  CONTRACT_ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS,
  CONTRACT_PRINCIPAL: import.meta.env.VITE_CONTRACT_PRINCIPAL,

  // Performance
  POLL_INTERVAL_MS: parseInt(import.meta.env.VITE_API_POLLING_INTERVAL_MS ?? 30000),
  MSG_CACHE_TTL: parseInt(import.meta.env.VITE_MESSAGE_CACHE_TTL_MS ?? 300000),
  PAGE_LIMIT: parseInt(import.meta.env.VITE_EVENT_PAGE_LIMIT ?? 50),

  // Resilience
  CACHE_FALLBACK_ENABLED: JSON.parse(import.meta.env.VITE_ENABLE_CACHE_FALLBACK ?? 'true'),
  CACHE_GRACE_PERIOD: parseInt(import.meta.env.VITE_CACHE_EXPIRY_GRACE_PERIOD_MS ?? 3600000),
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT_MS ?? 10000),
}
```

### Feature Flags

Control features via environment variables:

| Flag | Default | Purpose | Notes |
|---|---|---|---|
| `VITE_ENABLE_BATCH_TIPPING` | true | Enable batch send | Could disable for maintenance |
| `VITE_ENABLE_PRIVACY_BLOCKING` | true | User blocking | Beta feature in FEATURE_STATUS.md |
| `VITE_ENABLE_RECURSIVE_TIPPING` | true | Tip-a-tip | Beta feature in FEATURE_STATUS.md |
| `VITE_ENABLE_CACHE_FALLBACK` | true | Offline cache | Disable to force live-only mode |
| `VITE_ENABLE_DIAGNOSTICS` | false | Debug console | Set to "true" for production debugging |

## Backend/API Configuration

### Hiro API Endpoints

Primary integration point for TipStream:

```javascript
// Read-only contract calls
GET https://api.hiro.so/v2/smart_contracts/call-read

// Contract info
GET https://api.hiro.so/v2/smart_contracts/{address}

// Transaction history
GET https://api.hiro.so/v2/smart_contracts/{address}/transactions

// Block info
GET https://api.hiro.so/v2/blocks/{height}
```

**Current Configuration**:
- Base URL: `https://api.hiro.so`
- Network: Mainnet (Stacks)
- Rate Limit: ~10 req/sec per IP (monitored)

### Contract Deployment Configuration

**`contracts/Mainnet.toml`** (not in repo, local only):

```toml
[development.testnet]
name = "tipstream"
path = "contracts/tipstream.clar"
clarity_version = "3"

[development.mainnet]
name = "tipstream"
path = "contracts/tipstream.clar"
clarity_version = "3"

# Local deployment:
[[deployments.mainnet]]
network = "mainnet"
deployer = "SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T"
```

Actual deployment via:

```bash
# Testnet
npx @stacks/cli deploy --network testnet

# Mainnet (requires real account)
npx @stacks/cli deploy --network mainnet
```

## Cache Configuration

### Storage Layer

**localStorage** is primary cache backing:

```javascript
// Message Cache (5 min TTL)
localStorage.setItem('tipstream_messages_cache', JSON.stringify({
  [tipId]: { message: '...', cachedAt: timestamp },
  // ...
}))

// Feed Cache (2 hour TTL)
localStorage.setItem('tipstream_feed_cache', JSON.stringify({
  events: [ /* ... */ ],
  cachedAt: timestamp,
  expiresAt: timestamp + TTL,
}))

// Page Cache (2 min TTL)
localStorage.setItem('tipstream_page_cache_' + cursor, JSON.stringify({
  // pages indexed by cursor
}))
```

**Storage Limits**:

```javascript
// Check current usage
const storageSize = Object.keys(localStorage)
  .reduce((sum, k) => sum + localStorage.getItem(k).length, 0)
console.log('Storage used:', (storageSize / 1024 / 1024).toFixed(2), 'MB')

// Typical: 300-800 KB
// Max safe: 5 MB
// Auto-cleanup: TTL expires unused cache
```

**Manual Cache Clear**:

```javascript
// Clear all TipStream caches
Object.keys(localStorage)
  .filter(k => k.includes('tipstream'))
  .forEach(k => localStorage.removeItem(k))

// Or per-feature:
localStorage.removeItem('tipstream_feed_cache')
localStorage.removeItem('tipstream_messages_cache')
```

## Polling Configuration

### Event Polling

**File**: `lib/contractEvents.js`

```javascript
// Update frequency
const POLL_INTERVAL_MS = 30_000  // Every 30 seconds

// Initial bulk load
const MAX_INITIAL_PAGES = 10     // 500 tips × 50 per page

// Page size
const PAGE_LIMIT = 50            // Events per API call
```

**Behavior**:

- On load: Fetch 10 pages (500 tips) once
- Then: Poll for new tips every 30 seconds
- On new data: Merge into existing array
- De-duplicate by txId

**Cost**: ~2 API calls per minute per user × 30-50 users = 60-100 API calls/min peak

## Selective Enrichment Configuration

### Message Fetching

**File**: `hooks/useSelectiveMessageEnrichment.js`

```javascript
// Parallel request limit
const CONCURRENCY_LIMIT = 5

// Message cache TTL
const MSG_CACHE_TTL = 5 * 60 * 1000  // 5 minutes

// Batch size per round
const BATCH_SIZE = 5
```

**Behavior**:

- Trigger: When visible tips change
- Batch: Groups of 5 tips (BATCH_SIZE)
- Concurrency: Max 5 in flight (CONCURRENCY_LIMIT)
- Cache: Store results 5 minutes
- Timeline: Typical visible load ~3 seconds

**Cost**: 10 visible tips = 2 rounds = ~1-2 API calls

## Performance Tuning

### For Slow Networks

```env
# Increase timeouts
VITE_API_TIMEOUT_MS=15000           # 15 sec (was 10)

# Reduce polling
VITE_API_POLLING_INTERVAL_MS=60000  # 60 sec (was 30)

# Smaller page size
VITE_EVENT_PAGE_LIMIT=25            # 25/page (was 50)

# Reduce concurrency
# (Edit useSelectiveMessageEnrichment.js CONCURRENCY_LIMIT=2)
```

### For High-Traffic Servers

```env
# Increase concurrency
# (Edit useSelectiveMessageEnrichment.js CONCURRENCY_LIMIT=10)

# Decrease polling
VITE_API_POLLING_INTERVAL_MS=15000  # 15 sec (was 30)

# Larger page size
VITE_EVENT_PAGE_LIMIT=100           # 100/page (was 50)

# Longer cache TTL
VITE_FEED_CACHE_TTL_MS=14400000     # 4 hours (was 2)
```

### For Low-Memory Devices

```env
# Smaller initial load
# (Edit contractEvents.js MAX_INITIAL_PAGES=5)

# Reduce concurrent messages
# (Edit useSelectiveMessageEnrichment.js CONCURRENCY_LIMIT=2)

# Shorter cache TTL
VITE_MESSAGE_CACHE_TTL_MS=60000     # 1 min (was 5)
VITE_FEED_CACHE_TTL_MS=600000       # 10 min (was 2h)
```

## Deployment Configurations

### Development

```env
VITE_STACKS_NETWORK=devnet
VITE_ENABLE_DIAGNOSTICS=true        # Debug mode on
VITE_API_POLLING_INTERVAL_MS=5000   # 5 sec for testing
```

### Staging

```env
VITE_STACKS_NETWORK=testnet
VITE_API_POLLING_INTERVAL_MS=30000
VITE_CACHE_FALLBACK_ENABLED=true    # Test resilience
```

### Production

```env
VITE_STACKS_NETWORK=mainnet
VITE_ENABLE_DIAGNOSTICS=false       # Disable debug
VITE_API_POLLING_INTERVAL_MS=30000
VITE_CACHE_FALLBACK_ENABLED=true    # Essential for uptime
```

## Configuration Validation

### Pre-Deployment Checks

```bash
# Verify all env vars set
grep "VITE_" .env.production | wc -l
# Should match expected count

# Check contract address valid format
grep "VITE_CONTRACT_ADDRESS" .env.production | grep "^SP"
# Should match Stacks principal format

# Verify API endpoint reachable
curl https://api.hiro.so/v2/status
# Should return 200 status
```

## Configuration Change Tracking

Document all configuration changes in CHANGELOG.md:

```markdown
## [1.1.0] - 2026-04-15

### Changed
- Increased concurrent message fetch from 3 to 5 (CONCURRENCY_LIMIT)
- Reduced polling from 60s to 30s (POLL_INTERVAL_MS)
- Extended feed cache TTL from 1h to 2h (FEED_CACHE_TTL_MS)
```

---

**Last Updated:** March 2026
**Maintained by:** DevOps/Infrastructure Team
**Configuration Review Frequency:** Quarterly

