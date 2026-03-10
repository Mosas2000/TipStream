# Contract Upgrade Strategy

## Current Contract

| Field | Value |
|---|---|
| Address | `SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream` |
| Version | 1 (`contract-version u1`) |
| Network | Stacks Mainnet |
| Status | Deployed and immutable |

## Known Issues in v1

### 1. Timelock Bypass (High Severity)

The `set-paused` and `set-fee-basis-points` functions bypass the 144-block timelock intended
to protect users from sudden administrative changes. Both direct and timelocked paths exist
in the contract, but the direct path makes the timelock effectively optional.

**Current mitigation:** Frontend enforces timelocked paths only. See
[TIMELOCK-BYPASS-AUDIT.md](TIMELOCK-BYPASS-AUDIT.md).

### 2. Missing cancel-pause-change Function

The contract has `cancel-fee-change` but no corresponding `cancel-pause-change`. If a pause
proposal is submitted, it can only be superseded by a new proposal or waited out.

**Current mitigation:** Frontend displays warning when proposing pause changes.

### 3. No Emergency-Only Pause Mechanism

There is no way to restrict the direct `set-paused` to genuine emergencies at the contract
level. The `is-admin` check is the same for both direct and timelocked paths.

## Upgrade Plan for v2

### Design Principles

1. Remove direct bypass functions entirely
2. Add emergency-specific authorization that is separate from routine admin
3. Add cancel support for all pending changes
4. Maintain backward compatibility for read-only queries
5. Implement data migration from v1

### Proposed Changes

#### Remove Direct Bypass

```clarity
;; REMOVED in v2:
;; (define-public (set-paused (paused bool)) ...)
;; (define-public (set-fee-basis-points (new-fee uint)) ...)
```

All pause and fee changes must go through the propose-wait-execute cycle.

#### Add Emergency Pause with Separate Authority

```clarity
(define-data-var emergency-authority (optional principal) none)
(define-constant emergency-pause-cooldown u2016) ;; ~14 days

(define-public (emergency-pause)
    (begin
        (asserts! (is-emergency-authorized) err-not-authorized)
        (var-set is-paused true)
        (var-set last-emergency-pause block-height)
        (print { event: "emergency-pause", authority: tx-sender })
        (ok true)
    )
)
```

The emergency authority is a separate principal (not the contract owner) that can only
pause, not unpause or change fees. After invoking, the authority enters a cooldown period.

#### Add cancel-pause-change

```clarity
(define-public (cancel-pause-change)
    (begin
        (asserts! (is-admin) err-owner-only)
        (asserts! (is-some (var-get pending-pause)) err-no-pending-change)
        (var-set pending-pause none)
        (print { event: "pause-change-cancelled" })
        (ok true)
    )
)
```

#### Add Timelock Extension

Allow the community to request a timelock extension on pending changes:

```clarity
(define-constant extension-delay u144) ;; Additional 144 blocks

(define-public (extend-timelock-fee)
    (begin
        (asserts! (is-some (var-get pending-fee)) err-no-pending-change)
        (var-set pending-fee-height (+ (var-get pending-fee-height) extension-delay))
        (print { event: "fee-timelock-extended" })
        (ok true)
    )
)
```

### Migration Strategy

1. Deploy `tipstream-v2` with the improved admin functions
2. Set `tipstream-v1` to paused state via the timelocked path
3. Update frontend to point to v2 contract address
4. Maintain v1 read-only queries for historical data
5. Transfer ownership of v1 to a burn address after migration period

### Deployment Checklist

- [ ] All v2 tests pass on simnet
- [ ] Security audit of v2 contract completed
- [ ] Migration script tested on testnet
- [ ] Community notified 7 days before migration
- [ ] Frontend updated with feature flag for v2
- [ ] Monitoring configured for v2 events
- [ ] Rollback plan documented

## Timeline

| Phase | Description | Duration |
|---|---|---|
| Development | Write and test v2 contract | 2-4 weeks |
| Audit | External security review | 1-2 weeks |
| Testnet | Deploy and test on testnet | 1 week |
| Migration | Deploy v2, pause v1, update frontend | 1 day |
| Monitoring | Post-migration monitoring period | 2 weeks |
