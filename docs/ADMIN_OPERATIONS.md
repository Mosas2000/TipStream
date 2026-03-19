# Admin Operations Runbook

Quick reference guide for common administrative tasks on TipStream.

## Quick Reference

| Task | Function | Timelock | Who | Time |
|---|---|---|---|---|
| Change Fee | `propose-fee-change` → `execute-fee-change` | 144 blocks (~24h) | Owner | 5 min |
| Pause Contract | `propose-pause-change` → `execute-pause-change` | 144 blocks (~24h) | Owner | 5 min |
| Emergency Pause | `set-paused` (direct) | None | Owner | Seconds |
| Change Owner | `propose-new-owner` → `accept-ownership` | 2-step | Owner → New Owner | 10 min |
| View Fee Rate | `get-current-fee-basis-points` | None (read) | Anyone | Instant |
| View Contract Status | `get-contract-owner` / `is-paused` | None (read) | Anyone | Instant |

## Pre-Administration Checklist

Before making ANY admin changes:

- [ ] Notify team in #operations Slack channel
- [ ] Verify you're using the correct wallet (mainnet owner)
- [ ] Test on testnet first (if possible)
- [ ] Have a communication draft ready (if public-facing)
- [ ] Know the rationale (document in issue or ticket)

## Common Tasks

### Task 1: Change the Fee Rate

**Current Rate**: 50 basis points (0.5%)
**Min**: 0 basis points (0%)
**Max**: 1000 basis points (10%)

#### Steps:

1. **Propose Fee Change** (Immediately)

   ```
   Function: propose-fee-change(uint new-fee-basis-points)
   Parameters:
   - new-fee-basis-points: 75  # example: 0.75%

   Result: Proposal recorded, execution blocked for 144 blocks
   ```

   Via Admin Dashboard:
   - Navigate to `/admin`
   - Click "Propose Fee Change"
   - Enter new rate (75)
   - Sign transaction in wallet
   - Wait for confirmation

2. **Announce Timelock** (Immediately after)

   Post in #announcements:
   ```
   ⏰ Fee Change Proposed

   New rate: 0.75% (was 0.5%)
   Rationale: [your reason]
   Execution: In ~24 hours (144 Stacks blocks)

   To cancel: Propose new rate or wait for revert
   ```

3. **Wait 144 Blocks** (~24 hours, verified)

   Monitor progress:
   ```
   Stacks Block Height: [check Hiro Explorer]
   Blocks until execution: [144 - (current - proposal-block)]
   ETA: [24 hours from proposal]
   ```

4. **Execute Fee Change** (After 144 blocks)

   ```
   Function: execute-fee-change()
   Parameters: None
   ```

   Via Admin Dashboard:
   - Navigate to `/admin`
   - Click "Execute Fee Change"
   - Sign transaction in wallet
   - Wait for confirmation

5. **Confirm and Announce** (After execution)

   ```
   ✅ Fee Update Live

   New rate: 0.75%
   Effective: Block [block-height]
   All new tips use new rate

   Thanks for your support!
   ```

   Also update:
   - SECURITY.md (Current fee status)
   - CHANGELOG.md

#### Common Fee Scenarios

**Raise fee** (e.g., 0.5% → 1%):
- Rationale: Cover increased operational costs
- Communication: Give 1 week notice
- Adoption: Most transactions use new rate within 24 hours

**Lower fee** (e.g., 0.5% → 0.25%):
- Rationale: Increase adoption, competitive advantage
- Communication: Highlight free trial period end
- Adoption: Immediate uptake

**Pause fees** (0.5% → 0%):
- Rationale: Launch promotion or emergency response
- Communication: "Fee waived through [date]"
- Adoption: Users should see immediate change

---

### Task 2: Pause or Unpause the Contract

**Use Cases**:
- Emergency security issue
- Scheduled maintenance
- Community vote to pause

#### Standard Pause (Timelocked)

1. **Propose Pause** (Immediately)

   ```
   Function: propose-pause-change(bool new-paused-status)
   Parameters:
   - new-paused-status: true  # Pause=true, Unpause=false
   ```

2. **Announce** (Immediately)

   ```
   🚨 Contract Pause Proposed

   Status: Paused (no new tips)
   Reason: [security/maintenance/other]
   Duration: ~24 hours
   ```

3. **Wait 144 Blocks** (~24 hours)

4. **Execute Pause** (After 144 blocks)

   ```
   Function: execute-pause-change()
   ```

#### Emergency Pause (Immediate)

**Only use for critical security issues**

```
Function: set-paused(bool paused)
Parameters:
- paused: true  # Immediate effect
```

Takes effect immediately (no 144-block delay).

**Requirements for emergency use**:
- Life-threatening exploit discovered
- Contract fund stolen/drained
- Critical data corruption
- Documented rationale (post to Discord immediately)

---

### Task 3: Change Contract Owner (Ownership Transfer)

**Process**: Two-step to prevent accidents

#### Step 1: Current Owner Proposes New Owner

```
Function: propose-new-owner(principal new-owner)
Parameters:
- new-owner: SP1234...ABC.owner-address
```

**Via Admin Dashboard**:
- Navigate to `/admin` → Owner Settings
- Enter new owner address
- Click "Propose Ownership Transfer"
- Sign in wallet

#### Step 2: New Owner Accepts Ownership

New owner must call:

```
Function: accept-ownership()
Parameters: None
```

**From new owner's account**:
- Have them navigate to `/admin`
- Click "Accept Ownership"
- Sign in wallet with new owner account

#### Verification

After acceptance:

```
Function: get-contract-owner()
Result should be: SP1234...ABC
```

---

### Task 4: Emergency Downgrade or Rollback

**Note**: Contracts are immutable; you cannot change deployed code.

**Options**:

1. **Pause Old Contract**
   ```
   set-paused(true) on old contract
   ```

2. **Deploy New Version**
   ```
   Deploy tipstream-v2 with fix
   Point frontend to new address
   ```

3. **Gradual Migration**
   - Week 1: Announce new address in app
   - Week 2: Default to new, allow old
   - Week 3: Deprecate old (read-only)
   - Week 4: Full phase-out

---

## Monitoring Dashboard

### Daily Checks

```javascript
// In browser console on /admin or Hiro Explorer:

// 1. Contract Status
fetch('https://api.hiro.so/.../get-contract-owner')
// Should return owner address

fetch('https://api.hiro.so/.../is-paused')
// Should return boolean (false = operational)

// 2. Recent Transactions
fetch('https://api.hiro.so/v2/smart_contracts/...')
// Review recent calls for anomalies

// 3. Fee Status
fetch('https://api.hiro.so/.../get-current-fee-basis-points')
// Should return current basis points
```

### Weekly Checks

- [ ] Review fee collection totals
- [ ] Check for error spikes in transactions
- [ ] Verify pending admin operations (if any)
- [ ] Scan Discord for reported issues

### Monthly Checks

- [ ] Generate admin activity report (who changed what)
- [ ] Review community feedback on fees/operations
- [ ] Plan next quarter admin actions (if any)
- [ ] Update this runbook with lessons learned

---

## Alerts & Escalation

### Alert: Unauthorized Admin Call Detected

**Severity**: CRITICAL

**Response**:
1. Check Hiro Explorer for transaction
2. Verify it's not a duplicate or test
3. If unauthorized:
   - Propose new owner change immediately
   - Audit wallet security
   - Post to #security
   - Contact Hiro support if account compromised

### Alert: Fee Change Stuck

**Severity**: MEDIUM

**Scenario**: 144 blocks passed but execute fails

**Troubleshooting**:
1. Verify current block height vs proposal block
2. Check if new proposal was made (overwrites old one)
3. Try execute again (sometimes transient errors)
4. If still fails: File issue with block number and tx

### Alert: Contract Paused, Can't Unpause

**Severity**: HIGH

**Recovery**:
1. Verify pause-change-proposal exists
2. Calculate exec block
3. If past exec block: Call execute-pause-change(false)
4. If not yet: Wait until block number reached
5. If unclear: Post block number in #operations

---

## Communication Templates

### Before Fee Change

```
📢 Notification: Fee Rate Change Coming

TipStream is adjusting the platform fee from X% to Y%.

Effective: [Date in 1 week]
Reason: [brief explanation]

Questions? Ask in #support
```

### During Critical Maintenance

```
🔧 Scheduled Maintenance

Contract paused for [estimated time]
Reason: [maintenance/upgrade]
Status updates: In #status-updates channel

Thank you for your patience.
```

### After Incident Resolution

```
✅ Incident Resolved

Issue: [what happened]
Duration: [how long paused]
Status: Contract resumed, all systems normal

Full incident report: [link to docs/INCIDENT_REPORTS/]
```

---

## Compliance & Audit Trail

**Record keeping**:

1. **Issue Ticket**: Create GitHub issue documenting rationale
2. **PR Comment**: Link PR/commit that changes admin params
3. **CHANGELOG.md**: Record all public-facing admin changes
4. **Incident Report**: If emergency pause, document in `docs/INCIDENT_REPORTS/`

**Annual Audit Checklist**:

- [ ] Review all admin changes from past year
- [ ] Verify fee history matches CHANGELOG
- [ ] Check owner transfer logs (if any)
- [ ] Confirm no unauthorized calls in Hiro Explorer

---

## Troubleshooting

| Problem | Check | Fix |
|---|---|---|
| Admin Dashboard not loading | Dev console errors | Refresh page, clear cache |
| Proposal won't submit | Wallet connected? | Ensure Leather/Xverse connected |
| Can't find Execute button | Is 144 blocks past proposal? | Check Stacks block height |
| Transaction fails with ERR-UNAUTHORIZED | Are you the owner? | Use correct mainnet wallet |
| Fee change shows old rate | Cache not refreshed | Hard refresh browser (Cmd+Shift+R) |

---

**Last Updated:** March 2026
**Next Review:** Quarterly
**Owner:** Operations/Security Team
**Emergency Contact**: #operations on Discord or security@tipstream.app

