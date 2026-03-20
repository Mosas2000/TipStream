# Notification State Scoping

## Overview

Notification read state is now scoped per wallet address and network to ensure accurate unread counts when users switch between wallets or networks.

## Storage Key Format

```
tipstream_last_seen_{network}_{address}
```

Examples:
- `tipstream_last_seen_mainnet_SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T`
- `tipstream_last_seen_testnet_ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM`

## Behavior

### Address Switching
When a user switches wallets:
- Previous wallet's notification state is preserved
- New wallet loads its own notification state
- Unread counts are isolated per wallet

### Network Switching
When network changes:
- Notification state is scoped to the new network
- Each network maintains separate read state
- Example: mainnet tips remain unread when viewing testnet

### Session Management
- **Logout**: State resets to 0 when address becomes null
- **Reconnect**: Loads saved state for reconnected address
- **Fresh wallet**: Starts with 0 last-seen timestamp

## Migration

### Legacy State
Old installations used a single key:
```
tipstream_last_seen_tip_ts
```

### Migration Process
1. On first load with an address, check for legacy key
2. If legacy value exists and no scoped value, copy to scoped key
3. Legacy key remains for backward compatibility
4. Migration runs once per address-network pair

### Example
```javascript
// Legacy (before)
localStorage.getItem('tipstream_last_seen_tip_ts'); // 1234567890

// After migration for address SP123... on mainnet
localStorage.getItem('tipstream_last_seen_mainnet_SP123...'); // 1234567890

// Original key unchanged
localStorage.getItem('tipstream_last_seen_tip_ts'); // 1234567890
```

## API

### Storage Functions

```javascript
import {
  getNotificationStorageKey,
  getLastSeenTimestamp,
  setLastSeenTimestamp,
  migrateLegacyNotificationState
} from './lib/notificationStorage';

// Generate storage key
const key = getNotificationStorageKey(address, network);

// Get last seen timestamp
const timestamp = getLastSeenTimestamp(address, network);

// Save last seen timestamp
setLastSeenTimestamp(address, network, timestamp);

// Migrate legacy state (automatic, called by hook)
const migrated = migrateLegacyNotificationState(address, network);
```

### Hook Usage

```javascript
import { useNotifications } from './hooks/useNotifications';

function MyComponent() {
  const { notifications, unreadCount, markAllRead } = useNotifications(userAddress);
  
  // unreadCount is scoped to current address and network
  // markAllRead saves to scoped storage
}
```

## Testing

### Multi-Account Tests
Tests verify isolation between different wallets:
```javascript
// Different addresses have independent state
setLastSeenTimestamp('SP111...', 'mainnet', 1000);
setLastSeenTimestamp('SP222...', 'mainnet', 2000);

getLastSeenTimestamp('SP111...', 'mainnet'); // 1000
getLastSeenTimestamp('SP222...', 'mainnet'); // 2000
```

### Network Isolation Tests
Tests verify network-specific state:
```javascript
// Same address on different networks
setLastSeenTimestamp('SP123...', 'mainnet', 1000);
setLastSeenTimestamp('SP123...', 'testnet', 2000);

getLastSeenTimestamp('SP123...', 'mainnet'); // 1000
getLastSeenTimestamp('SP123...', 'testnet'); // 2000
```

## Backward Compatibility

- Existing users with legacy key continue to work
- Legacy state migrates automatically on first load
- No data loss during migration
- Legacy key not deleted for safety

## Edge Cases

### Null Address
```javascript
getLastSeenTimestamp(null, 'mainnet'); // Returns 0
setLastSeenTimestamp(null, 'mainnet', 1000); // No-op
```

### Null Network
```javascript
getLastSeenTimestamp('SP123...', null); // Returns 0
setLastSeenTimestamp('SP123...', null, 1000); // No-op
```

### Invalid Data
```javascript
// Non-numeric value in storage
localStorage.setItem(key, 'invalid');
getLastSeenTimestamp(address, network); // Returns 0
```

## Troubleshooting

### Unread count incorrect after wallet switch
- Check that userAddress prop changed
- Verify hook re-rendered with new address
- Inspect localStorage for scoped keys

### Migration not working
- Ensure legacy key exists
- Check console for errors
- Verify address and network are valid

### State not persisting
- Check localStorage is enabled
- Verify no quota errors in console
- Confirm markAllRead was called
