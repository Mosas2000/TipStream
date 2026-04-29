# Migration Guide: Pause State Read-Only Function

## Overview

This guide covers the addition of the `get-is-paused` read-only function to the TipStream contract, which provides direct access to the current pause state.

## What Changed

### Contract Changes

**Added Function:**
```clarity
(define-read-only (get-is-paused)
    (ok (var-get is-paused))
)
```

This function provides a direct way to query the current pause state of the contract without having to infer it from other responses.

### Frontend Changes

**Updated Files:**
- `frontend/src/lib/admin-contract.js` - Now calls `get-is-paused` instead of attempting to call non-existent `is-paused`
- `frontend/src/lib/pauseOperations.js` - Updated constant from `IS_PAUSED` to `GET_IS_PAUSED`

## Migration Steps

### For Contract Integrators

If you're integrating with the TipStream contract and need to check the pause state:

**Before:**
```javascript
// Had to infer pause state from get-pending-pause-change or other methods
const pendingData = await callReadOnly('get-pending-pause-change');
// Parse and extract current state from complex response
```

**After:**
```javascript
// Direct pause state query
const pauseData = await callReadOnly('get-is-paused');
const isPaused = parseClarityValue(pauseData.result); // Returns boolean
```

### For Frontend Developers

The `fetchPauseState()` function in `admin-contract.js` now uses the new read-only function internally. No changes needed to your code if you're using this helper.

**Example Usage:**
```javascript
import { fetchPauseState } from '../lib/admin-contract';

const state = await fetchPauseState();
console.log(state.isPaused); // true or false
console.log(state.pendingPause); // Pending proposal value (if any)
console.log(state.effectiveHeight); // When pending proposal becomes executable
```

### For Admin Dashboard Users

No changes required. The admin dashboard automatically uses the new function.

## Response Format

### get-is-paused Response

```clarity
(ok true)   // Contract is paused
(ok false)  // Contract is running
```

### Clarity Hex Examples

**Paused (true):**
```
0x0703
```

**Running (false):**
```
0x0704
```

## Benefits

1. **Simpler API**: Direct access to pause state without parsing complex tuples
2. **Better Performance**: Single function call instead of inferring from other data
3. **Clearer Intent**: Explicit function name makes code more readable
4. **Consistency**: Follows naming convention of other read-only functions

## Backward Compatibility

This is a **non-breaking change**. The addition of a new read-only function does not affect existing functionality:

- All existing functions continue to work as before
- The `is-paused` data variable remains unchanged
- The `get-pending-pause-change` function still returns current state in its response
- Frontend code that doesn't use the new function will continue to work

## Testing

### Contract Tests

New tests have been added to verify the function works correctly:

```bash
npm test -- tests/tipstream-v2.test.ts
npm test -- tests/tipstream.test.ts
```

### Frontend Tests

Tests verify the integration with the frontend helpers:

```bash
cd frontend
npm test -- pause-state.test.js
npm test -- admin-contract.test.js
```

## Documentation Updates

The following documentation has been updated:

- `README.md` - Added `get-is-paused` to read-only functions table
- `docs/PAUSE_API_REFERENCE.md` - Full API documentation for the new function
- `docs/PAUSE_OPERATIONS.md` - Updated function availability table
- `docs/PAUSE_CONTROL_RUNBOOK.md` - Updated operational procedures
- `docs/ADMIN_OPERATIONS.md` - Updated admin dashboard examples

## Troubleshooting

### Issue: Function not found

**Symptom:** Contract call fails with "function not found" error

**Solution:** Ensure you're calling the correct function name: `get-is-paused` (not `is-paused`)

### Issue: Unexpected response format

**Symptom:** Response doesn't match expected format

**Solution:** The function returns `(ok bool)`, not a raw boolean. Use `parseClarityValue()` to extract the boolean value.

### Issue: Old code still works

**Symptom:** Code using old inference method still works

**Explanation:** This is expected. The old method of inferring pause state from `get-pending-pause-change` still works. The new function is an addition, not a replacement.

## Support

For questions or issues related to this change:

1. Check the [PAUSE_API_REFERENCE.md](./PAUSE_API_REFERENCE.md) for detailed API documentation
2. Review the [PAUSE_OPERATIONS.md](./PAUSE_OPERATIONS.md) for operational guidance
3. Open an issue on GitHub with the `pause-control` label

## Related Changes

This change is part of issue #345: "Add a direct read-only contract function for the current pause state"

**Related Documentation:**
- [PAUSE_API_REFERENCE.md](./PAUSE_API_REFERENCE.md)
- [PAUSE_OPERATIONS.md](./PAUSE_OPERATIONS.md)
- [PAUSE_CONTROL_RUNBOOK.md](./PAUSE_CONTROL_RUNBOOK.md)
- [ADMIN_OPERATIONS.md](./ADMIN_OPERATIONS.md)
