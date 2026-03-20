# Pause Change Operations

## Overview

The contract supports timelocked pause changes with explicit cancellation. This provides
operational control over contract pausing with a safety period for verification before activation.

## Functions

### propose-pause-change

Propose a change to the contract's paused state with a configurable timelock delay.

**Parameters:**
- `paused` (bool) - Desired paused state (true to pause, false to unpause)

**Authorization:** Admin only

**Behavior:**
- Sets pending pause state
- Sets timelock expiration height (current block + 144 blocks)
- Emits pause-change-proposed event with effective height
- Overwrites any previous pending pause proposal

**Example:**
```clarity
(contract-call? .tipstream propose-pause-change true)
```

### execute-pause-change

Execute a pending pause proposal after the timelock expires.

**Authorization:** Admin only

**Requirements:**
- Pending pause proposal must exist
- Current block height must be >= timelock expiration height

**Behavior:**
- Applies the pending pause state to the contract
- Clears pending pause proposal
- Emits pause-change-executed event

**Example:**
```clarity
(contract-call? .tipstream execute-pause-change)
```

### cancel-pause-change

Cancel a pending pause proposal without executing it.

**Authorization:** Admin only

**Requirements:**
- Pending pause proposal must exist

**Behavior:**
- Clears pending pause state
- Clears timelock expiration height
- Emits pause-change-cancelled event
- Allows immediate resubmission with new proposal

**Example:**
```clarity
(contract-call? .tipstream cancel-pause-change)
```

## Scenarios

### Scenario 1: Pause Due to Security Issue

1. Admin discovers a security issue
2. Admin calls `propose-pause-change(true)` to propose pausing
3. Admin waits for verification period (144 blocks ≈ 24 hours)
4. Admin calls `execute-pause-change` to activate pause
5. Contract is paused, preventing further tipping

### Scenario 2: Accidental Pause Proposal

1. Admin accidentally proposes pausing
2. Admin immediately calls `cancel-pause-change` to cancel
3. No timelock penalty, proposal is dismissed
4. Contract continues operating normally

### Scenario 3: Cancel and Resubmit

1. Admin proposes `pause = true`
2. During verification, determines different action needed
3. Admin calls `cancel-pause-change` to cancel original
4. Admin calls `propose-pause-change(false)` for unpausing instead
5. Verification period begins anew for revised proposal

### Scenario 4: Replace Pending Proposal

1. Admin proposes `pause = true`
2. Admin later decides to propose `pause = false` instead
3. Admin calls `propose-pause-change(false)` - this overwrites pending proposal
4. Timelock restarts with new proposal
5. New proposal can be executed after timelock expires

## Decision Tree

When managing pause state:

```
Need to pause?
├─ YES, urgent issue → use set-paused (direct bypass)
├─ YES, normal change → use propose-pause-change, then execute after timelock
│   ├─ Decide to cancel during timelock? → call cancel-pause-change
│   ├─ Timelock expired, ready? → call execute-pause-change
│   └─ Need different action? → cancel, then propose new
└─ NO, continue normal operations
```

## Authorization Matrix

| Function | Admin | Non-Admin |
|----------|-------|-----------|
| propose-pause-change | ✓ | ✗ |
| execute-pause-change | ✓ | ✗ |
| cancel-pause-change | ✓ | ✗ |
| set-paused (direct) | ✓ | ✗ |
| get-pending-pause-change | ✓ | ✓ |
| is-paused | ✓ | ✓ |

## Events

### pause-change-proposed
```clarity
{
  event: "pause-change-proposed",
  paused: true/false,
  effective-height: block-height
}
```

### pause-change-executed
```clarity
{
  event: "pause-change-executed",
  paused: true/false
}
```

### pause-change-cancelled
```clarity
{
  event: "pause-change-cancelled"
}
```

## State Functions

### get-pending-pause-change

Returns the current pending pause proposal and timelock expiration height.

**Response:**
```clarity
{
  pending-pause: (optional bool),
  effective-height: block-height
}
```

- `pending-pause: none` - No proposal pending
- `pending-pause: (some true)` - Pause proposal pending
- `pending-pause: (some false)` - Unpause proposal pending
- `effective-height: 0` - No pending proposal
- `effective-height: N` - Timelock expires at block N

## Safety Considerations

1. **Verification Period:** 144 blocks ≈ 24 hours allows verification before activation
2. **Explicit Cancellation:** cancel-pause-change prevents accidental executions
3. **Proposal Replacement:** New proposals overwrite old ones, allowing course correction
4. **Direct Bypass:** set-paused available for immediate action in emergencies
5. **Transparency:** All operations emit events for audit trail

## Testing

The contract includes comprehensive tests for:
- Proposal submission
- Timelock enforcement
- Execution after timelock expiration
- Cancellation with state cleanup
- Authorization checks
- Edge cases (no pending proposal, non-admin attempts)
- Proposal replacement scenarios
