# Frontend Performance Budget

## Bundle Size Targets

### Initial Load (Gzipped)
- **Main bundle (index)**: < 25KB (Currently: ~19KB)
- **Vendor React chunk**: < 65KB (Currently: ~60KB)
- **Vendor Stacks chunk**: < 50KB (Currently: ~48KB)
- **Total initial JS before interaction**: < 150KB

### Deferred Chunks (Gzipped)
- **@walletconnect/universal-provider**: ~105KB - loaded on first auth attempt
- **@reown/appkit**: ~58KB - loaded on first auth attempt
- **Route components**: 2-7KB each - loaded on navigation

### Route Chunks (Gzipped)
- SendTip: ~5.7KB
- RecentTips: ~5.6KB
- TipHistory: ~4.5KB
- TelemetryDashboard: ~6.7KB

### Third-party Libraries
- Wallet connect modules: Lazy loaded on auth
- @stacks/connect: Dynamically imported
- @reown/appkit: Dynamically imported via @stacks/connect
- web-vitals: Deferred to after render

## Performance Metrics (Target / Current)

### Web Vitals
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### Bundle Optimization Checklist
1. Add bundle visualizer
2. Lazy load wallet dependencies
3. Remove framer-motion (replaced with CSS)
4. Split vendor chunks
5. Defer @stacks/connect loading
6. Lazy load route components
7. Remove unused imports
8. Add preconnect hints

## Monitoring

Bundle size is tracked via:
- Vite build output
- rollup-plugin-visualizer (dist/stats.html)
- CI workflow bundle size check
- Manual review before deployment

## Build Commands

```bash
npm run build          # Production build
npm run build:analyze  # Build with bundle analysis
```

## Notes

Initial bundle contains:
- App shell and routing (lazy)
- Context providers
- Common utilities
- CSS

Deferred until needed:
- Wallet connection (@stacks/connect)
- Route components
- web-vitals reporting
