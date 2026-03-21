# Recipient Validation System - Implementation Guide

## Overview

The recipient validation system enforces strict preflight rules for high-risk recipients, preventing users from initiating transactions that are likely to fail on-chain.

## Architecture

### Core Modules

1. **recipient-validation.js** - Risk assessment logic
   - Determines if recipient can safely receive tips
   - Identifies blocked and contract recipients
   - Generates user-facing error messages

2. **recipient-errors.js** - Error standardization
   - Defines error codes and messages
   - Categorizes errors as blocking or warnings
   - Supports error severity levels

3. **recipient-accessibility.js** - Accessibility support
   - Provides ARIA attributes and labels
   - Ensures screen reader compatibility
   - Supports keyboard navigation

4. **recipient-block-tracking.js** - Analytics events
   - Tracks blocked recipient detection
   - Monitors block check failures
   - Maintains privacy through address truncation

### Hooks

1. **useBlockCheck** - Basic block status checking
   - Queries smart contract for block status
   - Handles in-flight request cancellation
   - Manages checking state

2. **useBlockCheckEnhanced** - Advanced block status with caching
   - Caches previous checks
   - Tracks last checked recipient
   - Provides validation readiness state

3. **useRecipientState** - Recipient form state
   - Manages recipient input and validation
   - Tracks format, risk, and self-tip status
   - Provides memoized computed properties

## Validation Flow

```
User enters recipient
    ↓
Format validation (isValidStacksPrincipal)
    ↓
Block check (useBlockCheck)
    ↓
Risk assessment (canProceedWithRecipient)
    ├─ If blocked → Show error, disable Send
    ├─ If contract → Show error, disable Send
    └─ If safe → Allow submission
    ↓
User clicks Send
    ↓
Final validation (validateAndConfirm)
    ├─ Re-check risk status
    ├─ Verify all conditions met
    └─ Open wallet prompt or reject
```

## Error Handling

### Blocking Errors (Prevent Submission)
- `RECIPIENT_BLOCKED` - User has been blocked by recipient
- `CONTRACT_PRINCIPAL` - Recipient is a contract address

### Warning Errors (Allow Submission)
- `SELF_TIP` - Sending to self
- `INVALID_FORMAT` - Invalid principal format

## UI Integration

### SendTip Component Changes
1. Imports validation utilities
2. Uses `useRecipientState` hook
3. Checks `isHighRiskRecipient` before enabling Send button
4. Displays validation message in error styling (red)
5. Disables Send button for high-risk recipients
6. Shows tooltip explaining why button is disabled

### Recipient Input Display
- Red border and text for blocked/contract recipients
- Error message below input field
- Button tooltip on hover
- Real-time validation as user types

## Testing Coverage

### Unit Tests (18 tests)
- recipient-validation.test.js
- recipient-errors.test.js
- useBlockCheckEnhanced.test.js
- useRecipientState.test.js
- recipient-block-tracking.test.js
- recipient-accessibility.test.js

### Edge Case Tests (20 tests)
- recipient-validation-edge-cases.test.js

### Integration Tests
- SendTip.block-recipient.test.jsx

## Performance Considerations

1. **Caching** - useBlockCheckEnhanced caches block checks
2. **Memoization** - useRecipientState uses useMemo for computed properties
3. **Debouncing** - Block checks only on valid recipient format
4. **State Management** - Separate hooks prevent unnecessary re-renders

## Privacy & Security

1. **Address Truncation** - Analytics only show first/last 4 chars
2. **Error Messages** - Avoid exposing sensitive information
3. **State Isolation** - Block status not persisted locally
4. **Request Cancellation** - In-flight requests cancelled on unmount

## Migration Guide

### For Existing Code Using useBlockCheck
No breaking changes. useBlockCheckEnhanced is optional enhancement.

### For SendTip Component Update
Replace state management with useRecipientState:

Before:
```js
const [recipient, setRecipient] = useState('');
const [recipientError, setRecipientError] = useState('');
const { blocked: blockedWarning } = useBlockCheck();
```

After:
```js
const { recipient, setRecipient, recipientError, ...rest } = useRecipientState(senderAddress);
const { blocked: blockedWarning } = useBlockCheck();
```

## Future Enhancements

1. **Override Flow** - Optional confirmation for contract principals
2. **Whitelist Support** - Allow specific contracts via whitelist
3. **Block History** - Show when recipient was blocked/unblocked
4. **Batch Operations** - Validate multiple recipients at once
5. **Custom Messages** - Per-recipient blocking reason

## Debugging

Enable debug logging with:
```js
localStorage.setItem('DEBUG_RECIPIENT_VALIDATION', 'true');
```

This logs:
- Block check requests and results
- Validation state changes
- Error categorization
- Risk assessment decisions
