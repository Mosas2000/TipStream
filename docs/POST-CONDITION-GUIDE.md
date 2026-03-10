# Post-Condition Enforcement Guide

This document explains the post-condition strategy used across TipStream
to protect users from unintended STX transfers.

## Background

Stacks transactions support **post conditions** — on-chain assertions
that are checked after a contract executes but before the transaction
is committed.  If any assertion fails the entire transaction is aborted
and no assets move.

TipStream uses `PostConditionMode.Deny` on every user-facing
transaction.  In `Deny` mode, any STX transfer that is not covered by
an explicit post condition will cause the transaction to fail.  This is
the opposite of `Allow` mode, which permits unconstrained transfers and
is a known security risk for wallets.

## Fee Model

The TipStream contract charges a platform fee on every tip:

| Parameter          | Value | Source                           |
|--------------------|-------|----------------------------------|
| `fee-basis-points` | 50    | `tipstream.clar` constant        |
| Divisor            | 10000 | Basis-point standard             |
| Effective rate     | 0.5%  | 50 / 10000                       |

When a user sends X microSTX as a tip, the contract transfers:

- **Recipient**: X minus the floored fee
- **Vault**: The floored fee

The total STX leaving the sender's wallet is X (the full tip amount).
The fee is taken from the tip, not added on top.

## Post-Condition Ceiling

The shared helper `maxTransferForTip(amount)` computes:

```
fee   = ceil(amount * 50 / 10000)
max   = amount + fee + 1
```

The `+1` is a rounding buffer.  The actual on-chain transfer will
always be less than or equal to this ceiling.

## Shared Modules

Both the frontend and CLI scripts use centralized post-condition
modules to avoid drift:

| Context  | Module                             | Format |
|----------|------------------------------------|--------|
| Frontend | `frontend/src/lib/post-conditions.js` | ESM    |
| Scripts  | `scripts/lib/post-conditions.cjs`     | CJS    |

### Exported Helpers

| Function            | Purpose                                     |
|---------------------|---------------------------------------------|
| `maxTransferForTip` | Upper bound for the STX post condition      |
| `tipPostCondition`  | Build the post-condition object              |
| `feeForTip`         | Compute the platform fee (ceil)             |
| `totalDeduction`    | Tip plus fee (what leaves the wallet)       |
| `recipientReceives` | Net amount after the fee split              |

### Constants

| Name                     | Value | Purpose                       |
|--------------------------|-------|-------------------------------|
| `FEE_BASIS_POINTS`       | 50    | Fee numerator                 |
| `BASIS_POINTS_DIVISOR`   | 10000 | Fee denominator               |
| `SAFE_POST_CONDITION_MODE` | Deny | The only allowed mode         |

## ESLint Enforcement

The frontend ESLint config includes a `no-restricted-properties` rule
that flags any reference to `PostConditionMode.Allow` as an error:

```javascript
'no-restricted-properties': ['error', {
    object: 'PostConditionMode',
    property: 'Allow',
    message: 'Use PostConditionMode.Deny with explicit post conditions.',
}],
```

## CI Enforcement

The CI pipeline runs the `scripts/audit-post-conditions.sh` script on
every pull request.  It grep-searches all JavaScript and TypeScript
files for `PostConditionMode.Allow` and fails the build if any match
is found outside of test fixtures.

## Adding a New Contract Call

When adding a new function that calls a TipStream contract:

1. Import `tipPostCondition` and `SAFE_POST_CONDITION_MODE` from the
   shared module.
2. Compute the microSTX amount.
3. Build the post-condition array: `[tipPostCondition(sender, amount)]`.
4. Set `postConditionMode: SAFE_POST_CONDITION_MODE` in the tx options.
5. Never use `PostConditionMode.Allow`.

Example:

```javascript
import {
    tipPostCondition,
    SAFE_POST_CONDITION_MODE,
} from '../lib/post-conditions';

const microSTX = toMicroSTX(amount);
const postConditions = [tipPostCondition(senderAddress, microSTX)];

await openContractCall({
    // ...other options
    postConditions,
    postConditionMode: SAFE_POST_CONDITION_MODE,
});
```

## Testing

Unit tests live in `frontend/src/test/post-conditions.test.js` and
cover all exported functions including edge cases for rounding, zero
fees, and the relationship between `maxTransferForTip` and
`totalDeduction`.

Run them with:

```bash
cd frontend && npx vitest run src/test/post-conditions.test.js
```
