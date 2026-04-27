# Key Stability Tests

## Overview

This directory contains tests for the stable key generation system used in the RecentTips feed.

## Test Files

### tipRowKey.test.js
Unit tests for the `getTipRowKey` utility function. Covers:
- Primary key generation (tipId)
- Secondary key generation (txId)
- Fingerprint generation
- Edge cases (null, undefined, empty strings)
- Type coercion
- Whitespace handling

### tipRowKey.edge-cases.test.js
Additional edge case tests for unusual input types:
- Boolean values
- Array values
- Object values
- Negative numbers

### RecentTips.keys.test.jsx
Component-level tests for key stability in the RecentTips component:
- Key stability across reorders
- Key stability across pagination
- Key stability after refresh
- Handling of missing tipId/txId

### RecentTips.integration.test.jsx
Integration tests for the complete key generation system:
- Multiple tips with different key strategies
- Mixed tip types
- Real-world scenarios

## Running Tests

Run all key-related tests:
```bash
npm test -- tipRowKey
```

Run specific test file:
```bash
npm test -- tipRowKey.test.js
```

## Coverage

The test suite provides comprehensive coverage of:
- All three key generation tiers
- Edge cases and error conditions
- Component integration
- Pagination and reordering scenarios
