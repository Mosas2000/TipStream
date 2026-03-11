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

### Extension Contracts (planned)

| Contract | Purpose |
|---|---|
| tipstream-traits | SIP-010 / SIP-009 trait definitions |
| tipstream-token | TIPS fungible reward token |
| tipstream-escrow | Time-locked escrow tips |
| tipstream-subscription | Recurring patronage payments |
| tipstream-vault | Community treasury |
| tipstream-referral | Referral tracking and incentives |
| tipstream-multisig | Multi-signature admin governance |
| tipstream-rewards | TIPS token reward distribution |
| tipstream-badges | NFT achievement badges |
| tipstream-dao | Token-weighted governance proposals |

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

## Data Flow

1. **Send tip** — the frontend builds a `contract-call` transaction
   with post conditions, the wallet signs it, and the signed
   transaction is broadcast to the Stacks node.
2. **Read state** — the frontend queries the Hiro REST API for
   read-only contract calls (tip data, stats, profiles).
3. **Events** — the Hiro API `/extended/v1/contract/events` endpoint
   provides the tip event feed.

## Security Boundaries

| Boundary | Trust Model |
|---|---|
| Wallet <-> Frontend | User controls keys; frontend never sees them |
| Frontend <-> Hiro API | Read-only; no write capability |
| Frontend <-> Stacks Node | Signed transactions only; post conditions enforced |
| Admin <-> Contract | `tx-sender == contract-owner` assertion on every admin call |

See [SECURITY.md](SECURITY.md) for the full security policy.
