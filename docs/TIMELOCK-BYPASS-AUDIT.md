# Timelock Bypass Vulnerability Audit

## Summary

| Field           | Value                                          |
| --------------- | ---------------------------------------------- |
| Contract        | `SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream` |
| Severity        | Medium                                         |
| Status          | Mitigated (frontend, monitoring, operational)  |
| Date Identified | 2026-03-08                                     |

The deployed TipStream contract contains two admin functions that bypass the
144-block timelock: `set-paused` and `set-fee-basis-points`. Because the
contract is immutable on mainnet, this cannot be patched in-place. Mitigation is
applied at the frontend, monitoring, and operational layers.

## Affected Functions

### `set-paused` (line 313)

```clarity
(define-public (set-paused (paused bool))
    (begin
        (asserts! (is-admin) err-owner-only)
        (var-set is-paused paused)
        (print { event: "contract-paused", paused: paused })
        (ok true)
    )
)
```

This function immediately sets the pause state without waiting for any timelock.
The timelocked alternative is `propose-pause-change` followed by
`execute-pause-change` after 144 blocks.

### `set-fee-basis-points` (line 322)

```clarity
(define-public (set-fee-basis-points (new-fee uint))
    (begin
        (asserts! (is-admin) err-owner-only)
        (asserts! (<= new-fee u1000) err-invalid-amount)
        (var-set current-fee-basis-points new-fee)
        (print { event: "fee-updated", new-fee: new-fee })
        (ok true)
    )
)
```

This function immediately sets the fee without waiting for any timelock. The
timelocked alternative is `propose-fee-change` followed by `execute-fee-change`
after 144 blocks, with an optional `cancel-fee-change`.

## Root Cause

The timelocked functions were added alongside the original direct functions
rather than replacing them. Both paths remain callable by the contract owner
or authorized multisig, and the Clarity contract is immutable once deployed.

## Risk Assessment

| Risk Factor                  | Assessment                                 |
| ---------------------------- | ------------------------------------------ |
| Who can exploit              | Contract owner or authorized multisig only |
| Impact of `set-paused`       | Immediate contract halt, blocking all tips |
| Impact of `set-fee-basis-points` | Instant fee change up to 10% (1000 bps) |
| Likelihood                   | Low (requires owner key compromise)        |
| User visibility              | None unless monitoring is in place         |

The timelock exists to give users a 24-hour window to withdraw or stop tipping
if they disagree with a proposed change. Bypassing it removes that window.

## Missing Contract Feature

The deployed contract has `cancel-fee-change` but no `cancel-pause-change`. If a
pause proposal is made in error, it cannot be explicitly cancelled. The workaround
is to let it expire unexecuted or propose a replacement value that overrides it.

## Mitigation Strategy

### 1. Frontend Enforcement (Implemented)

The `AdminDashboard` component exclusively uses the timelocked transaction
builders (`proposePauseChange`, `executePauseChange`, `proposeFeeChange`,
`executeFeeChange`, `cancelFeeChange`). The bypass functions are never called
from the frontend.

ESLint rules in `frontend/eslint.config.js` ban string literals matching
`set-paused` and `set-fee-basis-points` to prevent accidental use.

### 2. Chainhook Monitoring (Implemented)

The `chainhook/bypass-detection.js` module scans all contract events for bypass
indicators. When a `contract-paused` or `fee-updated` event occurs without a
matching timelocked execution event, a warning is logged and the event is
flagged in the `/api/admin/bypasses` endpoint.

### 3. Operational Policy (Documented)

The admin operations guide (`docs/ADMIN-OPERATIONS.md`) establishes that all
routine changes MUST use the timelocked path. Direct bypass is permitted only
for genuine emergencies (active exploits) and must be followed by an incident
report.

### 4. Contract Upgrade (Planned)

A v2 contract design is documented in `docs/CONTRACT-UPGRADE-STRATEGY.md` that
removes the bypass functions entirely and adds `cancel-pause-change`. Migration
would involve deploying a new contract and redirecting the frontend.

## Test Coverage

| Test Suite                           | Tests | Scope                                |
| ------------------------------------ | ----- | ------------------------------------ |
| Timelocked Pause Changes             | 8     | propose, execute, auth, timelock     |
| Timelocked Fee Changes               | 12    | propose, execute, cancel, bounds     |
| Direct Bypass vs Timelocked Path     | 5     | bypass behavior, boundary, isolation |
| Timelock utilities                   | 40    | countdown, progress, formatting      |
| Clarity hex parser                   | 18    | value parsing, edge cases            |
| Admin transaction builders           | 19    | all 5 builders, validation, options  |

## Recommendations

1. **Do not use** `set-paused` or `set-fee-basis-points` for routine operations.
2. **Monitor** the chainhook bypass detection endpoint continuously.
3. **Deploy** the v2 contract when development resources are available.
4. **Audit** the multisig configuration to ensure no unauthorized signers can
   trigger bypass functions.