# Frontend Bundle Optimization Walkthrough

This document outlines the steps taken to resolve issue #324 (Reduce oversized frontend production bundles).

## 1. Baseline Analysis
The initial production build reported chunks exceeding the 600KB threshold, specifically the vendor chunks containing `@walletconnect` and `@reown` dependencies.

- **Initial Largest Chunk**: ~691KB
- **Bottlenecks**: Heavy wallet-related dependencies and monolithic vendor chunks.

## 2. Key Improvements

### manualChunks Optimization
Refined the `getManualChunk` strategy in `vite.config.js` to granularly isolate heavy libraries:
- **`vendor-walletconnect`**: Isolated `@walletconnect/*` packages.
- **`vendor-reown`**: Isolated `@reown/*` packages.
- **`vendor-stacks`**: Grouped `@stacks/*` and related crypto libraries.
- **`vendor-viem`**: Dedicated chunk for the `viem` library.
- **`vendor-ui-icons`**: Isolated `lucide-react` to leverage its high tree-shakability.

### Aggressive Minification
Configured `esbuild` to strip development-only artifacts in production:
- Dropped all `console.log` and `debugger` statements.
- Removed legal comments to save additional bytes.
- Set `target: 'esnext'` to allow for modern JS optimizations.

### Resolving Build Regressions
Fixed a critical regression in `TelemetryDashboard.jsx` where duplicate component declarations (`MetricCard`, `AlertPanel`, etc.) caused transformation failures during the optimization phase.

## 3. Final Bundle Results (Gzipped)

| Asset | Size (Gzipped) | Status |
|-------|----------------|--------|
| `index.js` (App Shell) | ~19KB | Optimized |
| `vendor-walletconnect` | ~105KB | Reduced |
| `vendor-react` | ~60KB | Balanced |
| `vendor-reown` | ~58KB | Isolated |
| `vendor-stacks` | ~48KB | Optimized |
| `vendor-ui-icons` | ~10KB | Highly Tree-shaken |

## 4. Maintenance
- **`PERFORMANCE_BUDGET.md`**: Updated with new targets to prevent future bloat.
- **Architecture Notes**: Added documentation to `wallet-connect.js` and `TelemetryDashboard.jsx` to guide future development and preserve these optimizations.
