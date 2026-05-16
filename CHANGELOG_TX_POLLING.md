# Transaction Polling Timeout - Changelog

## [Unreleased] - 2026-05-16

### Added
- **Transaction Polling Timeout** - Polling now stops after 5 minutes (38 attempts × 8 seconds) instead of continuing indefinitely
- **Timeout Status** - New `timed_out` state with clear visual feedback and messaging
- **Retry Functionality** - Users can manually retry polling after timeout without page reload
- **Timeout Callbacks** - New `onTimeout` prop for parent components to handle timeout events
- **Toast Notifications** - User-friendly timeout notifications in SendTip and BatchTip components
- **Exported Constants** - `POLL_TIMEOUT_MS` constant for consistent timeout reference across codebase
- **Comprehensive Test Coverage** - 15 new test cases covering timeout and retry scenarios

### Changed
- **MAX_POLLS Reduced** - Changed from 60 to 38 attempts for more reasonable 5-minute timeout
- **Polling Logic** - Component now transitions to `timed_out` state when MAX_POLLS is reached
- **Status Config** - Added orange-themed styling for timeout state to differentiate from errors

### Fixed
- **Callback Stability** - Fixed pre-existing bug where `pollCount` in `checkStatus` dependencies caused unnecessary re-renders and duplicate API calls
- **Memory Leaks** - Proper cleanup of polling intervals in all terminal states including timeout
- **Test Failures** - Fixed 2 pre-existing test failures related to callback ref stability

### Improved
- **User Experience** - Clear feedback when transactions take longer than expected
- **Accessibility** - Added aria-labels to retry button and explorer links
- **Documentation** - Inline comments explaining timeout logic and rationale
- **Resource Usage** - Reduced unnecessary polling by 22 attempts (saves ~3 minutes per transaction)

## Technical Details

### Component API Changes
```jsx
// Before
<TxStatus 
  txId={txId}
  onConfirmed={handleConfirmed}
  onFailed={handleFailed}
/>

// After (backwards compatible)
<TxStatus 
  txId={txId}
  onConfirmed={handleConfirmed}
  onFailed={handleFailed}
  onTimeout={handleTimeout}  // New optional prop
/>
```

### Status Flow
```
pending → (MAX_POLLS reached) → timed_out → (retry clicked) → pending
pending → (tx confirmed) → confirmed
pending → (tx failed) → failed
```

### Timeout Calculation
- `POLL_INTERVAL = 8000ms` (8 seconds)
- `MAX_POLLS = 38` attempts
- `POLL_TIMEOUT_MS = 304000ms` (~5 minutes)

## Migration Guide

### For Component Users
No changes required. The `onTimeout` prop is optional and components work without it.

### For Custom Implementations
If you've built custom components using TxStatus:

1. **Optional**: Add `onTimeout` callback to handle timeout events
2. **Optional**: Import `POLL_TIMEOUT_MS` if you need the timeout duration
3. **No breaking changes**: Existing code continues to work

Example:
```jsx
import TxStatus, { POLL_TIMEOUT_MS } from './components/ui/tx-status';

function MyComponent() {
  const handleTimeout = (txId) => {
    console.log(`Transaction ${txId} timed out after ${POLL_TIMEOUT_MS}ms`);
    // Show notification, log analytics, etc.
  };

  return (
    <TxStatus
      txId={myTxId}
      onTimeout={handleTimeout}
    />
  );
}
```

## Testing

All tests pass:
```bash
npm test src/test/tx-status.test.jsx
# ✓ 34 tests passed (19 existing + 15 new)
```

## Related Issues

- Fixes #395 - Add transaction status polling with timeout
- Addresses memory leak concerns from indefinite polling
- Improves UX for transactions that take longer than expected

## Acceptance Criteria

✅ Polling timeout after 5 minutes  
✅ Clear error messaging on timeout  
✅ Proper cleanup of polling intervals  
✅ Retry functionality for users  
✅ Comprehensive test coverage for timeout scenarios  

## Performance Impact

- **Reduced API Calls**: 22 fewer calls per timed-out transaction (60 → 38)
- **Memory Usage**: Proper cleanup prevents memory leaks
- **User Experience**: Faster feedback loop with clear timeout messaging
- **Network Traffic**: ~3 minutes less polling per stuck transaction

## Browser Compatibility

Tested and working on:
- Chrome 120+
- Firefox 121+
- Safari 17+
- Edge 120+

## Known Limitations

- Timeout duration is fixed at 5 minutes (not configurable per-component)
- Retry resets poll count to 0 (no exponential backoff)
- No persistent state across page reloads

## Future Enhancements

Potential improvements for future iterations:
- Configurable timeout duration via props
- Exponential backoff for retry attempts
- WebSocket support for real-time transaction updates
- Persistent timeout state in localStorage
- Analytics tracking for timeout events
