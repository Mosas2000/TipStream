# Wallet Session Reactivity

This document describes how wallet-sensitive forms handle session changes in TipStream.

## Overview

All wallet-action components (BatchTip, SendTip, TokenTip, ProfileManager) are now fully reactive to wallet session changes including:

- Sign-in events
- Disconnect events  
- Account-switch events

## Implementation

### Core Hook: `useSenderAddress`

The `useSenderAddress` hook provides reactive access to the current wallet address:

```javascript
import { useSenderAddress } from '../hooks/useSenderAddress';

function MyComponent() {
  const senderAddress = useSenderAddress();
  // senderAddress updates automatically when session changes
}
```

The hook uses `useSessionSync` internally to listen for:
- Storage events (cross-tab session changes)
- Wallet provider account changes
- Sign-in/sign-out events

### Component Behavior

#### BatchTip
- Self-tip validation updates when sender address changes
- Post-conditions use current sender address at transaction time
- Validation errors clear when sender address becomes null

#### SendTip  
- Self-tip validation updates when sender address changes
- Post-conditions use current sender address at transaction time
- Balance display updates for new address
- Validation errors clear when sender address becomes null

#### TokenTip
- Self-tip validation updates when sender address changes
- Post-conditions use current sender address at transaction time
- Whitelist checks use current sender address
- Validation errors clear when sender address becomes null

#### ProfileManager
- Profile data refetches when sender address changes
- Profile state clears when sender address becomes null
- Form resets to empty state on disconnect

## Testing

Session change behavior is tested in:
- `frontend/src/test/BatchTip.session-change.test.jsx`
- `frontend/src/test/SendTip.session-change.test.jsx`
- `frontend/src/test/TokenTip.session-change.test.jsx`
- `frontend/src/test/ProfileManager.session-change.test.jsx`

Each test suite verifies:
1. Self-tip validation updates when sender address changes
2. Validation errors clear when sender address becomes null
3. Post-conditions use the current sender address

## Key Changes

### ProfileManager
- Added `clearProfile()` call when `senderAddress` becomes null
- Ensures form state resets on wallet disconnect

### All Components
- Already using `useSenderAddress` hook correctly
- Validation callbacks have `senderAddress` in dependency arrays
- Post-conditions built at transaction time with current address

## Migration Notes

No migration needed. All components were already using the reactive `useSenderAddress` hook. The only fix was ensuring ProfileManager clears its state when the address becomes null.

## Future Improvements

- Add visual feedback when wallet session changes
- Consider showing a toast notification on account switch
- Add reconnection prompts when session expires
