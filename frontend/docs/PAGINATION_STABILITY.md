# Pagination Stability

## Problem

When using array indices as React keys, pagination can cause:
- Lost focus on interactive elements
- Incorrect animations
- Stale component state
- Poor user experience

## Solution

Use stable keys that remain consistent across:
- Page changes
- Sorting operations
- Filter applications
- Data refreshes

## Implementation

The RecentTips component uses `getTipRowKey()` to generate stable keys based on tip properties rather than array position.

## Benefits

1. Row identity persists across pagination
2. Focus management works correctly
3. Animations are smooth and accurate
4. Component state is preserved appropriately

## Testing

Tests verify that:
- Keys remain stable when moving between pages
- Keys don't change when data is reordered
- Keys are unique within a page
- Keys handle edge cases gracefully
