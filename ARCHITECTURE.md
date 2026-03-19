# Architecture

## Overview

TipStream is a micro-tipping platform on the Stacks blockchain.  Users
connect a Stacks wallet, send STX tips with messages, and view real-time
activity through the React frontend.

```
Browser
  |
  +--> React SPA (Vite)
  |        |
  |        +--> @stacks/connect  -->  Wallet (Leather / Xverse)  -->  Stacks Node
  |        |
  |        +--> @stacks/transactions (read-only)  -->  Hiro API
  |        |
  |        +--> Hiro REST API (events, contract state)
  |
  +--> Vercel / Netlify (hosting, headers, rewrites)
```

## Smart Contract Layer

The primary contract is `tipstream.clar`, deployed at:

```
SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream
```

### Core Responsibilities

- **Tip storage**: each tip is recorded in the `tips` map with sender,
  recipient, amount, fee, message, and block height.
- **Fee collection**: a configurable basis-point fee (default 0.5%) is
  deducted from each tip.  The minimum fee is 1 microSTX.
- **User profiles**: display name, bio, and avatar stored on-chain.
- **Blocking**: users can block principals to prevent receiving tips.
- **Batch tipping**: partial-failure and strict (atomic) modes for
  multi-recipient tips.
- **Admin controls**: fee adjustment, pause/unpause with timelock,
  two-step ownership transfer.

### Extension Contracts (planned future phases)

**Phase 3 — Token Economy**

| Contract | Purpose | Status | Timeline |
|---|---|---|---|
| tipstream-traits | SIP-010 / SIP-009 trait definitions | Planned | Phase 3 |
| tipstream-token | TIPS fungible reward token | Planned | Phase 3 |
| tipstream-rewards | TIPS token reward distribution | Planned | Phase 3 |
| tipstream-badges | NFT achievement badges | Planned | Phase 3 |
| tipstream-referral | Referral tracking and incentives | Planned | Phase 3 |

**Phase 4 — Governance and Treasury**

| Contract | Purpose | Status | Timeline |
|---|---|---|---|
| tipstream-vault | Community treasury | Planned | Phase 4 |
| tipstream-multisig | Multi-signature admin governance | Planned | Phase 4 |
| tipstream-dao | Token-weighted governance proposals | Planned | Phase 4 |

**Phase 5 — Advanced Features**

| Contract | Purpose | Status | Timeline |
|---|---|---|---|
| tipstream-escrow | Time-locked escrow tips | Planned | Phase 5 |
| tipstream-subscription | Recurring patronage payments | Planned | Phase 5 |

See [ROADMAP.md](ROADMAP.md) for current phase and timeline.

## Frontend Layer

Built with React 19 and Vite 7.  All UI state is managed through React
context (`TipContext`, `ThemeContext`, `DemoContext`).

### Key Directories

| Path | Purpose |
|---|---|
| `frontend/src/components/` | UI components (pages and shared UI) |
| `frontend/src/config/` | Contract address and API base URL |
| `frontend/src/context/` | React context providers |
| `frontend/src/hooks/` | Custom hooks (balance, notifications, etc.) |
| `frontend/src/lib/` | Analytics, utilities, web vitals |
| `frontend/src/utils/` | Stacks wallet helper (`stacks.js`) |

### Routing

The SPA uses React Router v6.  When a user is authenticated the nav
renders Send, Feed, Leaderboard, Activity, and Stats routes.
Unauthenticated visitors see the hero landing page.

### Wallet Integration

`frontend/src/utils/stacks.js` wraps `@stacks/connect` to provide
`authenticate()`, `disconnect()`, and `userSession`.  The frontend
never handles private keys directly.

## Hosting

The frontend is deployed to Vercel.  Configuration lives in
`vercel.json` (build command, output directory, headers, rewrites).
A `netlify.toml` is also provided for Netlify as an alternative.

Both configurations:
- Build the Vite app from `frontend/`.
- Inject `VITE_NETWORK=mainnet` at build time.
- Apply security headers (X-Frame-Options, CSP, etc.).
- Route all paths to `index.html` for client-side routing.

### Data Flow

1. **Send tip** — the frontend builds a `contract-call` transaction
   with post conditions, the wallet signs it, and the signed
   transaction is broadcast to the Stacks node.
2. **Read state** — the frontend queries the Hiro REST API for
   read-only contract calls (tip data, stats, profiles).
3. **Events** — the Hiro API `/extended/v1/contract/events` endpoint
   provides the tip event feed.

### Event Feed Pipeline (Issue #291)

The event feed implements a scalable, multi-layer pagination architecture:

```
API Events (Hiro)
    |
    v
contractEvents.js (fetchEventPage)
    |  [single-page fetch + parse]
    v
eventPageCache (2-min TTL)
    |  [cached pages + invalidation]
    v
usePaginatedEvents Hook
    |  [page management + cursor generation]
    v
useFilteredAndPaginatedEvents Hook
    |  [filter, sort, paginate]
    v
Visible Paginated Tips (10 per page)
    |  [only visible 10]
    v
useSelectiveMessageEnrichment
    |  [fetch messages for visible only]
    v
enrichedTips (displayed to user)
```

**Key Benefits:**

- **90% API reduction**: Messages fetched only for visible tips, not all 500+
- **Stable cursors**: Transaction-based cursors enable deduplication across pages
- **Cache invalidation**: TTL and boundary-aware invalidation prevent stale data
- **Memory efficient**: Bounded cache size regardless of event volume

See `docs/PERFORMANCE_PROFILING.md` for measurement techniques.

### API Resilience & Caching (Issue #290)

Read-heavy views implement last-known-good caching to survive API outages:

```
Live API Request
    |
    v
Fetch with timeout (10s)
    ├─ Success?
    │  ├─ Yes: Store in persistent cache → Return live data
    │  │
    │  └─ No: Timeout/error occurred
    │         Check persistent cache
    │         ├─ Cache found → Return cached data
    │         └─ No cache → Return error
    |
    v
User sees: live data OR cached data OR error
UI shows:  freshness metadata + retry button (if cached)
```

**Features:**

- **Persistent cache**: localStorage-backed, survives browser reload
- **TTL management**: 2-5 minute caches per endpoint type
- **Automatic fallback**: No code changes needed, transparent
- **Freshness indicators**: Users shown data source and age
- **Transaction lockout**: Risky actions disabled on stale data
- **Pattern invalidation**: Related caches cleared on state change

**Layers:**

1. `persistentCache.js` - Low-level storage with TTL
2. `useCachedData` - Generic hook for any fetch
3. `cachedApiClient.js` - Transparent HTTP wrapper
4. `FreshnessIndicator.jsx` - Visual feedback component
5. `ResilienceContext.jsx` - Global coordination

See `docs/LAST_KNOWN_GOOD_CACHING.md` for architecture and patterns.

## Data Flow

| Boundary | Trust Model |
|---|---|
| Wallet <-> Frontend | User controls keys; frontend never sees them |
| Frontend <-> Hiro API | Read-only; no write capability |
| Frontend <-> Stacks Node | Signed transactions only; post conditions enforced |
| Admin <-> Contract | `tx-sender == contract-owner` assertion on every admin call |

See [SECURITY.md](SECURITY.md) for the full security policy.
