# Cancel-Pause-Change Migration Guide

## Overview

This document provides guidance for deploying the new `cancel-pause-change` functionality to existing TipStream deployments. The feature is backward compatible and requires no action from users.

## What Changed

**New Function Added:**
```clarity
(define-public (cancel-pause-change) ...)
```

This function allows admins to cancel a pending pause proposal before the timelock expires, providing operational symmetry with the existing `cancel-fee-change` function.

**State Variables (No Changes):**
- `pending-pause` (existing)
- `pending-pause-height` (existing)

**No breaking changes to existing functions or state.**

## Pre-Deployment Checklist

- [ ] Review SECURITY.md pause section
- [ ] Review PAUSE_OPERATIONS.md technical guide
- [ ] Review PAUSE_CONTROL_RUNBOOK.md operational guide
- [ ] Review ADMIN_OPERATIONS.md admin dashboard guide
- [ ] Test cancel-pause-change on testnet
- [ ] Verify all 6 pause operation tests pass
- [ ] Coordinate with admin team on new capability
- [ ] Prepare admin notifications/runbooks

## Deployment Steps

### Step 1: Contract Deployment

**Mainnet:**
```
1. Deploy tipstream v1.1 with cancel-pause-change
2. Verify contract address matches expected
3. Update DEPLOYMENT.md with new version
4. Announce to admin team
```

**Process:**
- All existing contract calls continue to work unchanged
- Only admins can use new `cancel-pause-change` function
- No impact on user-facing operations

### Step 2: Frontend Update

**Update admin dashboard:**
```
1. Pull latest frontend code with cancel-pause-change UI
2. Ensure API endpoints point to correct contract version
3. Test pause proposal display
4. Test cancel button appears when appropriate
5. Deploy to production
```

**No user-facing changes:**
- Users cannot call cancel-pause-change
- Users cannot see pause control UI
- All functionality backward compatible

### Step 3: Documentation Update

**Update operational docs:**
```
1. Reference PAUSE_CONTROL_RUNBOOK.md in admin docs
2. Update admin dashboard help tooltips
3. Link to ADMIN_OPERATIONS.md from contract docs
4. Add cancel-pause-change to contract function reference
```

## Operational Readiness

### Admin Team Training

**New capability for admins:**
1. Can now cancel pause proposals immediately (no wait required)
2. Reduces operational risk if wrong pause value proposed
3. Symmetric with fee change cancellation capability
4. Can still use direct `set-paused` for emergencies

**Training items:**
- Review PAUSE_CONTROL_RUNBOOK.md (15 min)
- Practice on testnet (10 min)
- Q&A on edge cases (15 min)

### Monitoring Setup

**Add to monitoring/alerting:**

```javascript
// Track pause cancellations
watchEvent('pause-change-cancelled', (event) => {
  logToMonitoring({
    type: 'ADMIN_ACTION',
    action: 'cancel_pause',
    block: event.block_height,
    tx: event.tx_id
  });
});

// Alert if multiple cancellations in short time
if (pauseCancellations > 5 in past_hour) {
  alertOps('Multiple pause cancellations detected');
}
```

**Expected metrics:**
- Cancellations per month: 0-1 normally (mostly tests/mistakes)
- Response time: < 1 minute from proposal to cancellation
- Error rate: < 0.1% (authorization checks)

## Testing Guidance

### Testnet Validation

**Before mainnet deployment:**
```
1. Deploy contract to testnet
2. Run full test suite: npm run test
3. Manual testnet scenarios:
   - Propose pause, then cancel
   - Verify state is cleared
   - Attempt to cancel non-existent proposal (should fail)
   - Cancel, then re-propose (should succeed with fresh timelock)
4. Test via admin dashboard UI
5. Verify events logged correctly
```

### Integration Testing

**After deployment:**
```
1. Verify contract deployed at correct address
2. Call get-pending-pause-change (should return no pending initially)
3. Call propose-pause-change to add proposal
4. Call get-pending-pause-change (should show pending)
5. Call cancel-pause-change
6. Call get-pending-pause-change (should return no pending)
7. Verify pause-change-cancelled event emitted
8. Repeat cancel with no pending (should fail with no-pending-change)
```

## Rollback Procedure

If cancel-pause-change needs to be disabled:

**Option 1: Contract Update (Requires New Deployment)**
```
Deploy tipstream v1.2 without cancel-pause-change
- More complex, not recommended
- Contract is immutable, need new deployment
```

**Option 2: Disable via Admin Controls (Simple)**
```
- Remove cancel button from admin dashboard
- Cancel operations would fail client-side
- Users cannot bypass (authorization still enforced)
- Can be re-enabled by updating dashboard
```

**Option 3: Gradual Rollout**
```
1. Deploy contract with feature enabled
2. Keep cancel button hidden in dashboard (for 1 week)
3. Test thoroughly server-side
4. Gradually roll out dashboard update to 10% → 50% → 100% users
5. Monitor for issues at each stage
```

## Documentation Links

- [SECURITY.md](../SECURITY.md) - Security analysis including pause operations
- [PAUSE_OPERATIONS.md](./PAUSE_OPERATIONS.md) - Technical implementation details
- [PAUSE_CONTROL_RUNBOOK.md](./PAUSE_CONTROL_RUNBOOK.md) - Operational procedures
- [ADMIN_OPERATIONS.md](./ADMIN_OPERATIONS.md) - Admin dashboard guide
- [contracts/tipstream.clar](../contracts/tipstream.clar) - Contract source code

## Known Limitations

1. **Cancel only works while proposal pending**
   - If execution block reached, must execute or wait for override
   - Proposal duration is fixed at 144 blocks

2. **No automatic revert on cancel**
   - Must manually propose new value
   - Timelock restarts from new proposal

3. **Authorization unchanged**
   - Only contract owner/admin can cancel
   - No delegation or multi-sig in current implementation

## Questions & Support

**For deployment questions:**
- Check PAUSE_OPERATIONS.md technical docs
- Review PAUSE_CONTROL_RUNBOOK.md procedures

**For admin operations questions:**
- Read ADMIN_OPERATIONS.md admin guide
- Check troubleshooting section

**For implementation details:**
- See contracts/tipstream.clar lines 400-407
- See tests/tipstream.test.ts pause test suite

## Success Criteria

Deployment is successful when:

- [ ] Contract deployed and verified on-chain
- [ ] All 6 pause tests passing on mainnet
- [ ] Admin dashboard displays pause control UI
- [ ] Cancel button appears when proposal pending
- [ ] Cancellation works and clears state
- [ ] Events logged correctly in block explorer
- [ ] Admin team trained and confident
- [ ] No user-facing impact observed
- [ ] Documentation complete and accessible

## Timeline Recommendations

- **Week 1:** Deploy contract, run testnet validation
- **Week 2:** Deploy admin dashboard update, train admin team
- **Week 3:** Full rollout, monitor metrics
- **Week 4+:** Operational readiness

Total time to full deployment: 3-4 weeks including testing and training.
