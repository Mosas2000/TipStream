# Demo Mode Implementation Guide

This guide documents how to integrate demo mode into your components.

## Overview

Demo mode is a feature that allows users to try TipStream functionality without connecting a wallet. It provides mock balance, simulated transactions, and fake leaderboard data.

## Quick Start

### 1. Enable Demo Mode

In your component:
```javascript
import { useDemoMode } from '../context/DemoContext';

function MyComponent() {
  const { toggleDemo } = useDemoMode();
  
  return (
    <button onClick={() => toggleDemo(true)}>
      Try Demo
    </button>
  );
}
```

### 2. Use Demo Balance

Replace wallet balance with demo balance:
```javascript
import { useDemoBalance } from '../hooks/useDemoBalance';

function SendTip() {
  const { balance, isDemoBalance } = useDemoBalance(realBalance);
  
  return (
    <div>
      Balance: {balance} {isDemoBalance && '(Demo)'}
    </div>
  );
}
```

### 3. Submit Mock Transactions

When user submits a tip:
```javascript
import { useDemoTransaction } from '../hooks/useDemoTransaction';

function SendTip() {
  const { submitMockTransaction } = useDemoTransaction();
  
  const handleSubmit = async () => {
    const result = await submitMockTransaction({
      recipient: address,
      amount: amount,
      message: message,
      category: category,
    });
    
    if (result.success) {
      // Show success message
    }
  };
}
```

## Hook Reference

### useDemoMode()
Main hook for demo mode control.

```javascript
const { demoEnabled, toggleDemo, getDemoData } = useDemoMode();
```

**Properties:**
- `demoEnabled: boolean` - Whether demo mode is active
- `toggleDemo(enabled: boolean)` - Enable/disable demo mode
- `getDemoData()` - Get full demo configuration

### useDemoBalance(realBalance)
Manage balance display.

```javascript
const { balance, deductBalance, addBalance, isDemoBalance } = useDemoBalance(realBalance);
```

**Properties:**
- `balance` - Current balance (real or demo)
- `deductBalance(amount)` - Subtract from demo balance
- `addBalance(amount)` - Add to demo balance
- `isDemoBalance` - Whether showing demo balance

### useDemoTransaction()
Simulate transactions.

```javascript
const { submitMockTransaction, pendingTransaction, clearPendingTransaction } = useDemoTransaction();
```

**Properties:**
- `submitMockTransaction(data)` - Submit fake transaction
- `pendingTransaction` - Current pending tx state
- `clearPendingTransaction()` - Clear pending state

**Returns:**
```javascript
{
  txId: '0x...',
  success: true,
  timestamp: Date.now()
}
```

### useDemoLeaderboard()
Get mock leaderboard data.

```javascript
const { getDemoLeaderboard, getDemoRank } = useDemoLeaderboard();
```

**Methods:**
- `getDemoLeaderboard()` - Get full leaderboard
- `getDemoRank(address)` - Get rank for address

### useDemoStats()
Get platform statistics.

```javascript
const { getDemoStats } = useDemoStats();
```

**Returns:**
```javascript
{
  totalTips: number,
  totalAmount: number,
  averageTipAmount: number,
  activeTippers: number,
  activeRecipients: number,
  platformStats: { ... }
}
```

### useDemoHistory()
Track demo tips.

```javascript
const { demoTips, addDemoTip, getDemoHistory, clearDemoHistory } = useDemoHistory();
```

**Methods:**
- `addDemoTip(data)` - Add tip to history
- `getDemoHistory()` - Get all demo tips
- `clearDemoHistory()` - Clear history

### useSendTipWithDemo(realBalance)
Integrated hook for sending tips.

```javascript
const { demoEnabled, displayBalance, sendTipInDemo, pendingTransaction } = useSendTipWithDemo(realBalance);
```

## Component Integration

### DemoIndicator
Visual indicator component. Add to your main layout:

```javascript
import DemoIndicator from '../components/DemoIndicator';

function App() {
  return (
    <>
      <Header />
      <Main />
      <DemoIndicator />
    </>
  );
}
```

## Configuration

All demo settings are in `frontend/src/config/demo.js`:

```javascript
{
  enabled: false,                              // Demo mode toggle
  mockWalletAddress: 'SP3FBR...',             // Wallet for demo
  mockBalance: 5000,                          // Balance (microSTX)
  mockTransactionDelay: 800,                  // Delay (ms)
  mockTips: [...]                             // Sample data
}
```

## Best Practices

### 1. Transparent Fallback
Hooks return appropriate values based on mode:
```javascript
// Always safe to use
const { balance } = useDemoBalance(realBalance);
// Returns realBalance in normal mode, demoBalance in demo mode
```

### 2. Minimal Code Changes
Components don't need to know about demo mode:
```javascript
// No conditional logic needed
const { balance } = useDemoBalance(realBalance);
render(balance); // Just render it
```

### 3. Persistence
Demo preference survives page refresh:
```javascript
// User's demo preference is saved
toggleDemo(true);
// Refreshing page keeps demo enabled
```

### 4. Easy Exit
Users can disable demo anytime:
```javascript
// DemoIndicator has exit button
// Or toggle programmatically
toggleDemo(false);
```

## Common Patterns

### Send Tip in Demo Mode
```javascript
async function sendTip() {
  const { submitMockTransaction } = useDemoTransaction();
  const { deductBalance } = useDemoBalance(realBalance);
  
  deductBalance(amountInMicroSTX);
  
  const result = await submitMockTransaction({
    recipient,
    amount,
    message,
    category,
  });
  
  if (result.success) {
    showSuccess(`Tip sent! TX: ${result.txId}`);
  }
}
```

### Show Demo Leaderboard
```javascript
function Leaderboard() {
  const { demoEnabled } = useDemoMode();
  const { getDemoLeaderboard } = useDemoLeaderboard();
  const { realLeaderboard } = useLeaderboard();
  
  const leaderboard = demoEnabled 
    ? getDemoLeaderboard() 
    : realLeaderboard;
  
  return renderLeaderboard(leaderboard);
}
```

### Conditional Display
```javascript
function MyComponent() {
  const { demoEnabled } = useDemoMode();
  
  return (
    <div>
      {demoEnabled && <p>Running in demo mode</p>}
      <NormalContent />
    </div>
  );
}
```

## Testing Demo Mode

### Run Tests
```bash
npm test demo
npm test demo-hooks
```

### Manual Testing
1. Open browser console
2. `localStorage.setItem('tipstream_demo_mode', 'true')`
3. Refresh page
4. Demo mode should be active

### Test Scenarios
- Enable/disable demo mode
- Submit tip in demo mode
- Check balance changes
- Verify leaderboard data
- Clear history
- Disable and verify real mode

## Troubleshooting

### Demo mode not persisting
- Check localStorage is enabled
- Verify `tipstream_demo_mode` key is set
- Check browser privacy settings

### Demo balance not updating
- Verify `useDemoBalance` hook is used
- Check balance deduction is called
- Verify demo mode is enabled

### Mock transaction not completing
- Check 800ms delay is appropriate
- Verify mock transaction hook is called
- Check pending transaction state

## Future Enhancements

Potential improvements:
- Configurable mock users in leaderboard
- Multiple demo scenarios
- Auto-demo on first visit (optional)
- Demo mode analytics
- Reset demo data button
- Demo mode tutorial

## Related Documentation

- See `DEMO_MODE.md` for architecture overview
- See `frontend/src/config/demo.js` for configuration
- See test files for implementation examples
