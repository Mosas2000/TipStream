# Cancel-Pause-Change Quick Start

## For Operators

### What Changed?

You can now **cancel pause proposals** instead of waiting for them to execute or manually creating new proposals.

### Quick Actions

| Action | Command | Time |
|--------|---------|------|
| Pause now | Click "Propose Pause" | 24 hours + execution |
| Stop pause proposal | Click "Cancel" | Immediate |
| Resume operations | Click "Propose Unpause" | 24 hours + execution |
| Check status | Refresh page | Instant |

### Typical Workflow

```
1. Propose pause → wait 24h
   └─ Before execution: Click "Cancel" to change your mind
   
2. When ready: Click "Execute"
   └─ Contract is now paused
   
3. After maintenance: Propose unpause
   └─ Again wait 24h, then execute
```

## For Developers

### Add to Admin Dashboard

```jsx
import AdminPauseControl from '../components/AdminPauseControl';

<AdminPauseControl
  proposal={proposal}
  currentHeight={blockHeight}
  isPaused={isPaused}
  isAdmin={userIsAdmin}
  onRefresh={refresh}
  onPropose={propose}
  onExecute={execute}
  onCancel={cancel}
  showNotification={notify}
/>
```

### Common Patterns

**Get pending proposal:**
```javascript
const { proposal, isPaused } = await getContractData('get-pending-pause-change');
```

**Cancel proposal:**
```javascript
await contractCall('cancel-pause-change', []);
```

**Calculate time remaining:**
```javascript
import { calculateBlocksRemaining } from '../lib/pauseOperations';
const blocksLeft = calculateBlocksRemaining(proposal.effectiveHeight, currentHeight);
```

## Files Overview

| File | Purpose | For |
|------|---------|-----|
| `contracts/tipstream.clar` | Cancel function | Developers |
| `frontend/src/components/AdminPauseControl.jsx` | UI component | Frontend devs |
| `frontend/src/lib/pauseOperations.js` | Utilities | Frontend devs |
| `docs/PAUSE_CONTROL_RUNBOOK.md` | How to operate | Operators |
| `docs/ADMIN_OPERATIONS.md` | Dashboard guide | Admins |
| `docs/CANCEL_PAUSE_INTEGRATION.md` | Integration examples | Developers |
| `docs/CANCEL_PAUSE_MIGRATION.md` | Deployment guide | DevOps |
| `docs/CANCEL_PAUSE_ARCHITECTURE.md` | Design decisions | Architects |

## Key Numbers

- **Timelock:** 144 blocks (~24 hours)
- **Authorization:** Admin/owner only
- **Tests:** 6 contract tests + 127 frontend tests
- **Documentation:** 8 comprehensive guides

## Help & References

### Q: How do I cancel a pause proposal?

A: Click the "Cancel" button in the Admin Pause Control panel. It takes effect immediately.

### Q: What if I propose the wrong pause value?

A: Use cancel to stop the proposal and propose again with the correct value. Timelock restarts.

### Q: Can anyone cancel proposals?

A: No, only the contract owner/admin can cancel.

### Q: What happens after I cancel?

A: The pause state is cleared. The contract resumes normal operations. You can propose again immediately.

### Q: Is there a charge for cancelling?

A: No, but you pay gas for the transaction like any other operation.

### Q: How do I know if a proposal is cancelled?

A: Check the blockchain explorer for the `pause-change-cancelled` event.

## Testing Locally

### Run Contract Tests
```bash
npm run test
# Looks for: 6 tests in "Timelocked Pause Changes" suite
```

### Run Frontend Tests
```bash
cd frontend
npm test -- pauseControl
npm test -- pauseOperations
npm test -- AdminPauseControl
```

### Check Results
All tests should pass:
- ✓ Contract: 6 tests
- ✓ State: 44 tests
- ✓ Utils: 50 tests
- ✓ Component: 33 tests

## Deployment Checklist

- [ ] Review contract changes in SECURITY.md
- [ ] Read admin runbook (PAUSE_CONTROL_RUNBOOK.md)
- [ ] Run all tests locally
- [ ] Deploy contract to testnet
- [ ] Test pause workflow on testnet
- [ ] Update admin dashboard
- [ ] Train admin team
- [ ] Deploy to mainnet
- [ ] Announce feature to users

## Emergency Reference

### Something went wrong?

**Check:** Is proposal still pending?
```javascript
const status = await getContractData('get-pending-pause-change');
// If status.pending.some is null → already cleared
// If status.pending.some has value → still pending
```

**Recover:** Cancel and try again
```javascript
await contractCall('cancel-pause-change', []);
```

**Escalate:** Review docs/PAUSE_CONTROL_RUNBOOK.md troubleshooting section

## Related Commands

### Contract Functions
- `propose-pause-change(bool)` - Start pause/unpause proposal
- `execute-pause-change()` - Execute after 144 blocks
- `cancel-pause-change()` - Cancel proposal (NEW!)
- `set-paused(bool)` - Emergency immediate pause
- `get-pending-pause-change()` - Check proposal status

### Frontend Utilities
- `calculateBlocksRemaining()` - Time until execution
- `canExecutePause()` - Can execute now?
- `canCancelPause()` - Can cancel now?
- `getPauseErrorMessage()` - User-friendly errors
- `formatTimelockInfo()` - Readable time info

## Learning Path

1. **Start:** Read this Quick Start
2. **Operate:** Review PAUSE_CONTROL_RUNBOOK.md
3. **Integrate:** Check CANCEL_PAUSE_INTEGRATION.md
4. **Deep Dive:** Study CANCEL_PAUSE_ARCHITECTURE.md
5. **Reference:** Use PAUSE_API_REFERENCE.md

## Useful Links

- **Main Guide:** docs/PAUSE_OPERATIONS.md
- **Admin Dashboard:** docs/ADMIN_OPERATIONS.md  
- **Integration:** docs/CANCEL_PAUSE_INTEGRATION.md
- **API Reference:** docs/PAUSE_API_REFERENCE.md
- **Architecture:** docs/CANCEL_PAUSE_ARCHITECTURE.md
- **Test Scenarios:** docs/CANCEL_PAUSE_TEST_SCENARIOS.md
- **Migration:** docs/CANCEL_PAUSE_MIGRATION.md

## What Happens When...

### I cancel a pause proposal?
- Pending proposal cleared immediately
- Contract pause state unchanged
- Can propose new pause immediately after
- Event recorded on blockchain

### I execute after cancelling?
- Error: "no-pending-change" (nothing to execute)
- Propose again if needed

### Timelock expires while proposal pending?
- Proposal becomes executable
- Cancel still works
- Execute will apply pause

### Network drops mid-cancel?
- Check if transaction hit chain
- Refresh to see current state
- Retry if needed

## Summary

**Cancel-pause-change** lets admins cancel pending pause proposals immediately, providing an escape hatch for mistaken operations while maintaining the safety of timelocked changes for intentional ones.

**Key benefit:** No more waiting 24 hours when you propose the wrong pause value. Just cancel and try again.

See the full documentation suite for comprehensive details on architecture, testing, integration, and operations.
