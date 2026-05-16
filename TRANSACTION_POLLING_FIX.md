# Transaction Status Polling Timeout Fix

## Issue
**GitHub Issue**: #395 - Add transaction status polling with timeout

### Problem Description
Transaction status polling in the TxStatus component continued indefinitely when transactions failed or were dropped, causing:
- Memory leaks from uncleaned polling intervals
- Poor user experience with no feedback after extended waiting
- No mechanism to retry polling after network issues
- Polling that never stopped even when transactions were clearly stuck

## Solution Overview

Implemented a comprehensive timeout mechanism with the following features:

### 1. Polling Timeout (5 minutes)
- Changed `MAX_POLLS` from 60 to 38 attempts
- At 8 seconds per poll, this gives ~5 minutes (304 seconds) of polling
- Exported `POLL_TIMEOUT_MS` constant for consistent timeout reference
- Component transitions to `timed_out` state when limit is reached

### 2. New `timed_out` Status
- Added fourth status state alongside `pending`, `confirmed`, and `failed`
- Visual styling with orange color scheme to differentiate from errors
- Clear messaging: "Confirmation timed out"
- Explains that transaction may still be processing

### 3. Retry Functionality
- Retry button appears in `timed_out` state
- Clicking retry resets `pollCount` to 0 and returns to `pending` state
- Polling resumes immediately after retry
- Users can retry multiple times if needed

### 4. Callback Notifications
- New `onTimeout` callback prop invoked when polling expires
- Parent components (SendTip, BatchTip) receive timeout notifications
- Toast messages inform users of timeout with actionable guidance

### 5. Proper Cleanup
- Polling stops automatically in all terminal states
- Timer cleanup on component unmount
- No memory leaks from abandoned polling loops

### 6. Callback Stability Fix
- Fixed pre-existing bug where `pollCount` in `checkStatus` dependencies caused extra fetches
- Moved `pollCount` to ref to stabilize `checkStatus` callback
- Prevents unnecessary re-renders and duplicate API calls

## Technical Implementation

### Component Changes

#### `frontend/src/components/ui/tx-status.jsx`
- Added `POLL_TIMEOUT_MS` export
- Reduced `MAX_POLLS` from 60 to 38 for 5-minute timeout
- Added `timed_out` to `STATUS_CONFIG`
- Added `onTimeout` prop and ref
- Added `handleRetry` callback to reset state
- Modified polling effect to check `pollCount >= MAX_POLLS` and transition to `timed_out`
- Added `pollCountRef` to stabilize `checkStatus` callback
- Added timeout UI with retry button and explorer link

#### `frontend/src/components/SendTip.jsx`
- Added `handleTxTimeout` callback
- Wired `onTimeout` prop to `TxStatus` component
- Toast notification on timeout

#### `frontend/src/components/BatchTip.jsx`
- Added `handleBatchTxTimeout` callback
- Wired `onTimeout` prop to `TxStatus` component
- Toast notification on timeout

### Test Coverage

#### `frontend/src/test/tx-status.test.jsx`
Added 15 new test cases covering:

**Timeout behavior:**
- Transitions to `timed_out` after MAX_POLLS attempts
- Stops fetching after timeout
- Invokes `onTimeout` callback with txId
- Does not invoke `onTimeout` when transaction confirms/fails before limit
- Shows timeout message with correct duration
- Shows retry button after timeout
- Shows explorer link after timeout
- Validates `POLL_TIMEOUT_MS` constant

**Retry functionality:**
- Returns to pending state when retry is clicked
- Resumes polling after retry
- Confirms successfully after retry
- Hides retry button while polling is active
- Does not show retry button in confirmed state
- Does not show retry button in failed state

**Pre-existing bug fix:**
- Fixed 2 failing tests related to callback ref stability

Total test count: 34 tests (19 existing + 15 new), all passing

## User Experience Improvements

### Before
- Polling continued indefinitely with no feedback
- Users had no way to know if polling was stuck
- No option to retry without page reload
- Memory leaks from abandoned polling
- Confusing UX when transactions took longer than expected

### After
- Clear 5-minute timeout with visual feedback
- Poll counter shows progress (e.g., "38/38")
- Timeout message explains situation
- Retry button allows resuming polling
- Explorer link for manual verification
- Toast notifications keep users informed
- Clean memory management

## Acceptance Criteria Met

✅ Implement polling timeout (5 minutes)  
✅ Clear error messaging  
✅ Proper cleanup of intervals  
✅ Retry functionality  
✅ Add tests for timeout scenarios  

## Files Changed

1. `frontend/src/components/ui/tx-status.jsx` - Core polling logic
2. `frontend/src/components/SendTip.jsx` - Timeout callback integration
3. `frontend/src/components/BatchTip.jsx` - Timeout callback integration
4. `frontend/src/test/tx-status.test.jsx` - Comprehensive test coverage

## Commits

1. Add timed_out status and retry to TxStatus polling
2. Move pollCount to ref to stabilize checkStatus callback
3. Add timeout and retry test coverage for TxStatus
4. Wire onTimeout callback in SendTip to surface timeout toast
5. Wire onTimeout callback in BatchTip to surface timeout toast

## Testing

All tests pass:
```bash
npx vitest run src/test/tx-status.test.jsx
# 34 tests passed
```

## Backwards Compatibility

- Fully backwards compatible
- `onTimeout` prop is optional
- Existing components work without changes
- No breaking changes to component API

## Performance Impact

- Reduced polling from 60 to 38 attempts (saves ~3 minutes of unnecessary polling)
- Fixed callback stability issue that caused extra fetches
- Proper cleanup prevents memory leaks
- Overall improvement in resource usage

## Future Enhancements

Potential improvements for future iterations:
- Configurable timeout duration per component
- Exponential backoff for retry attempts
- WebSocket support for real-time updates
- Persistent timeout state across page reloads
