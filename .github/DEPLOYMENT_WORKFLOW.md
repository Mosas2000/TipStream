# Deployment Workflow Documentation

This document provides technical details on the automated deployment system.

## Architecture Overview

The deployment system consists of:

1. **Preview Workflow** (.github/workflows/preview-deploy.yml)
   - Triggered on PR events
   - Non-blocking for merges
   - Auto-comments PR with preview URL

2. **Production Workflow** (.github/workflows/production-deploy.yml)
   - Triggered on main branch push
   - Requires environment approval
   - Creates deployment record

3. **Rollback Workflow** (.github/workflows/rollback.yml)
   - Manual trigger via workflow_dispatch
   - Supports both environments
   - Configurable target version

4. **Health Check Workflow** (.github/workflows/health-check.yml)
   - Scheduled every 15 minutes
   - Detects outages and slowdowns
   - Auto-creates incident issues

## Workflow Details

### Preview Deployment (.github/workflows/preview-deploy.yml)

**Trigger**:
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

**Workflow Steps**:

1. **Checkout code**
   ```yaml
   actions/checkout@v4
   ```
   Fetches PR branch for building

2. **Setup Node.js 20**
   ```yaml
   actions/setup-node@v4
   with:
     cache: npm
     cache-dependency-path: frontend/package-lock.json
   ```
   Restores dependencies from npm cache

3. **Install dependencies**
   ```bash
   npm ci
   ```
   Clean install using package-lock.json

4. **Build for preview**
   ```bash
   VITE_NETWORK=mainnet npm run build
   ```
   Optimized build without minification for debugging

5. **Verify build artifacts**
   ```bash
   test -f frontend/dist/index.html
   ```
   Ensures dist/index.html exists

6. **Deploy to Vercel**
   ```yaml
   amondnet/vercel-action@v25
   with:
     vercel-token: VERCEL_TOKEN
     vercel-org-id: VERCEL_ORG_ID
     vercel-project-id: VERCEL_PROJECT_ID
     prod: false
   ```
   Creates preview deployment

7. **Smoke test**
   ```bash
   curl https://<preview-url> | grep TipStream
   ```
   Verifies preview URL is responsive

8. **Comment PR**
   ```yaml
   actions/github-script@v7
   ```
   Posts preview URL to PR conversation

**Output**: Preview URL comment on PR

**Duration**: ~3-4 minutes

### Production Deployment (.github/workflows/production-deploy.yml)

**Trigger**:
```yaml
on:
  push:
    branches: [main]
```

**Environment**: Requires approval from production environment

**Workflow Steps**:

1. **Checkout main branch**
   ```yaml
   actions/checkout@v4
   ```
   Fetches latest main branch code

2. **Setup Node.js 20**
   ```yaml
   actions/setup-node@v4
   with:
     cache: npm
   ```
   Same as preview workflow

3. **Install dependencies**
   ```bash
   npm ci
   ```
   Clean install from lock file

4. **Build for production**
   ```bash
   VITE_NETWORK=mainnet npm run build
   ```
   Production optimized build

5. **Verify build**
   ```bash
   test -f frontend/dist/index.html
   test -f frontend/dist/assets/*.js
   ```
   Ensures JS bundles exist

6. **Deploy to Vercel**
   ```yaml
   amondnet/vercel-action@v25
   with:
     prod: true
   ```
   Production deployment flag set

7. **Smoke test**
   ```bash
   curl https://tipstream-silk.vercel.app | grep TipStream
   ```
   Verifies production is responsive

8. **Create deployment summary**
   ```yaml
   actions/github-script@v7
   ```
   Creates deployment issue with:
   - Deployment URL
   - Commit reference
   - Deployment timestamp
   - Smoke test result

**Output**: Deployment record and summary

**Duration**: ~3-4 minutes

**Environment Requirement**: Manual approval required

### Rollback Workflow (.github/workflows/rollback.yml)

**Trigger**:
```yaml
on:
  workflow_dispatch:
    inputs:
      target-version:
        description: Version or commit to rollback to
        type: string
      environment:
        description: Environment to rollback
        type: choice
        options: [production, preview]
```

**Workflow Steps**:

1. **Checkout target version**
   ```yaml
   actions/checkout@v4
   with:
     ref: ${{ github.event.inputs.target-version }}
   ```
   Checks out specific commit or tag

2. **Setup and build**
   - Same as production workflow
   - Uses target-version build

3. **Verify rollback build**
   - Checks dist/index.html exists
   - Fails if build artifacts missing

4. **Deploy**
   ```yaml
   prod: ${{ github.event.inputs.environment == 'production' }}
   ```
   Sets prod flag based on environment

5. **Smoke test**
   - Tests production URL if rolling back production
   - Tests preview URL if rolling back preview

6. **Create rollback record**
   ```yaml
   actions/github-script@v7
   ```
   Creates GitHub issue documenting:
   - Target version
   - Environment
   - Timestamp
   - Reason (manual trigger)

**Duration**: ~3-4 minutes

### Health Check Workflow (.github/workflows/health-check.yml)

**Trigger**:
```yaml
on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch:
```
Runs every 15 minutes + manual trigger

**Workflow Steps**:

1. **Check availability with retries**
   - 3 attempts with 5-second delays
   - `curl -sf` with timeout
   - Exits on first success

2. **Check content integrity**
   - Greps for "TipStream" string
   - Fails if string missing

3. **Measure response time**
   - Records curl execution time
   - Alerts if > 5 seconds

4. **Check DNS resolution**
   - `nslookup` for domain
   - Verifies DNS working

5. **Create issue on failure**
   ```yaml
   actions/github-script@v7
   ```
   Auto-creates issue labeled:
   - health-check
   - production
   - urgent

**Duration**: ~30 seconds

## Integration with Vercel

### Preview Deployments
- Vercel creates unique URL per PR
- Format: `https://<project>-<pr-number>-<team>.vercel.app`
- Automatically removed after PR closes
- No DNS needed (uses default Vercel domain)

### Production Deployments
- Uses custom domain: `tipstream-silk.vercel.app`
- DNS configured in Vercel settings
- Persists after deployment
- Traffic goes through Vercel CDN

### API Integration
- Uses `amondnet/vercel-action@v25`
- Supports `prod` flag for production
- Reads `VERCEL_TOKEN` for authentication
- Outputs `preview-url` for PR comments

## Environment Variables

### Build Time
```bash
VITE_NETWORK=mainnet       # Network selection
VITE_APP_URL=<url>         # For Vercel deployment
NODE_ENV=production        # Production mode
```

### Runtime
- Configured in Vercel project settings
- Inherited from GitHub environment secrets
- Not visible in workflow logs (masked)

## Secret Variables

All workflows access secrets via GitHub Actions:

```yaml
env:
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

Production environment additionally protects VERCEL_TOKEN.

## Caching Strategy

### npm Dependency Cache
```yaml
cache: npm
cache-dependency-path: frontend/package-lock.json
```

**Benefits**:
- Reduces build time from ~3m to ~1m
- Verifies package-lock.json integrity
- Automatic invalidation on lock file changes

**Cache invalidation**:
- Manual: Delete via GitHub actions settings
- Automatic: When package-lock.json changes

## Error Handling

### Build Failures
- If `npm run build` exits non-zero, workflow fails
- Logs show npm error output
- Deployment is skipped
- GitHub Actions marks run as failed

### Deploy Failures
- If Vercel returns error, workflow fails
- `amondnet/vercel-action` provides error message
- Logs show Vercel API error details

### Test Failures
- If smoke test fails, workflow continues
- Status visible in Actions output
- Issue created if health check fails

## Logs and Debugging

### View Workflow Logs
1. Repository > Actions tab
2. Select specific workflow run
3. Click job to expand logs
4. Search logs with Cmd+F

### Common Log Locations
- Dependencies: "Install dependencies" step
- Build: "Build for X" step
- Deploy: "Deploy to Vercel" step
- Tests: "Smoke test" step

### Retrieve Logs via CLI
```bash
gh run list --workflow preview-deploy.yml
gh run view <RUN_ID> --log
gh run view <RUN_ID> --log > deploy.log
```

## Concurrency and Queuing

### Preview Deployments
- Multiple PRs can deploy in parallel
- No concurrency constraints
- Each PR gets unique URL

### Production Deployments
- Only one production job runs at a time
- Subsequent pushes queue automatically
- GitHub Actions processes queue in order

### Health Checks
- Run independently
- Do not block deployments
- Can run during deployments

## Performance Metrics

### Typical Build Times
- Dependencies: 30-60 seconds (cached)
- Build: 60-90 seconds
- Upload: 10-20 seconds
- Total: 2-3 minutes (without cache misses)

### Typical Deploy Times
- Vercel processing: 30-60 seconds
- DNS/CDN propagation: 0-30 seconds
- Smoke test: 5-10 seconds
- Total: 1-2 minutes

### Total Pipeline Duration
- Preview: 3-4 minutes (start to preview URL comment)
- Production: 4-5 minutes (start to deployment record)
- Rollback: 3-4 minutes (start to verification)

## Future Enhancements

### Potential Improvements
- Canarying deployments (percentage rollout)
- Automated rollback on error spike
- Performance comparison (bundle size diff)
- Visual regression testing
- Component screenshot diffs
- Dependency update automation

### Planned Additions
- Load testing on preview
- Security scanning
- Accessibility testing
- Lighthouse CI integration

## Related Files

- .github/workflows/preview-deploy.yml
- .github/workflows/production-deploy.yml
- .github/workflows/rollback.yml
- .github/workflows/health-check.yml
- .github/DEPLOYMENT_ENVIRONMENTS.md
- .github/SECRETS.md
- .github/ROLLBACK_PROCEDURES.md

## Support

For workflow issues:
1. Check Actions tab logs
2. Verify secrets are configured
3. Ensure branch protection rules match
4. Check Vercel service status
5. Review this documentation
6. Contact maintainers with logs
