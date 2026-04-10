# Deployment Integration Testing

Testing deployed applications in different environments.

## Test Pyramid

### Level 1: Unit Tests
- Test individual functions
- Run locally and in CI
- Coverage target: 70%+
- Duration: < 1 second each

### Level 2: Integration Tests
- Test component interactions
- Run in staging before production
- Coverage target: 50%+
- Duration: < 5 seconds each

### Level 3: Smoke Tests
- Test critical paths end-to-end
- Run automatically after deployment
- Coverage: Critical features only
- Duration: < 1 minute total

### Level 4: Manual Testing
- Full user journey testing
- Performed on staging first
- Coverage: All new features
- Duration: Variable

## Pre-Deployment Testing

### Local Testing
```bash
# Run test suite
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/components/TipForm.test.js
```

### Build Verification
```bash
# Build locally
npm run build

# Verify build succeeded
test -f frontend/dist/index.html
ls -lh frontend/dist/

# Check bundle size
du -sh frontend/dist/
```

### Manual Local Testing
1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Test critical paths**:
   - Load homepage
   - Navigate to features
   - Interact with forms
   - Check console for errors

3. **Check accessibility**:
   - Keyboard navigation
   - Screen reader (VoiceOver on Mac)
   - Color contrast
   - Focus indicators

## Staging Deployment Testing

### Automated Smoke Tests
Run automatically after preview deploy:
```bash
# Smoke test
npm run test:smoke
```

Checks:
- Homepage loads
- HTML structure valid
- Scripts load correctly
- CSS applied properly

### Manual Testing on Preview
1. **Click preview URL** posted on PR
2. **Test critical flows**:
   - Fill out form
   - Submit data
   - Check results
   - Verify no errors

3. **Cross-browser testing**:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (if applicable)

4. **Mobile testing**:
   - iPhone/Safari
   - Android/Chrome
   - Tablet size
   - Portrait + landscape

5. **Performance testing**:
   - Open DevTools > Network
   - Throttle to slow 3G
   - Check load times
   - Look for slow requests

### Staging Checklist
- [ ] All features working
- [ ] No console errors
- [ ] No broken links
- [ ] Images load correctly
- [ ] Forms submit successfully
- [ ] Mobile responsive
- [ ] Accessibility acceptable
- [ ] Performance acceptable

## Production Testing Strategy

### Pre-Production Verification
Before approving production deployment:
- [ ] All staging tests passed
- [ ] No new warnings in console
- [ ] Performance metrics acceptable
- [ ] No security vulnerabilities
- [ ] Team sign-off obtained

### Post-Deployment Verification (First 30 minutes)
After production deployment:

**Automated checks**:
- Health check workflow running
- No increase in error rate
- Response times stable
- No alert notifications

**Manual verification**:
```bash
# Check production URL
curl https://tipstream-silk.vercel.app

# Check status code
curl -I https://tipstream-silk.vercel.app

# Verify content
curl https://tipstream-silk.vercel.app | grep -i "tipstream"
```

**Visual verification**:
1. Open production URL
2. Wait for full load (check Network tab)
3. Verify no broken layouts
4. Test critical feature
5. Check console for errors

### 24-Hour Monitoring
- Watch error rates
- Monitor performance metrics
- Check user feedback
- Review support tickets
- Verify no new issues

## End-to-End Testing

### Critical Path Tests
Test these scenarios on every deployment:

**Scenario 1: Anonymous User Journey**
1. Load homepage
2. Navigate to tips section
3. View tip details
4. Try to create tip (prompt login)
5. Verify no errors

**Scenario 2: Authenticated User Journey**
1. Log in
2. Create new tip
3. Submit form
4. Verify submission success
5. Check tip appears in list

**Scenario 3: Error Scenarios**
1. Submit form with invalid data
2. Verify error message displays
3. Check no data loss
4. Verify can correct and resubmit

**Scenario 4: Edge Cases**
1. Very long text input
2. Special characters in form
3. Rapid form submission
4. Browser back button
5. Page refresh during action

## Performance Testing

### Lighthouse Audit
```bash
# Run Lighthouse on production
npx lighthouse https://tipstream-silk.vercel.app --view

# Key metrics to check:
# - Performance score > 90
# - Accessibility score > 90
# - Best practices score > 90
```

### Load Testing
For significant features:
1. Use load testing tool (Apache JMeter, k6)
2. Simulate expected user load
3. Check response times at peak
4. Verify no 500 errors under load
5. Monitor CPU/memory usage

### Core Web Vitals
```javascript
// Measure Web Vitals
web-vitals/attribution.js

// Target metrics:
// LCP (Largest Contentful Paint) < 2.5s
// FID (First Input Delay) < 100ms
// CLS (Cumulative Layout Shift) < 0.1
```

## Regression Testing

### Automated Regression
- Run full test suite before deploy
- Target: 100% of critical paths
- Time: < 5 minutes

### Manual Regression
After any deployment:
1. Test previous features still work
2. Check no new bugs introduced
3. Verify UI not broken
4. Check interactions smooth

### Regression Test Checklist
- [ ] Homepage loads
- [ ] Navigation works
- [ ] Previous features intact
- [ ] No new console errors
- [ ] No broken styles
- [ ] Forms functional
- [ ] API calls working
- [ ] Third-party integrations active

## Accessibility Testing

### Automated Accessibility
```bash
# Check accessibility
npx axe-core https://tipstream-silk.vercel.app

# Or use Lighthouse accessibility audit
npx lighthouse https://tipstream-silk.vercel.app --only-categories=accessibility
```

### Manual Accessibility Testing
1. **Keyboard navigation**:
   - Tab through all elements
   - Shift+Tab to go backward
   - Enter to activate buttons
   - Space for checkboxes

2. **Screen reader testing**:
   - Use NVDA (Windows) or VoiceOver (Mac)
   - Test major functionality
   - Verify form labels present
   - Check image alt text

3. **Color contrast**:
   - Use WebAIM contrast checker
   - Check all text is readable
   - Verify buttons distinguishable

4. **Focus indicators**:
   - Visible focus on all interactive elements
   - Consistent focus style
   - Not hidden by other elements

## Security Testing

### OWASP Basics
- [ ] No hardcoded secrets
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] HTTPS enforced
- [ ] No sensitive data in logs

### Dependency Security
```bash
# Check for known vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Or update vulnerable package
npm update [package-name]
```

### Input Validation
- [ ] Form input sanitized
- [ ] Output properly escaped
- [ ] No eval() or dangerous functions
- [ ] File uploads validated
- [ ] API inputs validated

## Testing on Different Networks

### Slow Network
DevTools > Network > Throttle to:
- Slow 3G: 400kb/s down, 20kb/s up
- Fast 3G: 1.6mb/s down, 750kb/s up
- 4G: 4mb/s down, 3mb/s up

### Offline
DevTools > Network > Offline
- Check graceful degradation
- Verify error handling
- Check if can work offline (if applicable)

### High Latency
Use network throttle tool:
```bash
# Mac: Network Link Conditioner
# Linux: tc command
# Windows: NetLimiter
```

## Test Reporting

### Report Template
```
Deployment Test Report
Date: [date]
Version: [version/commit]
Tester: [name]

Test Results:
- Unit tests: PASS/FAIL [coverage %]
- Integration tests: PASS/FAIL
- Smoke tests: PASS/FAIL
- Manual testing: PASS/FAIL
- Performance: PASS/FAIL [metrics]
- Accessibility: PASS/FAIL
- Security: PASS/FAIL

Issues Found:
1. [Issue description] - Severity: [High/Medium/Low]
2. [Issue description] - Severity: [High/Medium/Low]

Recommended Action:
- [ ] Safe to deploy
- [ ] Hold for fixes
- [ ] Rollback if deployed

Sign-off: [Tester name] on [date]
```

## Continuous Testing

### Pre-commit Testing
- Hook runs tests locally
- Prevents broken code push
- Can be bypassed (git commit --no-verify)

### CI Testing
- Automatic on PR open
- Blocks merge if failing
- Cannot be bypassed

### Post-deploy Testing
- Health check workflow every 15 min
- Monitors for degradation
- Creates issue on failure

## Tools and Frameworks

### Testing Libraries
- Jest: Unit and integration testing
- React Testing Library: Component testing
- Cypress/Playwright: End-to-end testing
- Vitest: Fast unit testing

### Performance Tools
- Lighthouse: https://lighthouse.dev
- WebPageTest: https://webpagetest.org
- Chrome DevTools: Built-in browser tool

### Security Tools
- npm audit: Vulnerability scanning
- OWASP ZAP: Security scanning
- Snyk: Dependency security

### Accessibility Tools
- Axe DevTools: https://www.deque.com/axe/devtools/
- WAVE: https://wave.webaim.org/
- WebAIM: https://webaim.org/

## Troubleshooting Tests

### Test Fails Locally But Passes in CI
- Check Node version matches
- Check environment variables set
- Check test isolation
- Check for flaky tests

### Test Passes Locally But Fails in CI
- Check CI Node version
- Check npm version match
- Check cache issues
- Check environment differences

### Performance Tests Failing
- Check baseline is correct
- Compare with previous runs
- Check for system load
- Verify network stable

## Related Documentation

- See DEPLOYMENT_CHECKLIST.md for pre-deploy verification
- See BEST_PRACTICES.md for testing standards
- See DEPLOYMENT_TROUBLESHOOTING.md for issue diagnosis
- See MONITORING.md for post-deploy monitoring

## Testing Goals

### Coverage Targets
- Unit tests: 70%+ code coverage
- Integration tests: 50%+ critical paths
- E2E tests: 100% critical user journeys

### Quality Targets
- Test pass rate: 100%
- Flaky test rate: < 1%
- Test execution time: < 5 minutes
- Coverage trend: Always increasing

## Support

For testing issues:
1. Check this documentation
2. Run tests locally first
3. Review test output carefully
4. Check test environment setup
5. Ask team members for guidance
6. Create issue if systematic problem
