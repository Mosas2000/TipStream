# Deployment Quick Reference

Quick lookup for common deployment tasks.

## Deployment URLs

- **Production**: https://tipstream-silk.vercel.app
- **Preview**: https://<project>-<pr-number>-<team>.vercel.app

## Workflows

### View Workflow Status
```bash
gh run list --workflow preview-deploy.yml
gh run view <RUN_ID>
```

### Manual Workflow Triggers
```bash
# View available workflows
gh workflow list

# Run preview workflow
gh workflow run preview-deploy.yml

# Run health check
gh workflow run health-check.yml

# Trigger rollback
gh workflow run rollback.yml
```

## Secrets Management

### View Secrets
```bash
# Cannot view secret values, but can list:
gh secret list
```

### Add Secret (CLI)
```bash
gh secret set VERCEL_TOKEN --body "token_value"
```

### Rotate Token
```bash
# 1. Generate new token in Vercel
# 2. Update in GitHub
gh secret set VERCEL_TOKEN --body "new_token"
# 3. Revoke old token in Vercel
```

## Rollback Quick Steps

1. **Identify target version**:
   ```bash
   git log --oneline | head -20
   ```

2. **Trigger rollback workflow**:
   - Go to Actions tab
   - Select "Rollback Deployment"
   - Enter commit SHA or tag
   - Select "production"
   - Confirm

3. **Monitor recovery**:
   - Watch workflow logs
   - Verify smoke test passes
   - Check production URL responsive

## Health Checks

### Manual Health Check
```bash
# Check availability
curl -I https://tipstream-silk.vercel.app

# Check content
curl https://tipstream-silk.vercel.app | grep TipStream

# Check response time
time curl -s https://tipstream-silk.vercel.app -o /dev/null
```

### View Health Check Results
```bash
gh run list --workflow health-check.yml
gh run view <RUN_ID> --log
```

## Environment Configuration

### Check Environment Status
```bash
# List environments
gh api repos/:owner/:repo/environments

# Get environment details
gh api repos/:owner/:repo/environments/production
```

### Update Environment Secrets
1. Go to Settings > Environments > production
2. Update secret under "Environment secrets"
3. Confirm save

## Performance Monitoring

### Check Vercel Analytics
1. Log in to vercel.com
2. Select TipStream project
3. Click "Analytics" tab
4. Review metrics:
   - Real-time traffic
   - Response times
   - Error rates
   - Geographic data

### Check Core Web Vitals
```bash
# Install Chrome extension: Web Vitals
# Open production URL in Chrome
# Check console for metrics
# Or use: https://web.dev/measure
```

## Common Issues

### Build Failed
```bash
# Check logs
gh run view <RUN_ID> --log | grep -i error

# Test locally
npm ci
npm run build

# Look for: missing deps, TypeScript errors, env vars
```

### Deploy Failed
```bash
# Check deployment logs
vercel logs <deployment-url>

# Or check Vercel dashboard:
# Deployments tab > Select run > Logs
```

### Smoke Test Failed
```bash
# Test URL manually
curl https://tipstream-silk.vercel.app

# Check if URL correct
# Check if "TipStream" text present
# Check response time
```

### Health Check Alert
```bash
# Check GitHub issue created
gh issue list --label "health-check"

# Test manually
curl https://tipstream-silk.vercel.app

# If still failing: check network, Vercel status, or rollback
```

## Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Staging verified
- [ ] Secrets configured
- [ ] Monitoring alerts set
- [ ] Team notified
- [ ] On-call assigned
- [ ] Rollback plan ready

## Emergency Steps

### If Production Broken
1. **Assess severity**: Is it down completely?
2. **Notify team**: Post in Slack #incidents
3. **Check status**: `curl https://tipstream-silk.vercel.app`
4. **Rollback if needed**:
   ```bash
   # Actions > Rollback Deployment > Run workflow
   ```
5. **Monitor recovery**: Watch logs and metrics
6. **Investigate**: Create issue for root cause
7. **Fix and redeploy**: Follow normal process

### If Build Broken
1. **Check build logs**: GitHub Actions tab
2. **Fix code**: Correct issue locally
3. **Test locally**: `npm run build`
4. **Commit and push**: Triggers rebuild
5. **Verify**: Check workflow passes

### If Stuck
1. **Cancel workflow**: GitHub Actions > Run > Cancel
2. **Clear npm cache**: `npm cache clean --force`
3. **Try fresh checkout**: `git checkout main && git pull`
4. **Manual deploy**: Follow Vercel CLI instructions
5. **Ask for help**: Contact maintainers

## Useful Commands

### Git
```bash
git log --oneline main | head -20
git diff main..HEAD
git status
```

### npm
```bash
npm run build
npm run test
npm run test:smoke
npm run lint
```

### curl
```bash
curl -I https://tipstream-silk.vercel.app           # Headers only
curl https://tipstream-silk.vercel.app              # Full response
curl -I https://tipstream-silk.vercel.app -w "%{time_total}"  # With timing
```

### GitHub CLI
```bash
gh run list
gh run view <RUN_ID> --log
gh secret list
gh issue list
```

### Vercel CLI
```bash
vercel ls                  # List deployments
vercel inspect <url>       # Get deployment details
vercel logs <url>          # Get deployment logs
vercel env ls              # List environment variables
```

## Documentation Index

- **DEPLOYMENT_WORKFLOW.md**: Workflow technical details
- **DEPLOYMENT_ENVIRONMENTS.md**: Environment setup
- **SECRETS.md**: Credential management
- **ROLLBACK_PROCEDURES.md**: Incident response
- **DEPLOYMENT_CHECKLIST.md**: Quality gates
- **MONITORING.md**: Observability and alerts
- **DEPLOYMENT_TROUBLESHOOTING.md**: Issue diagnosis
- **BEST_PRACTICES.md**: Standards and conventions
- **QUICK_REFERENCE.md**: This file

## Contact

For urgent issues:
- Post in #incidents Slack channel
- Tag @on-call or @maintainers
- Include error messages and workflow run URL
