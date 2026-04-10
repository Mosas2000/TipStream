# Demo Mode Environment Setup

## Configuration

Demo mode is automatically configured when the application starts. The default configuration is in `frontend/src/config/demo.js`.

## Default Settings

```javascript
{
  enabled: false,                    // Demo starts disabled
  mockWalletAddress: 'SP3FBR...',   // Mock Stacks address
  mockBalance: 5000,                // MicroSTX (5000 = 0.005 STX)
  mockTransactionDelay: 800,        // Milliseconds
  mockTips: [...]                   // Sample data
}
```

## Customization

### Changing Mock Balance

Edit `frontend/src/config/demo.js`:
```javascript
mockBalance: 10000,  // Increase to 10000 microSTX
```

### Changing Transaction Delay

```javascript
mockTransactionDelay: 1000,  // Wait 1 second instead of 800ms
```

### Adding More Mock Tips

```javascript
mockTips: [
  {
    id: 'demo-1',
    sender: 'SP...',
    recipient: 'SP...',
    amount: 150,
    memo: 'Your message',
    timestamp: Date.now(),
  },
  // Add more...
]
```

### Changing Mock Wallet Address

```javascript
mockWalletAddress: 'SP...',  // Use different address
```

## Environment Variables

Currently, demo mode doesn't use environment variables. It's configured via code.

### Future: Environment-based Configuration

To enable env-based config in future:

```javascript
// frontend/src/config/demo.js
export const DEMO_CONFIG = {
  enabled: import.meta.env.VITE_DEMO_MODE === 'true',
  mockBalance: parseInt(import.meta.env.VITE_DEMO_BALANCE || '5000'),
  // ...
}
```

Then in `.env`:
```bash
VITE_DEMO_MODE=false
VITE_DEMO_BALANCE=5000
VITE_DEMO_TRANSACTION_DELAY=800
```

## Local Development

### Enable Demo Mode Locally

1. In browser console:
```javascript
localStorage.setItem('tipstream_demo_mode', 'true');
location.reload();
```

2. Or programmatically in code:
```javascript
import { activateDemo } from './lib/demo-utils';
activateDemo();
```

### Disable Demo Mode

```javascript
localStorage.removeItem('tipstream_demo_mode');
location.reload();
```

Or click the "Exit" button on the DemoIndicator component.

## Testing Different Scenarios

### Scenario 1: First-time User

1. Enable demo mode
2. User sees mock balance
3. Can submit tips without wallet
4. Sees fake leaderboard

### Scenario 2: Multiple Transactions

1. Enable demo mode
2. Submit several tips
3. Watch balance decrease
4. Verify history tracking

### Scenario 3: Mode Switching

1. Enable demo mode
2. Use all demo features
3. Disable demo mode
4. Verify real mode works

## Performance Considerations

### Mock Transaction Delay

Default 800ms simulates blockchain confirmation. Adjust based on needs:
- 500ms: Fast, but might feel too instant
- 800ms: Default, feels realistic
- 1000ms+: Very slow, good for testing loading states

### Balance Updates

Demo balance updates are synchronous. No network latency.

### Data Generation

Leaderboard and stats are generated on demand, not cached.

## Debugging

### Check Demo Mode Status

```javascript
// In console
localStorage.getItem('tipstream_demo_mode');
// Returns: 'true' or null
```

### View Demo Configuration

```javascript
// In console
import { getDemo } from './config/demo';
console.log(getDemo());
```

### View Mock Balance

```javascript
import { useDemoBalance } from './hooks/useDemoBalance';
// Inside component:
const { balance, isDemoBalance } = useDemoBalance(0);
console.log('Balance:', balance, 'Is Demo:', isDemoBalance);
```

## Production Deployment

### Default Behavior

Demo mode defaults to disabled (`enabled: false`).

### Enabling in Production

Generally not recommended, but possible:

```javascript
// frontend/src/config/demo.js
enabled: false,  // Keep disabled for production
```

Users can still enable via console:
```javascript
localStorage.setItem('tipstream_demo_mode', 'true');
```

### Disabling Console Access

To prevent users from enabling demo mode via console (not recommended):
```javascript
// Requires obfuscation or build-time configuration
// Generally not worth the complexity
```

## Monitoring

### User Demographics

Demo mode uses localStorage:
```javascript
// In analytics or monitoring
if (localStorage.getItem('tipstream_demo_mode') === 'true') {
  // User is in demo mode
}
```

### Usage Patterns

Demo tips are tracked separately:
```javascript
import { useDemoHistory } from './hooks/useDemoHistory';
const { demoTips } = useDemoHistory();
```

## Troubleshooting

### Demo mode not persisting

- Check if localStorage is enabled
- Check browser privacy settings
- Try incognito/private window

### Mock balance not updating

- Verify demo mode is active
- Check hook implementation
- Verify balance deduction is called

### Mock transactions taking too long

- Check `mockTransactionDelay` setting
- Verify no other delays added
- Check browser performance

### Cannot exit demo mode

- Click "Exit" button on DemoIndicator
- Or clear localStorage in console:
  ```javascript
  localStorage.removeItem('tipstream_demo_mode');
  location.reload();
  ```

## See Also

- DEMO_MODE.md - Architecture overview
- DEMO_INTEGRATION_GUIDE.md - Developer guide
- DEMO_MODE_README.md - Feature summary
