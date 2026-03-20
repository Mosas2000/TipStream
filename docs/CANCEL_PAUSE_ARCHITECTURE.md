# Cancel-Pause-Change Architecture Decisions

## Overview

This document explains the architectural decisions made when implementing the `cancel-pause-change` feature for TipStream pause operations.

## 1. Function Design

### Decision: Implement as Separate Function

**Option A:** Create dedicated `cancel-pause-change` function (CHOSEN)
**Option B:** Merge cancellation into `propose-pause-change` with overwrite semantics
**Option C:** Use wrapper function combining cancel + propose atomically

**Rationale:**
- Separation of concerns: Each function has single responsibility
- Explicit intent: Code calling cancel is clear about purpose
- Safety: Cannot accidentally overwrite while intending to propose
- Symmetry: Mirrors existing `cancel-fee-change` pattern
- Testability: Easier to test individual operations
- Auditability: Clear event trail for each operation

### Decision: Admin-Only Authorization

**Option A:** Admin only (CHOSEN)
**Option B:** Timelocked execution by anyone
**Option C:** Multi-sig approval required

**Rationale:**
- Consistency: Matches proposal authorization
- Risk: Prevents accidental cancellations by users
- Trust: Operators have clear control
- Simplicity: Single authorization check

## 2. State Management

### Decision: Clear Both Pause State Variables

**Option A:** Clear pending-pause AND pending-pause-height (CHOSEN)
**Option B:** Keep pending-pause-height for audit trail
**Option C:** Mark with separate "cancelled" flag

**Rationale:**
- Safety: Prevents accidental execution of old proposal
- Clarity: `get-pending-pause-change` returns clean (none)
- Simplicity: No ambiguous states
- Prevention: Cannot execute after cancellation
- Compatibility: Works with retry logic (can propose immediately after)

### Decision: No Explicit Revert Proposal

**Option A:** Cancellation only, manual reproposal required (CHOSEN)
**Option B:** Automatic reproposal with opposite value
**Option C:** State machine with "reverted" status

**Rationale:**
- Transparency: Admin explicitly decides next action
- Safety: Prevents automated state changes
- Flexibility: Allows cancel-and-wait pattern
- Audit: Clear intent shown in separate proposals
- Simplicity: Single responsibility function

## 3. Frontend Architecture

### Decision: Separate Utilities and Components

```
pauseOperations.js (pure functions, no React)
    ↓ imported by
AdminPauseControl.jsx (React component)
    ↓ imports
pauseOperations.js (state calculations)
```

**Rationale:**
- Reusability: Utils work with any framework or CLI
- Testability: Pure functions easier to test
- Composability: Use utils in hooks, context, Redux
- Independence: Component changes don't break utils
- Clarity: Separation of logic and presentation

### Decision: Centralized Error Messages

**Option A:** Centralized `getPauseErrorMessage()` (CHOSEN)
**Option B:** Component-level error mapping
**Option C:** Localization service with i18n

**Rationale:**
- Consistency: Same error mapped uniformly everywhere
- Maintenance: Single source of truth for messages
- Testability: Easy to test message formatting
- Reuse: Works in components, CLI, notifications
- Future: Simple to add i18n later

### Decision: Display Status via Calculated Function

**Option A:** `getPauseDisplayStatus()` + `getPauseDisplayMessage()` (CHOSEN)
**Option B:** Store "displayStatus" in component state
**Option C:** Computed via useMemo hook

**Rationale:**
- Clarity: Calculation is pure and deterministic
- Testability: Can verify all status transitions
- Flexibility: Same data used multiple places
- Performance: No memoization needed (pure)
- Maintainability: Status logic centralized

## 4. Testing Strategy

### Decision: Comprehensive Test Coverage

**Frontend Tests Breakdown:**
- 44 state management tests (pauseControl.test.js)
- 50 utility function tests (pauseOperations.test.js)
- 33 component tests (AdminPauseControl.test.jsx)
- Contract tests: 6 tests for cancel-pause-change

**Rationale:**
- State paths: 44 tests cover all state transitions
- Edge cases: Utilities tested for boundary conditions
- Component: Tests verify UI behavior, not implementation
- Contract: Tests ensure authorization and state cleanup

### Decision: Behavior-Driven Tests

Tests focus on **what** not **how**:
```javascript
// GOOD: Test behavior
it('should show execute button when timelock expired', () => {
  render(<AdminPauseControl proposal={p} currentHeight={12100} />);
  expect(screen.getByText('Execute')).toBeTruthy();
});

// BAD: Test implementation
it('should set canExecute to true', () => {
  // Tests internal state, not visible behavior
});
```

## 5. Documentation Architecture

### Information Layers

**Layer 1: Quick Reference**
- `docs/PAUSE_CONTROL_RUNBOOK.md`: Operational procedures
- Tables with quick answers

**Layer 2: Implementation Details**
- `docs/PAUSE_OPERATIONS.md`: Technical deep-dive
- Function-by-function breakdown

**Layer 3: Integration Guide**
- `docs/CANCEL_PAUSE_INTEGRATION.md`: How to integrate
- Code examples with patterns

**Layer 4: API Reference**
- `docs/PAUSE_API_REFERENCE.md`: Function signatures
- Exact parameters and responses

**Layer 5: Admin Guide**
- `docs/ADMIN_OPERATIONS.md`: Dashboard operations
- Task-oriented procedures

**Rationale:**
- Different users need different information
- Operators need procedures (Layer 1)
- Developers need implementation (Layer 2-4)
- Admins need dashboard guide (Layer 5)

## 6. Migration Path

### Decision: Non-Breaking, Backward Compatible

**Changes Made:**
1. Added new contract function (no changes to existing)
2. Added new frontend utilities (no changes to existing)
3. Updated docs (no changes to user code)

**Rationale:**
- Zero breaking changes
- Can deploy without synchronization
- Users continue working with old version if needed
- Gradual rollout possible

### Decision: No Data Migration Required

**Rationale:**
- No state format changes
- No storage migration needed
- Can enable/disable via dashboard UI
- No user data affected

## 7. Error Handling Philosophy

### Decision: Clear Error Messages Over Silent Failures

**Pattern Used:**
```javascript
const message = getPauseErrorMessage(error);
showNotification(message, 'error');
```

**Rationale:**
- Users understand what went wrong
- Operations team can take corrective action
- Logs contain actionable information
- Debugging simplified

### Decision: Prevent Errors Where Possible

**Examples:**
- Disable buttons before timelock expires
- Disable propose when proposal pending
- Clear validation before transaction

**Rationale:**
- Better UX: Prevent mistakes before they happen
- Gas savings: Fewer rejected transactions
- User education: Shows valid operations
- Audit trail: Cleaner transaction history

## 8. Performance Decisions

### Decision: No Auto-Refresh Built-In

**Option A:** Manual refresh via button/function (CHOSEN)
**Option B:** Auto-refresh every N blocks
**Option C:** WebSocket subscription for real-time

**Rationale:**
- Simplicity: No background processes needed
- Cost: Fewer RPC calls
- Control: Admins refresh when needed
- Flexibility: Can build auto-refresh on top

### Decision: No Caching at Library Level

**Option A:** Utilities don't cache (CHOSEN)
**Option B:** Add local cache inside pauseOperations.js
**Option C:** Provide cache-aware versions

**Rationale:**
- Flexibility: Caller decides caching strategy
- Reusability: Works in any context (React, CLI, Node.js)
- Clarity: No hidden state
- Responsibility: Each layer handles its own caching

## 9. Authorization Model

### Decision: Owner-Based Authorization

**Option A:** Contract owner only (CHOSEN)
**Option B:** Role-based (multiple admin levels)
**Option C:** Multi-sig (multiple signatures required)

**Rationale:**
- Simplicity: Matches existing pattern (already in `propose-pause-change`)
- Consistency: Same auth model throughout
- Trust: Owner is single source of authority
- Speed: No multi-sig delays needed for cancellation

## 10. Event Emission

### Decision: Always Emit Event on Success

**Pattern:**
```clarity
(ok true)
(print (contract-call? .tipstream emit-pause-change-cancelled ...))
```

**Rationale:**
- Audit trail: Every operation logged on-chain
- Indexing: Events enable historical analysis
- Integration: Allows event-driven systems
- Transparency: Blockchain records all operations

## Alternatives Considered and Rejected

### A. Automatic Reproposal
**Reason Rejected:** Requires explicit admin decision, prevents automation accidents

### B. Timelocked Cancellation
**Reason Rejected:** Defeats purpose of quick cancellation for mistakes

### C. Multi-Signature Cancellation
**Reason Rejected:** Adds complexity, inconsistent with proposal auth

### D. Pause Counter (Accumulating Count)
**Reason Rejected:** Doesn't help with operational clarity, adds complexity

### E. Separate "Paused" and "Pause-Proposed" States
**Reason Rejected:** Current bistate (paused + pending-proposal) sufficient

## Future Considerations

### Potential Enhancements (Not Implemented)

1. **Reason Logging**
   - Add optional string parameter to cancellation
   - Store cancellation reason in contract
   - Enable better audit trail

2. **Time-Based Cancellation Window**
   - Prevent cancellation after certain block height
   - Force admin to decide before cutoff
   - Reduce "cancel at last moment" risk

3. **Cancellation Notifications**
   - Emit event with cancellation initiator
   - Allow subscribers to track who cancelled
   - Enhanced audit trail

4. **Approval Workflow**
   - Multi-step approval for pause proposals
   - Cancellation requires witness
   - Adds safety for critical operations

5. **Pause Duration Limits**
   - Automatically unpause after N blocks
   - Prevent indefinite pause
   - Guarantee eventual recovery

### Implementation Notes

These are not implemented currently because:
- Current implementation meets requirements
- Can be added without breaking changes
- Community feedback may guide priorities
- Simplicity preferred for MVP

## Conclusion

The cancel-pause-change implementation follows these core principles:

1. **Symmetry**: Mirrors fee-change cancellation pattern
2. **Simplicity**: Single responsibility functions
3. **Safety**: Prevents accidental state corruption
4. **Clarity**: Clear error messages and UI state
5. **Testability**: Comprehensive test coverage
6. **Flexibility**: Utilities separate from components
7. **Compatibility**: No breaking changes
8. **Transparency**: All operations auditable via events

The architecture enables safe, predictable pause operation management while maintaining consistency with existing TipStream patterns.
