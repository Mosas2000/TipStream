# Component Test Coverage

This document outlines the test coverage for the major wallet-action components in TipStream.

## Overview

Comprehensive component tests have been added for the four main form components that handle contract calls, validation, and post-condition flows:

1. BlockManager
2. BatchTip
3. TokenTip
4. ProfileManager

## Test Structure

### Test Utilities

- `frontend/src/test/setup.js` - Global test setup with cleanup and mock clearing
- `frontend/src/test/testUtils.jsx` - Custom render function with providers and utilities

### Configuration

- `frontend/vitest.config.js` - Vitest configuration for frontend component tests

## Component Test Coverage

### BlockManager (`BlockManager.test.jsx`)

Tests for blocking/unblocking users from sending tips.

**Coverage Areas:**
- Rendering and UI elements
- Address input validation
- Invalid address format detection
- Self-blocking prevention
- Check block status functionality
- Toggle block/unblock operations
- Wallet integration (success and cancel flows)
- Error handling
- Recently blocked users list
- Accessibility features (ARIA labels, live regions)

**Key Test Scenarios:**
- Valid and invalid Stacks address validation
- Checking if a user is blocked/unblocked
- Opening wallet to block/unblock users
- Handling wallet cancellation
- Error recovery
- Keyboard navigation (Enter key support)

### BatchTip (`BatchTip.test.jsx`)

Tests for sending tips to multiple recipients in a single transaction.

**Coverage Areas:**
- Rendering and form structure
- Adding and removing recipients
- Maximum recipient limit enforcement
- Form validation (addresses, amounts, messages)
- Self-tipping prevention
- Duplicate address detection
- Balance checking
- Strict mode toggle
- Batch summary calculations
- Confirmation dialog
- Transaction submission
- Form clearing after success
- Accessibility (fieldsets, labels, ARIA attributes)

**Key Test Scenarios:**
- Dynamic recipient management
- Comprehensive validation rules
- Insufficient balance detection
- Strict vs best-effort mode
- Wallet integration flows
- Error handling and recovery

### TokenTip (`TokenTip.test.jsx`)

Tests for sending tips using whitelisted SIP-010 tokens.

**Coverage Areas:**
- Rendering and form fields
- Token contract validation
- Whitelist checking
- Recipient address validation
- Self-tipping prevention
- Amount validation (positive integers)
- Message field with character limits
- Form submission gating
- Confirmation dialog
- Transaction submission
- Form clearing after success
- Accessibility (labels, ARIA invalid states, error associations)

**Key Test Scenarios:**
- Token contract format validation
- Whitelist verification (success and failure)
- Valid HTTPS URL requirement
- Wallet integration flows
- Error handling
- Keyboard navigation

### ProfileManager (`ProfileManager.test.jsx`)

Tests for creating and updating on-chain user profiles.

**Coverage Areas:**
- Loading states
- Create vs edit mode rendering
- Profile data fetching
- Display name validation and character limits
- Bio validation and character limits
- Avatar URL validation (HTTPS requirement)
- Avatar preview display
- Form submission
- Profile updates
- Error handling
- Accessibility (form roles, required fields, ARIA descriptions)

**Key Test Scenarios:**
- Loading existing profiles
- Creating new profiles
- Field validation (length limits, required fields)
- HTTPS enforcement for avatar URLs
- Avatar preview functionality
- Wallet integration flows
- Error recovery

## Running Tests

### Run all component tests
```bash
cd frontend
npm test
```

### Run specific component tests
```bash
npm test -- BlockManager.test.jsx
npm test -- BatchTip.test.jsx
npm test -- TokenTip.test.jsx
npm test -- ProfileManager.test.jsx
```

### Run with coverage
```bash
npm test -- --coverage
```

### Watch mode
```bash
npm run test:watch
```

## Test Patterns

### Common Patterns Used

1. **User Event Simulation**: Using `@testing-library/user-event` for realistic user interactions
2. **Async Operations**: Proper use of `waitFor` for async state updates
3. **Mock Management**: Comprehensive mocking of Stacks SDK functions
4. **Provider Wrapping**: Custom render function that wraps components with necessary context providers
5. **Accessibility Testing**: Verification of ARIA attributes, roles, and labels

### Mock Strategy

- **Stacks Connect**: Mocked `openContractCall` to simulate wallet interactions
- **Stacks Transactions**: Mocked read-only function calls and response parsing
- **Hooks**: Mocked `useSenderAddress` and `useBalance` for consistent test data
- **Context**: Wrapped components with `TipProvider` and `DemoProvider`

## Acceptance Criteria Met

- ✅ Component tests added for all four forms
- ✅ Validation flows covered
- ✅ Cancel flows covered
- ✅ Success flows covered
- ✅ Visible error states tested
- ✅ Wallet gating verified
- ✅ Accessibility features validated

## Future Improvements

- Add integration tests with real contract interactions
- Add visual regression tests
- Increase coverage for edge cases
- Add performance benchmarks
- Add E2E tests for complete user flows
