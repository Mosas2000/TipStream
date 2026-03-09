# Contract Upgrade Strategy

Clarity smart contracts on Stacks are immutable once deployed.
This document describes how TipStream handles changes to on-chain logic.

## Immutability Constraint

Once `tipstream.clar` is deployed to mainnet, its code cannot be modified.
Any bug fix or feature addition requires deploying a new contract.

## Upgrade Approach

### 1. Extension Contracts

New functionality is added through separate contracts (e.g.
`tipstream-escrow.clar`, `tipstream-rewards.clar`) that interact with the
core contract through its public interface.  The core contract does not
need to change.

### 2. Ownership Transfer

If critical issues require migrating to a replacement core contract:

1. Deploy the new contract with the fix.
2. Use `propose-new-owner` on the old contract to transfer admin rights
   to a migration principal (or burn address) so the old contract can
   be cleanly retired.
3. Update the frontend `config/contracts.js` to point to the new contract
   address.

### 3. Admin Controls

The existing contract has intentionally limited admin surface:

| Function | Purpose | Risk Mitigation |
|---|---|---|
| `set-paused` | Emergency pause | Timelock delay before execution |
| `set-fee-basis-points` | Adjust fee rate | Maximum cap of 1000 (10%) |
| `propose-new-owner` / `accept-ownership` | Transfer ownership | Two-step confirmation |

### 4. Frontend Version Gating

When a contract is retired, the frontend should:

- Stop routing transactions to the old contract.
- Display a migration banner directing users to the new contract.
- Continue reading historical data from the old contract for activity
  feeds.

## Timelock Details

The `set-paused` function uses a pending-pause mechanism:

1. Admin calls `set-paused(true)` which records the intent and computes
   an effective block height (`block-height + timelock-delay`).
2. After the delay has elapsed, admin calls `execute-pause-change` to
   apply the state change.
3. This prevents an attacker who gains admin access from instantly
   pausing the contract to block tips.

## Emergency Procedures

If the deployer mnemonic is compromised:

1. Immediately call `propose-new-owner` to transfer ownership to a
   secure address.
2. From the new address, call `accept-ownership`.
3. Rotate the compromised mnemonic (see SECURITY.md for details).

If a contract vulnerability is discovered:

1. Use `set-paused` to halt operations (subject to timelock).
2. Communicate the issue through the security disclosure channel.
3. Deploy a patched contract and update the frontend.
4. Retire the old contract by transferring ownership to a burn address.
