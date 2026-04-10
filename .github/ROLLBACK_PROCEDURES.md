# Rollback Procedures and Incident Response

This document provides comprehensive procedures for diagnosing and recovering from deployment incidents.

## Overview

The rollback system supports:
- Automatic rollback to any previous commit
- Fast incident response (typically under 5 minutes)
- Full audit trail of all rollback actions
- Integration with incident management

## Quick Start (Incident Response)

If production is experiencing issues:

1. **Assess severity**:
   - Is service completely down? → Critical incident
   - Are some features broken? → Major incident
   - Is performance degraded? → Minor incident

2. **Initiate rollback**:
   - Go to GitHub repository
   - Click "Actions" tab
   - Select "Rollback Deployment" workflow
   - Click "Run workflow"
   - Enter last-known good commit (from git log or tag)
   - Select "production"
   - Confirm

3. **Monitor recovery**:
   - Watch deployment logs
   - Wait for smoke test completion
   - Verify production URL is responsive
   - Check monitoring dashboards

4. **Post-incident**:
   - Notify stakeholders of resolution
   - Document what failed
   - Create issue for root cause investigation
   - Schedule follow-up review

## Finding the Right Rollback Target

### Method 1: Use Recent Stable Tag
If releases are tagged:
```bash
git tag -l | tail -10  # Show recent tags
# Use most recent stable tag (e.g., v1.2.3)
```

### Method 2: Check Recent Commits
```bash
git log --oneline -20
# Identify last commit before issue appeared
```

### Method 3: Check Deployment History
1. Go to Vercel dashboard
2. Navigate to TipStream project
3. Click "Deployments" tab
4. Identify last successful deployment
5. Copy its commit SHA

### Method 4: Review Monitoring Data
1. Check error tracking (Sentry, LogRocket, etc.)
2. Identify approximate time issue started
3. Use git log with --since and --until to find commits
4. Test commits locally if uncertain

## Rollback Workflow in Detail

### Automatic Rollback via GitHub Actions

**Trigger**: Actions tab > Rollback Deployment > Run workflow

**Inputs**:
- target-version: Commit SHA or tag name
- environment: "production" or "preview"

**Steps**:
1. Checkout selected version from git
2. Install Node.js 20 runtime
3. Install npm dependencies
4. Build production-optimized frontend
5. Verify build artifacts (index.html required)
6. Deploy to Vercel with prod: true flag
7. Run smoke test on deployment URL
8. Create GitHub issue with rollback record
9. Optional Slack notification

**Duration**: Typically 3-4 minutes

**Output**: 
- Deployment URL (production stays same)
- Smoke test result (pass/fail)
- GitHub issue for audit trail

### Manual Rollback via Git Push

For situations where workflow is unavailable:

```bash
# 1. Identify target version
git log --oneline | head -20

# 2. Create rollback commit
git revert <commit-sha>
# or
git reset --hard <commit-sha>

# 3. Push to main (triggers auto-deploy)
git push origin main

# 4. Wait for deployment
# Go to Actions tab and monitor
```

**Advantages**: Works if Actions unavailable
**Disadvantages**: Requires git access, affects git history

### Preview Environment Rollback

For preview/staging environment:

1. Go to Actions > Rollback Deployment
2. Enter target-version (commit or tag)
3. Select "preview"
4. Confirm

Preview rollbacks don't affect production and help test recovery procedures.

## Common Incident Scenarios

### Scenario 1: Frontend Build Broken
**Symptoms**:
- Blank page on load
- 404 on API endpoints
- CSS/JS not loading

**Diagnosis**:
```bash
# Check recent build output
gh run view <recent-deploy-run-id> --log | grep -i error

# Verify index.html exists in dist
npm run build && ls frontend/dist/index.html
```

**Resolution**:
1. Go to previous stable commit (before build change)
2. Run rollback workflow with that commit
3. Verify HTML/CSS/JS serve correctly
4. Check server logs for misconfigurations

### Scenario 2: API Requests Failing
**Symptoms**:
- Network errors on API calls
- CORS errors in console
- 502 Bad Gateway

**Diagnosis**:
```bash
# Check backend logs
# Check if backend server is running
# Verify API endpoint is responding
curl -v https://tipstream-silk.vercel.app/api/health
```

**Resolution**:
1. Check if this is frontend issue (HTML/JS)
2. Check if backend needs rollback (separate process)
3. If frontend issue, rollback to previous version
4. If backend issue, follow separate backend rollback

### Scenario 3: Data Issues
**Symptoms**:
- Incorrect data displayed
- Missing or corrupted records
- Inconsistent state

**Diagnosis**:
- Do NOT rollback frontend only if backend has changed
- Must rollback entire deployment including backend
- Data may be unrecoverable depending on changes

**Resolution**:
1. Stop production traffic if possible
2. Review database backups
3. Identify if issue is new code or data corruption
4. Rollback entire deployment (frontend + backend)
5. Restore from backup if data was deleted

### Scenario 4: Performance Degradation
**Symptoms**:
- Slow page loads
- Timeout errors
- CPU/memory high

**Diagnosis**:
```bash
# Check monitoring/APM
# Check Vercel analytics
# Check network waterfall in DevTools
```

**Resolution**:
1. Monitor if this is sustained or intermittent
2. Check if large bundle size added
3. Identify if recent feature is problematic
4. If needed, rollback to previous version
5. Reoptimize feature before redeployment

## Verification After Rollback

### Immediate Verification (< 1 minute)
```bash
# Verify deployment succeeded
curl -I https://tipstream-silk.vercel.app
# Should return 200

# Check if app loads
curl https://tipstream-silk.vercel.app | grep -c "TipStream"
# Should return non-zero
```

### Functional Verification (2-5 minutes)
1. Open https://tipstream-silk.vercel.app in browser
2. Complete basic user flow:
   - Load homepage
   - Navigate to main features
   - Verify no console errors
   - Check if previous issue is resolved

### Integration Verification (5-15 minutes)
1. Run smoke test suite:
   ```bash
   npm run test:smoke
   ```
2. Check monitoring dashboards:
   - Error rates returning to normal
   - Request latency improving
   - No new alerts
3. Verify backend connectivity
4. Check third-party integrations

### Stakeholder Communication
1. Notify team of successful rollback
2. Provide rollback details:
   - Previous version
   - Current version
   - What was reverted
3. ETA for fix and redeployment
4. Plan post-incident review

## Rollback Prevention Strategies

### Pre-deployment Testing
- Run full test suite before merge
- Perform load testing on major changes
- Test on staging environment first
- Require peer review and approval

### Gradual Rollout
- Use preview deployments for testing
- Canary deployments for percentage rollout
- Feature flags for gradual enablement
- Monitor metrics during rollout

### Monitoring and Alerts
- Real-time error tracking (Sentry)
- Performance monitoring (WebVitals)
- Uptime monitoring (third-party)
- Alert on anomalies (error rate spikes)

### Incident Prevention Checklist
- [ ] Code review passed
- [ ] All tests passing
- [ ] Build produces artifacts
- [ ] Staging deployment verified
- [ ] No console errors in browser
- [ ] API health check passing
- [ ] Performance metrics acceptable
- [ ] Third-party services responding

## Post-Incident Activities

### Immediate (same day)
1. Write incident report
2. Document timeline of events
3. Identify root cause
4. Create GitHub issue for fix

### Short-term (within 3 days)
1. Implement fix on separate branch
2. Get code review and approval
3. Deploy fix to staging
4. Deploy fix to production
5. Verify issue is resolved

### Long-term (within 2 weeks)
1. Update tests to catch similar issues
2. Improve monitoring/alerts
3. Review and improve processes
4. Schedule team retrospective
5. Update documentation
6. Update runbooks and procedures

## Automated Rollback Triggers

For future enhancement, consider automated rollback:

```yaml
# Example: Auto-rollback on error spike
- Monitor error rate
- If error_rate > 5% for > 5 minutes
- Check deployment timestamp
- If deployed < 30 minutes ago
- Auto-trigger rollback workflow
- Notify team via Slack
```

## Related Documentation

- See DEPLOYMENT_WORKFLOW.md for workflow details
- See DEPLOYMENT_ENVIRONMENTS.md for environment setup
- See MONITORING.md for health check procedures
- See INCIDENT_RESPONSE.md for broader incident procedures

## Support and Questions

For rollback issues:
1. Check GitHub Actions logs for specific errors
2. Verify commit exists and is on main branch
3. Check Vercel deployment history
4. Review rollback workflow output
5. Contact repository maintainers if persistent

## Emergency Contacts

In case of critical production incident:
- Post in team Slack channel
- Tag @maintainers
- Follow incident command procedures
- Activate war room if necessary
