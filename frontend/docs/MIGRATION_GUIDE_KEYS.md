# Migration Guide: Array Index to Stable Keys

## Background

Previously, RecentTips used array indices as React keys, which caused issues with:
- Row state persistence
- Focus management
- Animation correctness

## Changes

### Before
```javascript
{tips.map((tip, index) => (
  <div key={index}>
    {/* tip content */}
  </div>
))}
```

### After
```javascript
import { getTipRowKey } from '../lib/tipRowKey';

{tips.map((tip) => (
  <div key={getTipRowKey(tip)}>
    {/* tip content */}
  </div>
))}
```

## Benefits

1. Stable row identity across renders
2. Correct focus management
3. Smooth animations
4. Better React performance

## Testing

Run the test suite to verify:
```bash
npm test -- tipRowKey
```

## Rollback

If issues arise, the old behavior can be restored by reverting to array indices, but this is not recommended.
