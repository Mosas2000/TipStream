# CI/CD Configuration Management

Managing and updating deployment configuration.

## Environment Variables

### Preview Environment Variables
Pre-deploy:
```bash
export VITE_NETWORK=mainnet
export VITE_APP_URL=<preview-url>
```

### Production Environment Variables
Pre-deploy in Vercel:
```bash
VITE_NETWORK=mainnet
VITE_APP_URL=https://tipstream-silk.vercel.app
```

### Adding New Variables

1. **In workflow file**:
   ```yaml
   - name: Build
     env:
       VITE_NETWORK: mainnet
       NEW_VAR: value
     run: npm run build
   ```

2. **In Vercel project**:
   - Log in to vercel.com
   - Select TipStream project
   - Settings > Environment Variables
   - Add variable with scope (Production/Preview/Development)

3. **In application code**:
   ```javascript
   const network = import.meta.env.VITE_NETWORK;
   const newValue = import.meta.env.VITE_NEW_VAR;
   ```

## Build Configuration

### Vite Configuration (frontend/vite.config.js)
```javascript
export default {
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,  // Disable in production
  }
}
```

### npm Build Script (frontend/package.json)
```json
{
  "scripts": {
    "build": "vite build",
    "build:staging": "vite build --mode staging"
  }
}
```

### Node Version
- Workflow requirement: Node 20 (specified in actions/setup-node@v4)
- Package manager: npm (required for package-lock.json)
- Minimum supported Node: 16 (for compatibility)

## Branch Configuration

### Branch Protection Rules (main)

**Require status checks to pass**:
- `preview-deploy` job must pass
- `production-deploy` job must pass

**Restrict who can push**:
- Only maintainers can push to main
- Enforce for administrators

**Require code review**:
- At least 1 approval required
- Dismiss stale reviews when new commits pushed

**Require branches to be up to date**:
- Enable to require latest main branch

### Bypass Restrictions
Only in emergency situations:
- Maintainers can temporarily bypass
- Must document reason in issue
- Create post-mortem after incident

## Workflow Parameters

### Triggers Configuration

**Preview deployment trigger**:
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```
Triggers on any PR event (safe - non-blocking)

**Production deployment trigger**:
```yaml
on:
  push:
    branches: [main]
```
Triggers on any push to main (after PR merge)

**Health check trigger**:
```yaml
on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:         # Manual trigger
```

### Cron Schedule Reference
```
Field      Allowed values
-----      ------
minute     0-59
hour       0-23
day        1-31
month      1-12
day week   0-6 (0 = Sunday)

Examples:
*/15 * * * *     = Every 15 minutes
0 */6 * * *      = Every 6 hours
0 10 * * 1       = 10am Monday
0 0 1 1 *        = Midnight Jan 1
```

## Timeout Configuration

### Workflow Timeouts
```yaml
jobs:
  deploy:
    timeout-minutes: 20
```
- Default: 6 hours per workflow
- Recommended: 20 minutes for deployment
- Useful for hanging operations

### Step Timeout (not directly supported)
Use shell timeout instead:
```bash
timeout 5m npm install
```

## Artifact Management

### Build Artifacts
```yaml
- uses: actions/upload-artifact@v3
  with:
    name: build-output
    path: frontend/dist/
    retention-days: 7  # Keep for 7 days
```

### Cache Configuration
```yaml
- uses: actions/setup-node@v4
  with:
    cache: npm
    cache-dependency-path: frontend/package-lock.json
```

**Cache invalidation**:
- Automatic when package-lock.json changes
- Manual clear via GitHub Actions settings
- Size limit: 5GB per repo

## Status Check Configuration

### Required Status Checks
For merging to main:
1. `preview` workflow job
2. `production` deployment job

### Optional Status Checks
(informational only):
- Linting job (if added)
- Test coverage (if added)
- Security scan (if added)

### Adding New Status Check
1. Create new workflow step
2. Go to Settings > Branches > main
3. Add to "Require status checks to pass"
4. Save and apply

## Secret Configuration

### Secret Rotation Schedule
- VERCEL_TOKEN: Every 90 days
- VERCEL_ORG_ID: Never (static)
- VERCEL_PROJECT_ID: Never (static)

### Emergency Rotation
Follow SECRETS.md procedures:
1. Revoke compromised token immediately
2. Generate new token
3. Update GitHub secret
4. Verify next deployment succeeds

### Secret Scope
- Repository secrets: Available to all workflows
- Environment secrets: Only for specific environment
- Protected secrets: Masked in logs automatically

## Notification Configuration

### Build Notifications
Currently: GitHub Actions UI + PR comments
Future: Could add Slack integration

### Deployment Notifications
Currently: GitHub issue creation on failure
Future: Email/Slack notifications

### Alert Thresholds
- Error rate > 5%: Create GitHub issue
- Uptime < 99%: Create GitHub issue with "urgent" label
- Response time > 5s: Create GitHub issue

## Approval Workflow

### Production Approval
1. Developer pushes to main
2. GitHub Actions triggers production job
3. Workflow waits for environment approval
4. Approver reviews deployment
5. Approver confirms or rejects
6. Workflow continues on approval

### Approvers Configuration
Settings > Environments > production > Required reviewers

### Approval Timeout
- Default: 7 days before expiration
- Workflow paused during review
- Can be cancelled if needed

## Disaster Recovery Configuration

### Rollback Triggers
1. **Manual rollback**: Actions > Rollback Deployment
2. **Automatic rollback**: Could be added (not currently implemented)
3. **Git-based rollback**: Push revert commit to main

### Recovery Time Target (RTO)
- Manual rollback: 5-10 minutes
- Git-based rollback: 10-15 minutes
- Full root cause investigation: Hours

### Recovery Point Objective (RPO)
- Preserve all commits: Full git history
- Preserve deployments: Full Vercel history
- Data: No application-level rollback (stateless frontend)

## Compliance and Auditing

### Audit Trail
- GitHub Actions logs: 90 days retention
- GitHub audit log: 90 days default
- Deployment records: Via GitHub issues
- Secret access: Available in GitHub Enterprise

### Compliance Requirements
- Document deployments: Done via issues
- Approve changes: Production approval workflow
- Restrict access: Environment-based secrets
- Disable anonymous deployments: N/A (CI/CD only)

### Export Logs
```bash
gh api repos/:owner/:repo/actions/runs --paginate | \
  jq '.runs[] | select(.status=="completed")' > runs.json
```

## Performance Tuning

### Build Optimization
- npm cache: Automatic caching enabled
- Dependency tree: Optimized via npm ci
- Network: Use CDN for downloads

### Deploy Optimization
- Parallel steps: Not applicable (sequential deploy)
- Vercel optimization: Built-in compression
- Cache strategy: Configured in vite.config.js

### Monitoring Build Time
```bash
gh run view <RUN_ID> --log | grep -i "time\|duration"
```

## Version Control for Configuration

### Configuration as Code
- All workflows in .github/workflows/
- All docs in .github/*.md
- Examples in .github/*.example.*
- Committed to git with code

### Change Management
1. Create PR with config changes
2. Test in preview environment
3. Get review approval
4. Merge to main
5. Applied immediately to next deployment

### Rollback Configuration
- Revert commit if config change breaks deployments
- Works same as code rollback
- No separate configuration rollback needed

## Backup and Recovery

### Workflow Backup
```bash
git clone https://github.com/org/tipstream
cd tipstream
tar czf workflows-backup.tar.gz .github/workflows/
```

### Configuration Backup
```bash
# Export Vercel settings
vercel env ls > env-backup.txt
gh api repos/:owner/:repo/environments > envs-backup.json
```

### Recovery Procedure
1. Restore .github/workflows from backup
2. Commit and push to restore workflows
3. Manually re-enter secrets in GitHub
4. Verify by running health check

## Related Documentation

- See DEPLOYMENT_WORKFLOW.md for workflow details
- See SECRETS.md for credential management
- See DEPLOYMENT_ENVIRONMENTS.md for environment setup
- See BEST_PRACTICES.md for standards

## Troubleshooting Configuration Issues

### Config Not Applied
- Commit must be on main branch
- Workflow files must have valid YAML
- All required fields must be present

### Variable Not Set
- Check environment secret is set
- Check variable name matches exactly (case-sensitive)
- Verify scope is correct (repo vs environment)

### Approval Not Triggering
- Check environment approval is enabled
- Check required reviewers are configured
- Check reviewer has necessary permissions

## Support

For configuration issues:
1. Check this documentation
2. Review affected workflow file
3. Verify YAML syntax (yamllint)
4. Test locally with act
5. Contact maintainers if persistent
