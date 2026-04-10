# Demo Mode Feature

## Overview

Demo mode enables users to explore TipStream without connecting a wallet or spending STX. It's a low-friction way for new users to understand the platform and for developers to test functionality.

## What's Included

### Configuration
- Mock wallet address and balance
- Configurable transaction delay
- Sample tips for leaderboard
- All settings in `frontend/src/config/demo.js`

### Context Provider
- Global demo state management
- localStorage persistence
- Simple toggles and getters

### Hooks (8 total)
1. **useDemoMode** - Main control hook
2. **useDemoBalance** - Simulate user balance
3. **useDemoTransaction** - Simulate blockchain transactions
4. **useDemoLeaderboard** - Mock leaderboard data
5. **useDemoStats** - Platform statistics
6. **useDemoHistory** - Track demo tips sent
7. **useSendTipWithDemo** - Integrated tip sending
8. **demo-utils** - Utility functions

### Components
- **DemoIndicator** - Visual indicator when active

### Documentation
- Architecture overview (DEMO_MODE.md)
- Integration guide (DEMO_INTEGRATION_GUIDE.md)
- TypeScript types

### Tests
- Configuration tests
- Hook tests
- Utility function tests

## Quick Use

Enable demo mode:
```javascript
const { toggleDemo } = useDemoMode();
toggleDemo(true);
```

Access demo balance:
```javascript
const { balance } = useDemoBalance(realBalance);
```

Simulate transaction:
```javascript
const { submitMockTransaction } = useDemoTransaction();
await submitMockTransaction(tipData);
```

## Key Features

✓ No wallet connection required  
✓ No blockchain interaction  
✓ Mock balance tracks deductions  
✓ Simulated transaction delays  
✓ Persistent user preference  
✓ Clear indicator when active  
✓ Easy to disable  
✓ Transparent to components  

## Files

### Core
- `frontend/src/config/demo.js` - Configuration
- `frontend/src/context/DemoContext.jsx` - Provider
- `frontend/src/components/DemoIndicator.jsx` - Visual indicator

### Hooks
- `frontend/src/hooks/useDemoMode.js`
- `frontend/src/hooks/useDemoBalance.js`
- `frontend/src/hooks/useDemoTransaction.js`
- `frontend/src/hooks/useDemoLeaderboard.js`
- `frontend/src/hooks/useDemoStats.js`
- `frontend/src/hooks/useDemoHistory.js`
- `frontend/src/hooks/useSendTipWithDemo.js`

### Utilities
- `frontend/src/lib/demo-utils.js`

### Tests
- `frontend/src/test/demo.test.js`
- `frontend/src/test/demo-hooks.test.js`
- `frontend/src/test/demo-utils.test.js`

### Documentation
- `frontend/docs/DEMO_MODE.md`
- `frontend/docs/DEMO_INTEGRATION_GUIDE.md`

### Types
- `frontend/src/types/demo.ts`

## Testing

Run tests:
```bash
npm test demo
npm test demo-hooks
npm test demo-utils
```

Manual testing:
```javascript
// Enable demo mode in console
localStorage.setItem('tipstream_demo_mode', 'true');
// Refresh page
```

## Benefits

- Lower barrier for new users
- Safe testing environment
- Hackathon demo capability
- No blockchain wait times
- Consistent mock data
- Easy to disable

## Future Enhancements

- Configurable mock users
- Multiple demo scenarios
- Auto-enable on first visit
- Demo tutorial
- Analytics tracking
- Preset demo paths

## Architecture

Demo mode is implemented as opt-in context provider with transparent hooks. Components can use demo data without special handling:

1. DemoProvider wraps application
2. Hooks check demo mode internally
3. Fallback to real data when disabled
4. localStorage persists preference
5. Indicator shows when active

## See Also

- DEMO_MODE.md - Detailed architecture
- DEMO_INTEGRATION_GUIDE.md - Developer integration
- frontend/src/types/demo.ts - TypeScript types
