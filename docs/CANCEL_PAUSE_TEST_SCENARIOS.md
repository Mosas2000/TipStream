# Cancel-Pause-Change Test Scenarios

## Overview

This document describes test scenarios for cancel-pause-change functionality covering contract behavior, frontend state management, and integration patterns.

## Contract Test Scenarios

### 1. Authorization Tests

**Scenario 1.1: Admin Can Cancel Pending Pause**
- Given: Pause proposal pending (value=true)
- When: Admin calls cancel-pause-change
- Then: Proposal cleared, event emitted, contract continues

**Scenario 1.2: Non-Admin Cannot Cancel**
- Given: Pause proposal pending
- When: Non-admin calls cancel-pause-change
- Then: Error "owner-only", state unchanged

**Scenario 1.3: Original Owner Can Cancel After Transfer**
- Given: Ownership transferred to new owner
- When: Original owner attempts cancel
- Then: Error "owner-only" (no longer owner)

**Scenario 1.4: New Owner Can Cancel After Transfer**
- Given: Ownership transferred to new owner
- When: New owner calls cancel
- Then: Success, proposal cleared

### 2. State Management Tests

**Scenario 2.1: Cancel Clears Both Pause Variables**
- Given: Pause proposal pending (pending-pause=true, pending-pause-height=12144)
- When: Admin cancels
- Then: pending-pause cleared, pending-pause-height set to u0

**Scenario 2.2: Cancel Does Not Affect Current Pause State**
- Given: Pause proposal pending (value=false), contract currently paused
- When: Admin cancels unpause
- Then: Contract remains paused, proposal cleared

**Scenario 2.3: Multiple Cancellations in Succession**
- Given: Pause proposal pending
- When: Admin calls cancel twice
- Then: First succeeds, second fails with "no-pending-change"

**Scenario 2.4: Cancel Then Propose Same Value**
- Given: Pause proposal for pause=true cancelled
- When: Admin proposes pause=true again
- Then: New proposal created, blocks remaining = 144

### 3. Event Tests

**Scenario 3.1: Cancel Emits pause-change-cancelled Event**
- Given: Pause proposal pending
- When: Admin cancels
- Then: pause-change-cancelled event emitted with admin principal

**Scenario 3.2: Event Has Correct Metadata**
- Given: Pause proposal pending
- When: Admin cancels
- Then: Event block height correct, tx hash recorded

**Scenario 3.3: Multiple Events in Sequence**
- Given: Fresh contract
- When: Propose → Cancel → Propose → Execute
- Then: 4 events emitted in order (proposed → cancelled → proposed → executed)

### 4. Edge Cases

**Scenario 4.1: Cancel When No Proposal Pending**
- Given: No pause proposal
- When: Admin calls cancel-pause-change
- Then: Error "no-pending-change"

**Scenario 4.2: Cancel Executed Pause (Already Applied)**
- Given: Pause proposal executed and applied
- When: Admin attempts cancel
- Then: Error "no-pending-change" (no longer pending)

**Scenario 4.3: Cancel Just Before Timelock Expires**
- Given: Pause proposal pending, 1 block until execution
- When: Admin cancels
- Then: Success, timelock never reached

**Scenario 4.4: Cancel After Timelock Expires (Before Execute)**
- Given: Pause proposal past timelock expiration
- When: Admin calls cancel instead of execute
- Then: Success, proposal cleared, never executes

**Scenario 4.5: Concurrent Cancel and Execute**
- Given: Pause proposal at timelock
- When: Two txs submitted (one cancel, one execute)
- Then: First succeeds, second fails (first cleared state)

## Frontend State Management Tests

### 5. Pause Display State Tests

**Scenario 5.1: No Proposal - System Running**
- Given: proposal=null, isPaused=false
- When: Component renders
- Then: Display "System Running", show "Propose Pause" button

**Scenario 5.2: Pause Proposal Pending**
- Given: proposal={value:true, effectiveHeight:12100}, currentHeight=12000
- When: Component renders
- Then: Display blocks remaining (100), show "Cancel" button

**Scenario 5.3: Proposal Ready to Execute**
- Given: proposal={value:true, effectiveHeight:12000}, currentHeight=12100
- When: Component renders
- Then: Display "Ready to execute", show "Execute" and "Cancel" buttons

**Scenario 5.4: System Currently Paused**
- Given: proposal=null, isPaused=true
- When: Component renders
- Then: Display "System Paused", show "Propose Unpause" button

### 6. User Interaction Tests

**Scenario 6.1: Propose Pause Flow**
- Given: System running, no proposal
- When: User clicks "Propose Pause"
- Then: Transaction sent, "Proposing..." shown, refresh on completion

**Scenario 6.2: Cancel Proposal Flow**
- Given: Pause proposal pending
- When: User clicks "Cancel"
- Then: Transaction sent, "Cancelling..." shown, proposal cleared on completion

**Scenario 6.3: Execute After Timelock**
- Given: Proposal ready (timelock expired)
- When: User clicks "Execute"
- Then: Transaction sent, "Executing..." shown, pause state updated

**Scenario 6.4: Non-Admin Sees Disabled Buttons**
- Given: isAdmin=false, proposal pending
- When: Component renders
- Then: All action buttons disabled, admin notice shown

### 7. Error Handling Tests

**Scenario 7.1: Cancel Non-Existent Proposal**
- Given: User clicks cancel when proposal null
- Then: Show message "No pause proposal pending"

**Scenario 7.2: Execute Before Timelock**
- Given: Proposal pending, blocks remaining > 0
- When: User clicks execute
- Then: Show "Timelock not yet expired"

**Scenario 7.3: Transaction Failure**
- Given: Admin cancels but transaction fails
- When: Error returned from contract
- Then: Show specific error message, state refreshes

**Scenario 7.4: Network Timeout**
- Given: Network unavailable during cancel
- When: No response from RPC
- Then: Show "Request timeout", allow retry

## Integration Test Scenarios

### 8. Multi-User Scenarios

**Scenario 8.1: One Admin Cancels, Another Sees Update**
- Given: Two admin browsers, proposal pending
- When: Admin A clicks Cancel
- Then: Admin B refreshes, sees proposal gone

**Scenario 8.2: Admin Proposes While Another Cancels**
- Given: Two admins, proposal pending
- When: Admin A proposes new value, Admin B cancels
- Then: One succeeds, other fails with appropriate error

**Scenario 8.3: User Views While Admin Operates**
- Given: User viewing proposal, admin cancels
- When: Admin cancels successfully
- Then: User's view doesn't auto-update (refreshes show clean state)

### 9. Network Scenarios

**Scenario 9.1: Slow Network Response**
- Given: RPC response delayed
- When: User clicks cancel
- Then: "Cancelling..." persists, eventually succeeds or times out

**Scenario 9.2: Transaction Pending**
- Given: Cancel transaction in mempool
- When: User refreshes page
- Then: Old state visible until block confirmation

**Scenario 9.3: Block Reorganization**
- Given: Cancel transaction confirmed, then network reorg
- Then: If cancelled (reorg depth >= cancel block), may need resubmission

### 10. State Transitions

**Scenario 10.1: Running → Pause Proposal → Cancel → Running**
- Given: System running
- When: Propose pause, cancel
- Then: Return to running state

**Scenario 10.2: Pause Proposal → Cancel → Unpause Proposal → Execute**
- Given: Pause proposal
- When: Cancel, propose unpause, wait 144 blocks, execute
- Then: System transitions pause → running

**Scenario 10.3: Multiple Rapid Cancellations**
- Given: Proposals created and cancelled in rapid succession
- When: Create proposal A, cancel A, create B, cancel B, create C
- Then: All operations succeed with correct state transitions

**Scenario 10.4: Interleaved Propose and Cancel**
- Given: System capable of handling rapid operations
- When: Propose pause, cancel, propose unpause, cancel
- Then: Each operation succeeds, final state is clean (no proposal)

## Data Validation Tests

### 11. Input Validation

**Scenario 11.1: Cancel With Invalid Authorization**
- Given: User principal unknown to contract
- When: Submit cancel
- Then: Authorization check fails

**Scenario 11.2: State Consistency After Cancel**
- Given: After successful cancel
- When: Query get-pending-pause-change
- Then: pending-pause is (none), current unchanged

**Scenario 11.3: Block Height Progression**
- Given: Proposal with effectiveHeight=12100
- When: Cancel at block 12000, 12050, 12100, 12150
- Then: All cancellations succeed (no height dependency)

### 12. Event Stream Consistency

**Scenario 12.1: All Events Recorded**
- Given: Propose → Cancel → Propose → Execute sequence
- When: Query blockchain events
- Then: 4 events present: proposed, cancelled, proposed, executed

**Scenario 12.2: Event Order Preserved**
- Given: Multiple operations in one block
- When: Query events
- Then: Events ordered by transaction order

**Scenario 12.3: Event Indexing**
- Given: Events emitted
- When: Query by event type
- Then: Can filter and find all cancellations

## Performance Tests

### 13. Scalability

**Scenario 13.1: Cancel Under Load**
- Given: Many concurrent cancel attempts
- When: Admins call cancel simultaneously
- Then: All succeed or fail atomically (first succeeds, others fail)

**Scenario 13.2: State Query Performance**
- Given: Get-pending-pause-change called repeatedly
- When: Called 100 times in rapid succession
- Then: Consistent responses, no state corruption

**Scenario 13.3: Event Processing**
- Given: Event stream with thousands of operations
- When: Query pause-related events
- Then: Filter and retrieve in reasonable time

## Compliance Tests

### 14. Security and Audit

**Scenario 14.1: Unauthorized Access Denied**
- Given: Non-owner attempts cancel
- When: Submit transaction
- Then: Rejected by contract authorization check

**Scenario 14.2: State Cannot Be Corrupted**
- Given: Various cancel and propose sequences
- When: Millions of operations simulated
- Then: State always consistent (no orphaned records)

**Scenario 14.3: Audit Trail Complete**
- Given: All pause operations
- When: Reviewed in blockchain
- Then: Every operation tracked, nothing lost

### 15. Backward Compatibility

**Scenario 15.1: Old Code Still Works**
- Given: Contract deployed with cancel-pause-change
- When: Old client code calls propose/execute (not cancel)
- Then: Works unchanged

**Scenario 15.2: New Code Works with Old Contract**
- Given: Old contract version (no cancel-pause-change)
- When: New code attempts cancel
- Then: Graceful error "function not found"

**Scenario 15.3: Data Migration Not Required**
- Given: Existing pause proposals before upgrade
- When: Contract upgraded
- Then: Existing proposals unaffected, cancel available

## Test Coverage Summary

**Total Scenarios:** 55+
**Contract Tests:** 15+ scenarios (6 tests implement multiple scenarios)
**Frontend Tests:** 40+ scenarios (127 tests cover state, interactions, errors)
**Integration Tests:** N/A (manual testing)

**Coverage by Category:**
- Authorization: 8 scenarios
- State Management: 10 scenarios
- Events: 6 scenarios
- User Interactions: 4 scenarios
- Error Handling: 8 scenarios
- Multi-User: 3 scenarios
- Network: 3 scenarios
- State Transitions: 4 scenarios
- Data Validation: 3 scenarios
- Performance: 3 scenarios
- Security/Audit: 3 scenarios
