# Deployment Verification Procedures

Checklist and procedures for verifying TipStream deployment is functioning correctly.

## Pre-Deployment Verification

### Contract Verification

- [ ] Contract source code compiles without errors
  ```bash
  clarinet check
  ```

- [ ] All tests pass on simnet
  ```bash
  npm test
  ```

- [ ] Post-condition mode is set to Deny for all transactions
  ```bash
  grep -r "PostConditionMode\.Allow" frontend/src --include="*.js"
  # Should return 0 matches
  ```

- [ ] No secrets committed to repository
  ```bash
  git log -p | grep -i "mnemonic\|private.key" || echo "Clean"
  ```

### Frontend Verification

- [ ] All components render without errors
  ```bash
  npm run build
  ```

- [ ] Tests pass
  ```bash
  npm run test:frontend
  ```

- [ ] No console errors on load
  - Run frontend and check DevTools console

---

## Post-Deployment Verification

### Contract Deployment

- [ ] Contract address matches expected value
  ```
  SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream
  ```

- [ ] Contract version is readable
  ```
  Get contract-version() via read-only call
  ```

- [ ] Admin functions accessible
  ```
  Call get-contract-owner() → should return current owner
  ```

- [ ] Fee structure correct
  ```
  Call get-current-fee-basis-points() → should return 50 (0.5%)
  ```

### Frontend Deployment

- [ ] Homepage loads
  ```
  Visit https://tipstream.xyz/
  ```

- [ ] Unauthenticated user sees landing page
  ```
  Clear cookies, open site
  Should see landing page, not send form
  ```

- [ ] Wallet connection works
  ```
  Click "Connect Wallet"
  Should open Leather/Xverse
  ```

- [ ] After auth, can access Send page
  ```
  After connecting wallet, should be able to navigate to /send
  ```

- [ ] Live Feed displays tips
  ```
  Visit /feed
  Should show recent tips with addresses and amounts
  ```

- [ ] Leaderboard displays rankings
  ```
  Visit /leaderboard
  Should show top senders/receivers
  ```

### Transaction Verification

- [ ] Send a test tip (small amount)
  ```
  Amount: 0.001 STX (minimum)
  Message: "Deployment test"
  Monitor: Should see in /feed within 30 seconds
  ```

- [ ] Verify tip appears on-chain
  ```
  Check Hiro Explorer for transaction
  Should show sender, recipient, amount, fee
  ```

- [ ] Verify admin tools work (owner-only)
  ```
  As owner, access /admin
  Verify pause/fee controls present
  ```

### API Resilience Verification

- [ ] Cache fallback displays
  ```
  1. Load /stats page (populates cache)
  2. DevTools → Network → Offline
  3. Reload page
  4. Should show "Last retrieved from cache" indicator
  ```

- [ ] Transaction lockout when cached
  ```
  With offline mode still on:
  /send -> Send button should be disabled
  Should show "Temporarily unavailable" message
  ```

- [ ] Manual refresh works
  ```
  While offline viewing cache:
  Click "Retry" button
  Should attempt to fetch (will timeout but shows attempt)
  ```

- [ ] Online recovery works
  ```
  Resume network connectivity
  Page should refresh to live data automatically
  Indicator should show "Live data"
  ```

---

## Performance Verification

- [ ] Initial page feed load < 3 seconds
  ```
  DevTools → Network tab
  Monitor load time on /feed with cold cache
  ```

- [ ] Pagination doesn't reload all messages
  ```
  1. Load /feed
  2. Scroll to next page
  3. Check Network tab - should NOT fetch all tips' messages again
  ```

- [ ] Search doesn't trigger API calls
  ```
  1. Load /feed
  2. Type in search box
  3. Network tab should show no new API calls (client-side filtering)
  ```

---

## Security Verification

- [ ] PostConditionMode.Deny on transactions
  ```
  Open DevTools when sending a tip
  Check transaction details
  Should show Deny mode
  ```

- [ ] Admin functions use timelocks
  ```
  As owner, try to change fee
  Should show "Propose Change" button (not immediate)
  Should not execute immediately
  ```

- [ ] Blocked user cannot receive tips
  ```
  1. Block a user from /block
  2. Try to send them a tip
  3. Should fail or reject at contract level
  ```

---

## Monitoring & Observability

### Metrics to Track Post-Deployment

- [ ] Average tip send latency
  - Target: < 30 seconds block confirmation
  - Monitor: Hiro API transaction times

- [ ] Feed load time
  - Target: < 2 seconds for initial load
  - Monitor: Frontend performance timing

- [ ] Cache hit rate
  ```
  window.printDiagnostics() in browser console
  Should show > 70% hit rate after initial load
  ```

- [ ] API failure recovery
  - Test monthly: Simulate API downtime
  - Verify cache fallback appears

### Error Monitoring

- [ ] No 5xx errors in frontend
  ```
  Monitor: Vercel deployment logs
  Alert if error rate > 1%
  ```

- [ ] Contract events indexing
  ```
  Monitor: Are tips appearing in Hiro API events?
  Alert if indexing lag > 60 seconds
  ```

---

## Rollback Procedures

If critical issues discovered:

### Frontend Rollback

```bash
# Revert to previous Vercel deployment
vercel rollback
# Or re-deploy from known-good commit
git checkout <last-good-commit>
npm run build && vercel --prod
```

### Contract Rollback

**Note:** Smart contracts are immutable. Cannot rollback deployed code.

Mitigation options:
- Deploy new version with corrections
- Use `set-paused` to freeze old contract
- Guide users to new contract address

---

## Sign-Off Checklist

Before marking deployment as verified:

- [ ] Pre-deployment verification complete
- [ ] Post-deployment verification complete
- [ ] All tests passing
- [ ] Transaction sent and confirmed on-chain
- [ ] Feed displays new transaction
- [ ] Cache fallback tested and working
- [ ] No critical errors in logs
- [ ] Monitoring dashboard accessible
- [ ] Rollback procedures documented and tested
- [ ] Team notified of deployment

**Deployed By:** ________________
**Date:** ________________
**Version:** ________________
**Sign-Off:** ________________

---

## References

- [JUDGES_SUMMARY.md](JUDGES_SUMMARY.md) - Deployment info
- [SECURITY.md](../SECURITY.md) - Security procedures
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System design
