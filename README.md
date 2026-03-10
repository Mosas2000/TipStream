# TipStream

A decentralized micro-tipping platform on the Stacks blockchain, secured by Bitcoin. Send STX tips to any Stacks address with full on-chain transparency, fee tracking, and community features.

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
- **Auto-Refresh** - 60-second polling with manual refresh across all views
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
npm install
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
```

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

### Smart Contract Functions

**Public (state-changing):**

| Function | Description |
|---|---|
| `send-tip` | Send STX tip with message, deducts 0.5% fee |
| `send-batch-tips` | Tip up to 50 recipients (partial - skips failures) |
| `send-batch-tips-strict` | Tip up to 50 recipients (atomic - all or nothing) |
| `tip-a-tip` | Recursive tip referencing a previous tip ID |
| `update-profile` | Set display name, bio, avatar URL |
| `toggle-block-user` | Block or unblock a principal |
| `set-fee-basis-points` | Admin: update fee basis points (direct, bypasses timelock) |
| `set-paused` | Admin: pause/resume contract (direct, bypasses timelock) |
| `propose-fee-change` | Admin: propose timelocked fee change (144-block delay) |
| `execute-fee-change` | Admin: execute pending fee change after timelock |
| `cancel-fee-change` | Admin: cancel a pending fee proposal |
| `propose-pause-change` | Admin: propose timelocked pause change (144-block delay) |
| `execute-pause-change` | Admin: execute pending pause change after timelock |
| `propose-new-owner` | Admin: initiate two-step ownership transfer |
| `accept-ownership` | Accept pending ownership transfer |

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
| `is-paused` | Emergency pause |
| `current-fee-basis-points` | Fee rate (default 50 = 0.5%) |

## Testing

```bash
npm test
```

Runs 23 contract tests on Clarinet simnet covering:

- Tip sending and fee calculation
- Self-tip rejection and minimum amount enforcement
- Batch tipping (partial and strict modes)
- Recursive tipping (tip-a-tip)
- User profiles and blocking
- Admin controls (pause, fee updates)
- Two-step ownership transfer
- Multi-user stats queries

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
  test-contract.cjs       Mainnet test tip script
docs/
  POST-CONDITION-GUIDE.md Post-condition enforcement strategy
deployments/
  *.yaml                  Clarinet deployment plans
settings/
  *.toml                  Network configurations
```

## Security

- **PostConditionMode.Deny** enforced on every user-facing transaction, preventing
  the contract from transferring more STX than explicitly permitted
- Shared post-condition modules (`lib/post-conditions.js`, `scripts/lib/post-conditions.cjs`)
  centralize fee-aware ceiling calculations
- ESLint rules and CI pipeline block `PostConditionMode.Allow` from entering the codebase
- Fee calculation enforces a minimum of 1 microSTX to prevent zero-fee abuse
- Minimum tip amount of 1000 microSTX (0.001 STX)
- Self-tipping is rejected at the contract level
- Blocked users cannot receive tips from the blocker
- Admin functions are owner-only with on-chain assertions
- Two-step ownership transfer prevents accidental loss
- Post conditions on all transactions restrict STX movement
- **Timelocked admin changes**: Fee and pause changes use a 144-block (~24 hour) propose-wait-execute cycle
- **Frontend enforces timelocked paths**: The AdminDashboard never calls direct bypass functions
- **Multisig governance**: Optional multi-signature approval layer for admin actions

The `settings/Devnet.toml` file contains mnemonic phrases and private keys for Clarinet devnet test accounts. These hold no real value and exist only in the local devnet sandbox. Never use devnet mnemonics or keys on mainnet or testnet.

See [SECURITY.md](SECURITY.md) for the full security audit and vulnerability reporting guidelines.
See [docs/POST-CONDITION-GUIDE.md](docs/POST-CONDITION-GUIDE.md) for the post-condition enforcement strategy.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, coding standards, and PR guidelines.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a history of changes.

## License

MIT
