# TipStream

A decentralized micro-tipping platform on the Stacks blockchain, secured by Bitcoin. Send STX tips to any Stacks address with full on-chain transparency, fee tracking, and community features.

## Project Status

**Phase:** 1 - Core Platform (Stable)
**Live Features:** 14 (all functional on mainnet)
**Test Coverage:** 128 tests (88 contract + 40 frontend)
**Recent Work:** Event pagination optimization (Issue #291), API resilience caching (Issue #290)

See [ROADMAP.md](ROADMAP.md) for upcoming phases and timelines.

## Problem

Content creators and community contributors lack a simple, transparent way to receive micropayments. Existing solutions rely on centralized intermediaries that take large fees and can freeze funds. TipStream solves this by putting tipping directly on-chain where every transaction is verifiable, fees are minimal (0.5%), and no one can censor payments.

## Features

- **Direct STX Tipping** - Send micro-tips to any Stacks address with optional messages
- **Batch Tipping** - Tip up to 50 recipients in a single transaction with strict or partial modes
- **Recursive Tipping (Tip-a-Tip)** - Tip someone back directly from the live feed
- **User Profiles** - Set a display name, bio, and avatar URL stored on-chain
- **Privacy Controls** - Block/unblock specific addresses
- **Leaderboards** - Top senders and receivers ranked by on-chain activity
- **Platform Analytics** - Real-time stats: total tips, volume, and fees
- **Activity History** - Per-user sent/received tip history with filtering
- **Admin Dashboard** - Pause/resume, fee configuration, ownership transfer
- **Telemetry & Web Vitals** - Production-ready observability with conversion funnels, performance metrics, and error tracking
- **Event Feed Pagination** - Cursor-based pagination with selective message enrichment (Issue #291)
- **API Resilience Caching** - Last-known-good cache fallback during outages (Issue #290)
- **Auto-Refresh** - 30-second polling with manual refresh across all views
- **Cross-Component State** - Shared context so sending a tip refreshes all views

## Deployment

| Field | Value |
|---|---|
| Contract | `SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream` |
| Network | Stacks Mainnet (Secured by Bitcoin) |
| Status | Deployed |
| Explorer | [View on Hiro Explorer](https://explorer.hiro.so/txid/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream?chain=mainnet) |
| Deploy TX | [0xf7ac08...](https://explorer.hiro.so/txid/0xf7ac0877ce65494779264fb0172023facd101b639ad5ae8bbd71e102387033ef?chain=mainnet) |

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Clarity v2 (Stacks, epoch 3.0) |
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Wallet Integration | @stacks/connect 8.2, @stacks/transactions 7.3 |
| Testing | Vitest + Clarinet simnet |
| Deployment | Clarinet CLI |
| API | Hiro Stacks API (read-only queries, events) |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Clarinet](https://docs.hiro.so/clarinet/getting-started) for contract development
- A Stacks wallet (Leather or Xverse)

### Smart Contract

```bash
clarinet check
npm install
npm test
clarinet deployments apply -p deployments/default.mainnet-plan.yaml
```

### Frontend

```bash
cd frontend
cp .env.example .env.local   # Configure environment variables
npm install
npm run validate:config      # Validate configuration
npm run dev                  # Start dev server at http://localhost:5173
npm run build                # Production build
npm run preview              # Preview production build
```

See [frontend/CONFIG.md](frontend/CONFIG.md) for detailed configuration requirements.

## Architecture

```
Frontend (React + Vite)
  |
  |-- @stacks/connect --> Wallet (Leather / Xverse) --> Stacks Node
  |
  |-- @stacks/transactions (read-only) --> Hiro API --> tipstream.clar
  |
  |-- Hiro REST API (events, contract state)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design.

### Frontend Routes

| Path | Page | Description | Status |
|---|---|---|---|
| `/` | Landing / Redirect | Shows landing page for unauthenticated; redirects authenticated users to `/send` | Stable |
| `/send` | Send Tip | Send a single STX tip | Stable |
| `/batch` | Batch Tip | Tip up to 50 recipients at once | Stable |
| `/token-tip` | Token Tip | Send a SIP-010 token tip (beta) | Beta |
| `/feed` | Live Feed | Real-time feed of recent tips with pagination | Stable |
| `/leaderboard` | Leaderboard | Top senders and receivers | Stable |
| `/activity` | My Activity | Personal tip history | Stable |
| `/profile` | Profile | Manage display name, bio, avatar | Stable |
| `/block` | Block Manager | Block/unblock addresses | Stable |
| `/stats` | Platform Stats | Aggregate platform metrics with cache fallback | Stable |
| `/admin` | Admin Dashboard | Owner-only pause/fee controls | Stable |
| `/telemetry` | Telemetry Dashboard | Web Vitals, conversion funnels, error tracking (admin-only) | Stable |
| `*` | 404 | Shows the attempted path and a link home | Stable |

Route paths are centralised in `frontend/src/config/routes.js`. Import the
constants instead of hard-coding path strings.

### Smart Contract Functions

**Public (state-changing):**

| Function | Description | Restriction |
|---|---|---|
| `send-tip` | Send STX tip with message, deducts 0.5% fee | None |
| `send-batch-tips` | Tip up to 50 recipients (partial - skips failures) | None |
| `send-batch-tips-strict` | Tip up to 50 recipients (atomic - all or nothing) | None |
| `tip-a-tip` | Recursive tip referencing a previous tip ID | None |
| `update-profile` | Set display name, bio, avatar URL | None |
| `toggle-block-user` | Block or unblock a principal | None |
| `set-fee-basis-points` | Admin: update fee basis points (direct, bypasses timelock) | Owner only |
| `set-paused` | Admin: pause/resume contract (direct, bypasses timelock) | Owner only |
| `propose-fee-change` | Admin: propose timelocked fee change (144-block delay) | Owner only |
| `execute-fee-change` | Admin: execute pending fee change after timelock | Owner only |
| `cancel-fee-change` | Admin: cancel a pending fee proposal | Owner only |
| `propose-pause-change` | Admin: propose timelocked pause change (144-block delay) | Owner only |
| `execute-pause-change` | Admin: execute pending pause change after timelock | Owner only |
| `propose-new-owner` | Admin: initiate two-step ownership transfer | Owner only |
| `accept-ownership` | Accept pending ownership transfer | Designated owner only |

**Read-only:**

| Function | Description |
|---|---|
| `get-tip` | Fetch a single tip by ID |
| `get-user-stats` | Sent/received counts and totals for a user |
| `get-multiple-user-stats` | Batch stats for up to 20 principals |
| `get-platform-stats` | Total tips, volume, fees |
| `get-profile` | User profile |
| `is-user-blocked` | Check if one user has blocked another |
| `get-contract-owner` | Current contract owner |
| `get-pending-owner` | Pending ownership transfer target |
| `get-pending-fee-change` | Pending fee proposal and execution height |
| `get-pending-pause-change` | Pending pause proposal and execution height |
| `get-is-paused` | Current contract pause state (true = paused, false = running) |
| `get-multisig` | Authorized multisig contract address |
| `get-contract-version` | Contract version and name |

### Frontend Components

| Component | Purpose |
|---|---|
| `SendTip` | Main tip form with validation and fee preview |
| `BatchTip` | Multi-recipient batch tipping interface |
| `RecentTips` | Live feed with tip-back functionality |
| `TipHistory` | Per-user activity with sent/received filtering |
| `PlatformStats` | Global stats from on-chain data |
| `Leaderboard` | Top senders and receivers |
| `ProfileManager` | Create/edit on-chain profile |
| `BlockManager` | Block/unblock users |
| `AdminDashboard` | Owner-only controls (pause, fees, stats) |
| `TelemetryDashboard` | Performance monitoring, Web Vitals, conversion funnels |

### Data Model

| Map/Variable | Purpose |
|---|---|
| `tips` | Every tip: sender, recipient, amount, fee, message, block height |
| `user-tip-count` / `user-received-count` | Per-user tip counters |
| `user-total-sent` / `user-total-received` | Per-user volume |
| `user-profiles` | Display name, bio, avatar |
| `blocked-users` | Privacy blocking |
| `total-tips-sent` | Global counter (also tip ID) |
| `total-volume` / `platform-fees` | Running totals |
| `is-paused` | Emergency pause state (accessible via `get-is-paused` read-only function) |
| `current-fee-basis-points` | Fee rate (default 50 = 0.5%) |

### Testing

```bash
npm test              # Run tests in optimized mode (recommended)
npm run test:verbose  # Run tests with full contract print logs
npm run test:coverage # Generate test coverage report
```

Comprehensive test suite with 99 contract tests and 40+ frontend unit tests covering:

- Tip sending and fee calculation
- Self-tip rejection and minimum amount enforcement
- Batch tipping (partial and strict modes)
- Recursive tipping (tip-a-tip)
- User profiles and blocking
- Admin controls (pause, fee updates)
- Two-step ownership transfer
- Multi-user stats queries
- Frontend hooks, components, and utilities
- Event pagination and message enrichment
- Cache invalidation and resilience

## Project Structure

```
contracts/
  tipstream.clar          Core tipping contract
  tipstream-traits.clar   Trait definitions
  tipstream-*.clar        Extension contracts
frontend/
  src/
    components/           React components
    config/               Contract address configuration
    context/              TipContext (shared state)
    lib/                  Utility functions and post-condition helpers
    test/                 Unit and integration tests
    utils/                Stacks wallet/network helpers
tests/
  tipstream.test.ts       Vitest contract tests
scripts/
  lib/                    Shared modules (post-conditions)
  audit-post-conditions.sh  CI audit for Allow mode usage
  deploy.sh               Deployment script
  hooks/                  Git hooks (pre-commit secret scanner)
  test-contract.cjs       Mainnet test tip script
docs/
  POST-CONDITION-GUIDE.md Post-condition enforcement strategy
deployments/
  *.yaml                  Clarinet deployment plans
settings/
  *.toml                  Network configurations
  *.toml.example          Safe templates (committed)
  README.md               Credential setup guide
```

## Performance

The frontend is optimized for fast loading and excellent user experience:

### Bundle Optimization
- **Initial bundle**: ~19KB gzipped (index shell)
- **Vendor React chunk**: ~60KB gzipped (React & DOM core)
- **Vendor Stacks chunk**: ~48KB gzipped (Blockchain & crypto logic)
- **Wallet chunks**: Isolated @walletconnect (~105KB) and @reown (~58KB) modules
- **Route splitting**: All components lazy loaded (4-13KB each)
- **Asset Isolation**: Lucide icons (~10KB) and metrics (~5KB) separated for caching

### Loading Strategy
- **Critical path**: CSS animations instead of JavaScript for hero section
- **Deferred assets**: Web vitals, wallet modules, and route components
- **Preconnect hints**: DNS prefetch for Hiro API and CoinGecko
- **Resource prioritization**: Essential UI loads first, features load on-demand

### Performance Budget
- **Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Bundle monitoring**: CI checks and visualizer in `dist/stats.html`
- **Build commands**: `npm run analyze` for interactive bundle analysis

See [frontend/PERFORMANCE_BUDGET.md](frontend/PERFORMANCE_BUDGET.md) for detailed metrics.

## Security

- **PostConditionMode.Deny** enforced on every user-facing transaction, preventing
  the contract from transferring more STX than explicitly permitted
- **Post-condition ceilings**: Shared modules calculate fee-aware ceilings to ensure
  the contract cannot deduct more than (amount + 0.5% fee)
- **Centralized post-condition logic**: `lib/post-conditions.js` and
  `scripts/lib/post-conditions.cjs` ensure consistency across frontend and CLI tools
- **CI enforcement**: ESLint rules and GitHub Actions block `PostConditionMode.Allow`
  from entering the codebase via `.eslintrc` and `.gitleaks.toml`
- **Frontend enforcement**: AdminDashboard never calls direct bypass functions,
  always using timelocked propose-wait-execute paths
- **Fee calculation enforces a minimum of 1 microSTX to prevent zero-fee abuse
- **Minimum tip amount of 1000 microSTX (0.001 STX)**
- **Self-tipping is rejected at the contract level**
- **Blocked users cannot receive tips from the blocker**
- **Admin functions are owner-only with on-chain assertions**
- **Two-step ownership transfer prevents accidental loss**
- **Timelocked admin changes**: Fee and pause changes use a 144-block (~24 hour) propose-wait-execute cycle
- **Multisig governance**: Optional multi-signature approval layer for admin actions

### Credential Handling

- **Mainnet and testnet mnemonics are never committed.**
  `settings/Mainnet.toml` and `settings/Testnet.toml` are in `.gitignore`.
- Template files (`Mainnet.toml.example`, `Testnet.toml.example`) are
  committed with placeholder values only.
- A pre-commit hook (`scripts/hooks/pre-commit`) scans staged changes for
  mnemonic patterns before allowing a commit.
- GitHub Actions runs [gitleaks](https://github.com/gitleaks/gitleaks)
  on every push and PR via `.gitleaks.toml`.

The `settings/Devnet.toml` file contains mnemonic phrases and private keys
for Clarinet devnet test accounts.  These hold no real value and exist only
in the local devnet sandbox.  Never use devnet mnemonics or keys on mainnet
or testnet.

See [SECURITY.md](SECURITY.md) for the full security policy, vulnerability
reporting process, and wallet rotation advisory.
See [docs/POST-CONDITION-GUIDE.md](docs/POST-CONDITION-GUIDE.md) for the post-condition enforcement strategy.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, coding standards, and PR guidelines.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a history of changes.

## License

MIT
