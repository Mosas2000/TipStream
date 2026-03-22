# Frontend Performance Budget

## Bundle Size Targets

### Initial Load (Gzipped)
- **Main bundle**: < 280KB (Currently: ~314KB)
- **Vendor React chunk**: < 20KB (Currently: ~17KB) ✓
- **Vendor Stacks chunk**: < 40KB (Currently: ~34KB) ✓
- **Total initial JS**: < 350KB (Currently: ~365KB)

### Route Chunks (Gzipped)
- SendTip: < 6KB (Currently: ~5KB) ✓
- BatchTip: < 5KB (Currently: ~4KB) ✓
- RecentTips: < 6KB (Currently: ~5.4KB) ✓
- Admin routes: < 8KB each ✓

### Third-party Libraries
- Wallet connect modules: Lazy loaded ✓
- @stacks/connect: Dynamically imported ✓
- framer-motion: Removed ✓

## Performance Metrics (Target / Current)

### Web Vitals
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

### Bundle Goals
1. ✓ Add bundle visualizer
2. ✓ Lazy load wallet dependencies
3. ✓ Remove framer-motion (replaced with CSS)
4. ✓ Split vendor chunks
5. ⏳ Reduce main bundle to < 280KB gzipped
6. ⏳ Optimize @stacks/transactions imports

## Monitoring

Bundle size is tracked via:
- Vite build output
- rollup-plugin-visualizer (dist/stats.html)
- Manual review before deployment

## Notes

Main bundle currently contains:
- App shell and routing
- Context providers (TipContext, ThemeContext)
- Common utilities and hooks
- Shared UI components
- Contract event fetching logic

Target: Defer more heavy logic until after first paint.
