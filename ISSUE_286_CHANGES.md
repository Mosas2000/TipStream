# Issue #286: Block High-Risk Recipient Targets

## Summary

This fix prevents users from submitting tips to high-risk recipient addresses before opening the wallet prompt. Two categories of recipients are now blocked:

1. **Blocked Recipients**: Users who have explicitly blocked the sender
2. **Contract Principals**: Contract addresses that cannot receive tips safely

## Changes Made

### New Files

#### `frontend/src/lib/recipient-validation.js`
Utility module for validating recipient risk levels:
- `validateRecipientRiskLevel()` - Comprehensive risk assessment
- `canProceedWithRecipient()` - Boolean check for submission permission
- `getRecipientValidationMessage()` - User-facing error message
- `isHighRiskRecipient()` - Risk identification for UI state

#### `frontend/src/test/recipient-validation.test.js`
18 comprehensive unit tests covering:
- Safe vs blocked vs contract recipients
- Edge cases (whitespace, null, empty)
- Error message generation
- Multiple risk factors

#### `frontend/src/test/SendTip.block-recipient.test.jsx`
Integration tests verifying:
- Blocked recipients prevent form submission
- Error messages display correctly
- Send button is disabled for high-risk recipients
- UI reflects blocked status visually

### Modified Files

#### `frontend/src/components/SendTip.jsx`
Key changes:
1. Import recipient validation utilities
2. Add computed state for high-risk recipients
3. Update `validateAndConfirm()` to check recipient safety before wallet prompt
4. Update recipient input styling to show red error for high-risk cases
5. Disable Send button when recipient is at risk
6. Simplify `handleRecipientChange()` to defer risk checks

## Behavior

### Before
- Warnings displayed for blocked and contract recipients
- Users could proceed to wallet prompt anyway
- Transactions would fail on-chain, causing frustration

### After
- Clear error messages for high-risk recipients
- Red styling on input field and error text
- Send button disabled until safe recipient is selected
- Wallet prompt never opened for high-risk recipients
- Toast notifications explain why action cannot proceed

## Testing

Run all tests:
```bash
cd frontend
npm test
```

Run specific test suites:
```bash
npm test -- src/test/recipient-validation.test.js
npm test -- src/test/SendTip.block-recipient.test.jsx
```

## Acceptance Criteria Met

✓ Recipients who have blocked the sender cannot proceed to wallet prompt
✓ Contract-principal tipping is blocked by default
✓ Validation messages clearly explain why action is restricted
✓ Tests cover blocked recipients and contract principals
✓ Send button visually disabled for high-risk recipients
✓ Error states properly styled in red
