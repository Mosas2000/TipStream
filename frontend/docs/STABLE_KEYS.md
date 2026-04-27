# Stable Keys for RecentTips Feed

## Overview

The RecentTips component uses a stable key generation strategy to ensure consistent row identity across re-renders, pagination, and reordering.

## Key Generation Strategy

The `getTipRowKey` utility function implements a three-tier fallback strategy:

### 1. Primary: tipId
When available, uses the tip's unique identifier:
```javascript
key = `tip:${tipId}`
```

### 2. Secondary: txId
When tipId is missing, falls back to transaction ID:
```javascript
key = `tx:${txId}`
```

### 3. Tertiary: Fingerprint
When both tipId and txId are missing, generates a fingerprint from tip properties:
```javascript
key = `fp:${sender}:${recipient}:${amount}:${fee}:${timestamp}`
```

## Why Stable Keys Matter

Unstable keys can cause:
- Stale row state during reordering
- Lost focus when pagination changes
- Incorrect animations and transitions
- React reconciliation issues

## Implementation

### Location
- Key generation: `frontend/src/lib/tipRowKey.js`
- Usage: `frontend/src/components/RecentTips.jsx`

### Usage Example
```javascript
{allEnrichedTips.map((tip) => (
  <div key={getTipRowKey(tip)}>
    {/* tip content */}
  </div>
))}
```

## Edge Cases Handled

- Null or undefined tipId/txId
- Empty string or whitespace-only values
- Missing sender/recipient (defaults to 'unknown')
- Missing amount/fee/timestamp (defaults to '0')
- Completely empty tip objects

## Testing

Comprehensive test coverage includes:
- Unit tests for key generation (`tipRowKey.test.js`)
- Component tests for row stability (`RecentTips.keys.test.jsx`)
- Pagination stability tests
- Reordering stability tests
- Edge case handling

## Performance

The fingerprint strategy ensures:
- O(1) key generation
- No array index dependencies
- Consistent keys across renders
- Minimal memory overhead
