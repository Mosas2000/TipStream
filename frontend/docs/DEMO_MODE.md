# Demo Mode Implementation

Demo mode allows users to experience TipStream functionality without connecting a real wallet or spending STX. This provides a low-barrier entry point for new users and testing.

## Configuration

Demo mode is configured in `frontend/src/config/demo.js`:
- Mock wallet address for simulation
- Default balance: 5000 STX (microSTX)
- Transaction delay: 800ms (simulates blockchain confirmation)
- Sample tips for leaderboard

## Architecture

### Context Provider
- **DemoContext.jsx**: Manages demo mode state globally
- Provides `useDemoMode()` hook to all components
- Toggles demo mode on/off
- Persists preference to localStorage

### Hooks

#### useDemoMode()
Main hook to access demo mode functionality:
```javascript
const { demoEnabled, toggleDemo, getDemoData } = useDemoMode();
```

#### useDemoBalance(realBalance)
Manages demo balance state:
```javascript
const { balance, deductBalance, isDemoBalance } = useDemoBalance(realBalance);
```

#### useDemoTransaction()
Simulates blockchain transactions:
```javascript
const { submitMockTransaction, pendingTransaction } = useDemoTransaction();
```

#### useDemoLeaderboard()
Provides mock leaderboard data:
```javascript
const { getDemoLeaderboard, getDemoRank } = useDemoLeaderboard();
```

#### useSendTipWithDemo(realBalance)
Integrates demo mode with tip sending:
```javascript
const { sendTipInDemo, displayBalance } = useSendTipWithDemo(realBalance);
```

### Components

#### DemoIndicator
Subtle visual indicator when demo mode is active:
- Pulsing amber badge in bottom right
- Quick exit button to disable demo
- Only renders when demo mode is enabled

## Usage

### Enabling Demo Mode

Programmatically:
```javascript
import { useDemoMode } from './context/DemoContext';

function MyComponent() {
  const { toggleDemo } = useDemoMode();
  
  return (
    <button onClick={() => toggleDemo(true)}>
      Try Demo
    </button>
  );
}
```

Via localStorage (persists across sessions):
```javascript
localStorage.setItem('tipstream_demo_mode', 'true');
```

### Using Demo Balance

Components can transparently use real or demo balance:
```javascript
function SendTip() {
  const { balance, isDemoBalance } = useDemoBalance(realBalance);
  
  return (
    <div>
      Balance: {balance}
      {isDemoBalance && <span>(Demo)</span>}
    </div>
  );
}
```

### Simulating Transactions

Mock transactions delay automatically:
```javascript
const { submitMockTransaction } = useDemoTransaction();

const result = await submitMockTransaction({
  recipient: 'SP...',
  amount: 100,
  message: 'Test tip',
  category: 0
});

// Returns: { txId: '0x...', success: true }
```

## Behavior

### Demo Balance
- Starts at 5000 microSTX
- Deducted when submitting tips
- Not deducted in real mode
- Resets when demo mode is disabled

### Mock Transactions
- Generate fake transaction IDs
- Delay 800ms to simulate confirmation
- Return success status
- Don't interact with blockchain

### Leaderboard
- Returns 5 mock users with rankings
- Consistent data across sessions
- Based on demo configuration

## Testing

Run demo tests:
```bash
npm test demo
```

Tests verify:
- Configuration structure
- Enable/disable functionality
- localStorage persistence
- Hook behavior

## Disabling Demo Mode

Users can exit demo mode via:
1. Click "Exit" button on DemoIndicator
2. Toggle programmatically with `toggleDemo(false)`
3. Clear localStorage: `localStorage.removeItem('tipstream_demo_mode')`

## Implementation Notes

### Transparency
Demo hooks transparently fall back to real functionality:
- In real mode: `useDemoBalance()` returns real balance
- In real mode: `useDemoTransaction()` does nothing
- Components don't need to check mode before using hooks

### No UI Changes
- Demo mode requires no UI changes
- Indicator appears only when active
- All components work identically
- Users see consistent interface

### Persistence
- Demo preference saved to localStorage
- Survives page refresh
- Per-browser setting
- Easy to clear if needed

## Future Enhancements

Potential improvements:
- Demo tip history tracking
- Configurable mock users
- Multiple demo scenarios
- Reset demo data button
- Demo mode analytics

## Related Files

- `frontend/src/config/demo.js` - Configuration
- `frontend/src/context/DemoContext.jsx` - Provider
- `frontend/src/hooks/useDemoMode.js` - Main hook
- `frontend/src/hooks/useDemoBalance.js` - Balance simulation
- `frontend/src/hooks/useDemoTransaction.js` - Transaction simulation
- `frontend/src/hooks/useDemoLeaderboard.js` - Leaderboard data
- `frontend/src/hooks/useSendTipWithDemo.js` - Tip integration
- `frontend/src/components/DemoIndicator.jsx` - Visual indicator
- `frontend/src/lib/demo-utils.js` - Utility functions
- `frontend/src/test/demo.test.js` - Unit tests
