# Admin Pause Control Runbook

## Quick Reference

| Action | Command | When to Use |
|--------|---------|------------|
| Pause immediately | `set-paused(true)` | Security emergency |
| Propose pause | `propose-pause-change(true)` | Planned maintenance |
| Cancel pause proposal | `cancel-pause-change` | Mistaken proposal |
| Execute pause | `execute-pause-change` | After timelock expires |
| Unpause immediately | `set-paused(false)` | Emergency recovery |
| Unpause gradually | `propose-pause-change(false)` | Planned recovery |

## Procedures

### Procedure 1: Urgent Pause (Emergency Response)

**Situation:** Security breach or critical bug discovered

**Steps:**
1. Verify the issue details and scope
2. Call `set-paused(true)` - this takes effect immediately, no timelock
3. Notify stakeholders via official channels
4. Begin root cause analysis
5. When safe, call `set-paused(false)` to resume operations

**Time to Pause:** < 1 minute
**Visibility:** High risk of service interruption
**Recovery:** Requires manual unpausing

### Procedure 2: Planned Pause (Scheduled Maintenance)

**Situation:** Planned maintenance, upgrade, or non-emergency pause

**Steps:**
1. Schedule maintenance window with stakeholders
2. Call `propose-pause-change(true)` to start timelock
3. Document pause reason in monitoring system
4. Wait for 144 blocks ≈ 24 hours for verification period
5. At maintenance window, verify conditions, call `execute-pause-change`
6. Perform maintenance
7. Call `propose-pause-change(false)` for unpause
8. Wait 144 blocks, call `execute-pause-change` to resume

**Time to Pause:** 24 hours + execution
**Visibility:** Planned, announced
**Recovery:** Scheduled within maintenance window

### Procedure 3: Cancel Accidental Pause Proposal

**Situation:** Pause proposal submitted by mistake

**Steps:**
1. Identify the mistaken proposal via transaction history
2. Verify no valid reason to keep the proposal
3. Call `cancel-pause-change` immediately
4. Confirm via `get-pending-pause-change` that pending-pause is now none
5. No further action needed

**Time to Recovery:** < 1 minute
**Risk:** None - contract continues operating
**Visibility:** Internal only, transaction in logs

### Procedure 4: Change Pause Decision During Timelock

**Situation:** Pause proposal pending, decision changed before execution

**Steps:**
1. Check current pause proposal: `get-pending-pause-change`
2. Identify issue with current proposal
3. Call `cancel-pause-change` to cancel current proposal
4. Call `propose-pause-change(true/false)` with corrected decision
5. Timelock begins fresh from step 4
6. Proceed with corrected plan

**Example:** Proposed pause for maintenance, but found non-invasive fix instead
1. Cancel pause proposal
2. Propose unpause (pause=false) instead
3. Wait 144 blocks
4. Execute unpause

**Time Impact:** Adds 24 hours delay
**Risk:** Minimal - explicitly correcting course
**Visibility:** Multiple transactions in history

### Procedure 5: Replace Pending Pause Proposal

**Situation:** Need to change pause value while proposal pending

**Steps:**
1. Verify current pending proposal: `get-pending-pause-change`
2. Call `propose-pause-change(new-value)` with desired state
3. This automatically overwrites the previous proposal
4. Timelock restarts fresh for new proposal
5. Wait 144 blocks
6. Call `execute-pause-change` when ready

**Note:** This overwrites without explicit cancellation

**Time Impact:** Resets timelock  
**Risk:** Previous proposal is lost
**Visibility:** Multiple proposal events in logs

## Monitoring Checklist

Before executing any pause change:

- [ ] Verified pending pause proposal status
- [ ] Confirmed current block height vs. timelock expiration
- [ ] Reviewed reason for pause in documentation
- [ ] Notified relevant stakeholders
- [ ] Confirmed correct pause value (true/false)
- [ ] Checked recent contract state
- [ ] Verified admin authorization level

## Rollback Procedures

### If Pause Executed Unexpectedly

1. Verify pause state: Check `get-is-paused` returns true
2. Determine if intentional
3. If unintentional:
   - Call `set-paused(false)` immediately (direct bypass)
   - Investigate cause of execution
   - Review transaction history
   - Report incident

### If Pause Proposal Stuck

1. Check pending proposal: `get-pending-pause-change`
2. If proposal should not exist:
   - Call `cancel-pause-change` to clear
   - Verify cleared via get-pending-pause-change
3. If timelock expired:
   - Call `execute-pause-change` or cancel as needed
4. Monitor for recurring issues

### If Unpause Fails

1. Call `set-paused(false)` directly (bypasses timelock)
2. Verify `get-is-paused` returns false
3. Monitor system for issues
4. Investigate failure cause

## Common Issues

### Issue: "no-pending-change" Error

**Cause:** Attempted cancel/execute but no proposal pending

**Resolution:**
- Check `get-pending-pause-change` to see current state
- Cancel: Only call when `pending-pause` is (some true/false)
- Execute: Only call when `pending-pause` is (some true/false)

### Issue: "timelock-not-expired" Error

**Cause:** Attempted execute before timelock expired

**Resolution:**
- Check `get-pending-pause-change` for effective-height
- Wait for current block to reach effective-height
- Monitor blockchain for new blocks
- Retry execute after timelock passes

### Issue: "owner-only" Error

**Cause:** Non-admin attempted pause operation

**Resolution:**
- Verify caller has admin authorization
- Use admin account for all pause operations
- Review account permissions in contract

## Audit Trail

All pause operations create blockchain events:

```
Type: pause-change-proposed
When: Proposal submitted
Details: Proposed pause state, effective block height

Type: pause-change-executed  
When: Proposal executed after timelock
Details: Applied pause state

Type: pause-change-cancelled
When: Proposal cancelled explicitly
Details: (none - just the cancellation event)

Type: contract-paused
When: set-paused used directly
Details: New pause state
```

Review events via:
- Blockchain explorer
- Event indexing service
- Contract logs

## Escalation Path

- **Tier 1 (< 5 minutes):** Immediate pause via `set-paused`
- **Tier 2 (< 1 hour):** Coordinate with stakeholders, execute pending operations
- **Tier 3 (24+ hours):** Scheduled maintenance via `propose-pause-change`

## References

- [PAUSE_OPERATIONS.md](./PAUSE_OPERATIONS.md) - Technical documentation
- [SECURITY.md](../SECURITY.md) - Security considerations
- [ADMIN_OPERATIONS.md](./ADMIN_OPERATIONS.md) - Admin dashboard guide
