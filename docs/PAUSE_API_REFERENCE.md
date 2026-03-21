# Pause Operations API Reference

## Contract Functions

### propose-pause-change

Submits a pause state change proposal with 144-block timelock.

**Function Signature:**
```clarity
(define-public (propose-pause-change (new-paused bool)) ...)
```

**Parameters:**
- `new-paused` (bool): Target pause state (true = pause, false = unpause)

**Response:**
```clarity
(ok true)  ; Success
(err "owner-only")  ; Not authorized
```

**Events:**
- `pause-change-proposed`: Emitted when proposal created

**Authorization:** Contract owner/admin only

**Timelock:** 144 blocks (~24 hours)

---

### execute-pause-change

Executes a pending pause proposal after timelock expires.

**Function Signature:**
```clarity
(define-public (execute-pause-change) ...)
```

**Parameters:** None

**Response:**
```clarity
(ok true)  ; Success
(err "no-pending-change")  ; No proposal pending
(err "timelock-not-expired")  ; Timelock not yet expired
(err "owner-only")  ; Not authorized
```

**Events:**
- `pause-change-executed`: Emitted when proposal executed

**Authorization:** Contract owner/admin only

**State Changes:**
- Updates contract pause state
- Clears pending proposal
- Clears pending execution height

---

### cancel-pause-change

Cancels a pending pause proposal before timelock expires.

**Function Signature:**
```clarity
(define-public (cancel-pause-change) ...)
```

**Parameters:** None

**Response:**
```clarity
(ok true)  ; Success
(err "no-pending-change")  ; No proposal pending
(err "owner-only")  ; Not authorized
```

**Events:**
- `pause-change-cancelled`: Emitted when proposal cancelled

**Authorization:** Contract owner/admin only

**State Changes:**
- Clears pending proposal
- Clears pending execution height
- Contract pause state unchanged

---

### get-pending-pause-change

Returns current pending pause proposal and contract status.

**Function Signature:**
```clarity
(define-read-only (get-pending-pause-change) ...)
```

**Parameters:** None

**Response:**
```clarity
{
  pending: (some { value: bool, effectiveHeight: uint })  ; or (none)
  current: bool  ; Current pause state
}
```

**Example Responses:**

No proposal pending, contract running:
```javascript
{
  ok: {
    pending: { some: null },
    current: false
  }
}
```

Pause proposal pending:
```javascript
{
  ok: {
    pending: {
      some: {
        value: true,
        effectiveHeight: 12144
      }
    },
    current: false
  }
}
```

---

### is-paused

Returns current contract pause state.

**Function Signature:**
```clarity
(define-read-only (is-paused) ...)
```

**Parameters:** None

**Response:**
```clarity
true   ; Contract is paused
false  ; Contract is running
```

---

## Frontend Utilities

### pauseOperations.js

#### Constants

```javascript
PAUSE_OPERATIONS = {
  PROPOSE_PAUSE: 'propose-pause-change',
  EXECUTE_PAUSE: 'execute-pause-change',
  CANCEL_PAUSE: 'cancel-pause-change',
  GET_PENDING: 'get-pending-pause-change',
  IS_PAUSED: 'is-paused'
}

TIMELOCK_BLOCKS = 144  // ~24 hours
```

#### Functions

**calculateBlocksRemaining(effectiveHeight, currentHeight)**
```javascript
// Returns: number of blocks until timelock expires
// Example:
calculateBlocksRemaining(12100, 12000) // => 100
```

**isTimelockExpired(effectiveHeight, currentHeight)**
```javascript
// Returns: boolean indicating if timelock has expired
// Example:
isTimelockExpired(12000, 12100) // => true
```

**calculateEffectiveHeight(proposalHeight)**
```javascript
// Returns: block height when proposal becomes executable
// Example:
calculateEffectiveHeight(12000) // => 12144
```

**parsePauseProposal(contractResponse)**
```javascript
// Returns: { value: bool, effectiveHeight: uint } | null
// Parses contract response into proposal object
// Example:
const proposal = parsePauseProposal(response);
// => { value: true, effectiveHeight: 12000 }
```

**parsePauseStatus(contractResponse)**
```javascript
// Returns: { proposal: {...} | null, isPaused: bool, currentHeight: uint }
// Parses full pause status from contract
// Example:
const status = parsePauseStatus(response);
// => { proposal: {...}, isPaused: false, currentHeight: 12000 }
```

**canExecutePause(proposal, currentHeight)**
```javascript
// Returns: boolean indicating if proposal can be executed
// Checks: proposal exists AND timelock expired
// Example:
canExecutePause(proposal, 12100) // => true if ready
```

**canCancelPause(proposal)**
```javascript
// Returns: boolean indicating if proposal can be cancelled
// Checks: proposal exists
// Example:
canCancelPause(proposal) // => true if pending
```

**canProposePause(proposal)**
```javascript
// Returns: boolean indicating if new proposal can be made
// Checks: no proposal currently pending
// Example:
canProposePause(null) // => true
```

**getPauseDisplayStatus(proposal, isPaused, currentHeight)**
```javascript
// Returns: one of: 'running' | 'paused' | 'proposal-pending' | 'ready-to-execute'
// Example:
getPauseDisplayStatus(proposal, false, 12000)
// => 'proposal-pending' | 'ready-to-execute'
```

**getPauseDisplayMessage(proposal, isPaused, currentHeight)**
```javascript
// Returns: human-readable status message
// Example:
getPauseDisplayMessage(proposal, false, 12000)
// => "Pause proposal pending. Blocks remaining: 100"
```

**getPauseErrorMessage(error)**
```javascript
// Returns: user-friendly error message
// Maps contract errors to explanations
// Example:
getPauseErrorMessage('no-pending-change')
// => "No pause proposal pending. Please propose a pause first."
```

**getPauseProposalSummary(proposal, isPaused, currentHeight)**
```javascript
// Returns: { type, action?, blocksRemaining?, description }
// Example:
getPauseProposalSummary(proposal, false, 12000)
// => { 
//   type: 'pending',
//   action: 'pause',
//   blocksRemaining: 100,
//   description: 'Pause proposal pending...'
// }
```

**validatePauseProposal(shouldPause, currentPauseState)**
```javascript
// Returns: { isValid: bool, errors: string[] }
// Validates proposal before submission
// Example:
validatePauseProposal(true, false)
// => { isValid: true, errors: [] }
```

**formatTimelockInfo(proposal, currentHeight)**
```javascript
// Returns: formatted timelock status string
// Example:
formatTimelockInfo(proposal, 12000)
// => "Blocks remaining: 100 (≈ 24.0 hours)"
```

**shouldAutoRefreshPauseStatus(proposal, currentHeight, lastRefreshHeight)**
```javascript
// Returns: boolean indicating if status should be refreshed
// Refreshes when 12+ blocks elapsed
// Example:
shouldAutoRefreshPauseStatus(proposal, 12012, 12000)
// => true
```

---

## React Component

### AdminPauseControl

Admin dashboard component for pause proposal management.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `proposal` | object\|null | Yes | Current pending proposal or null |
| `currentHeight` | number | Yes | Current block height |
| `isPaused` | bool | Yes | Current pause state |
| `isAdmin` | bool | Yes | Whether user is admin |
| `onRefresh` | function | Yes | Callback to refresh state |
| `onPropose` | function | Yes | Callback to propose pause change |
| `onExecute` | function | Yes | Callback to execute proposal |
| `onCancel` | function | Yes | Callback to cancel proposal |
| `showNotification` | function | Yes | Callback to show notification |
| `isLoading` | bool | No | Whether operations in progress |

**Usage:**

```jsx
<AdminPauseControl
  proposal={pauseProposal}
  currentHeight={blockHeight}
  isPaused={contractPaused}
  isAdmin={userIsAdmin}
  onRefresh={refreshStatus}
  onPropose={handlePropose}
  onExecute={handleExecute}
  onCancel={handleCancel}
  showNotification={notify}
  isLoading={isLoading}
/>
```

**Callback Signatures:**

```javascript
// onPropose(shouldPause: bool): Promise<void>
onPropose(true)  // Propose pause

// onExecute(): Promise<void>
onExecute()  // Execute pending proposal

// onCancel(): Promise<void>
onCancel()  // Cancel pending proposal

// onRefresh(): Promise<void>
onRefresh()  // Refresh pause status

// showNotification(message: string, type?: 'success'|'error'|'warning'): void
showNotification('Success', 'success')
```

---

## Error Codes

### Contract Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| `owner-only` | Caller not authorized | Use admin account |
| `no-pending-change` | No proposal pending | Create proposal first |
| `timelock-not-expired` | Execution too early | Wait for block height |

### Frontend Errors

| Error | Cause | Recovery |
|-------|-------|----------|
| Network timeout | RPC unavailable | Retry operation |
| Invalid proposal | Parsing failed | Refresh page |
| Transaction rejected | User cancelled | Try again |

---

## Event Types

### Contract Events

All pause operations emit events to blockchain:

**pause-change-proposed**
```javascript
{
  event: 'pause-change-proposed',
  data: {
    proposedValue: bool,
    effectiveBlock: uint,
    proposedBy: principal
  }
}
```

**pause-change-executed**
```javascript
{
  event: 'pause-change-executed',
  data: {
    appliedValue: bool,
    block: uint
  }
}
```

**pause-change-cancelled**
```javascript
{
  event: 'pause-change-cancelled',
  data: {
    cancelledBy: principal
  }
}
```

---

## Examples

### Check if Pause Ready to Execute

```javascript
import { canExecutePause } from '../lib/pauseOperations';

const proposal = await getContractData();
if (canExecutePause(proposal, currentHeight)) {
  showButton('Execute Pause');
}
```

### Calculate Time Until Execution

```javascript
import { calculateBlocksRemaining, formatTimelockInfo } from '../lib/pauseOperations';

const info = formatTimelockInfo(proposal, currentHeight);
console.log(info);
// Output: "Blocks remaining: 100 (≈ 24.0 hours)"
```

### Handle Pause Errors

```javascript
import { getPauseErrorMessage } from '../lib/pauseOperations';

try {
  await executeProposal();
} catch (error) {
  const message = getPauseErrorMessage(error);
  showError(message);
}
```

### Validate Before Proposing

```javascript
import { validatePauseProposal } from '../lib/pauseOperations';

const validation = validatePauseProposal(true, false);
if (!validation.isValid) {
  showErrors(validation.errors);
  return;
}
proposeChange(true);
```

---

## Related Documentation

- [PAUSE_OPERATIONS.md](./PAUSE_OPERATIONS.md) - Technical details
- [PAUSE_CONTROL_RUNBOOK.md](./PAUSE_CONTROL_RUNBOOK.md) - Operational procedures
- [ADMIN_OPERATIONS.md](./ADMIN_OPERATIONS.md) - Admin dashboard guide
- [CANCEL_PAUSE_INTEGRATION.md](./CANCEL_PAUSE_INTEGRATION.md) - Integration examples
