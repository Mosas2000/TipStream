# Deployment Troubleshooting Guide

This guide helps diagnose and fix common deployment issues.

## Build Failures

### Symptom: npm install fails

**Error Messages**:
- "npm ERR! code ERESOLVE"
- "npm ERR! ERESOLVE unable to resolve dependency tree"
- "npm ERR! peer dep missing"

**Investigation**:
```bash
# Check Node version
node --version

# Check npm version
npm --version

# Try clean install locally
rm -rf node_modules package-lock.json
npm install
```

**Solutions**:
1. **Update package-lock.json**:
   ```bash
   npm update
   git add package-lock.json
   git commit -m "Update dependencies"
   git push
   ```

2. **Use npm install with legacy flag** (temporary):
   - Update workflow to use: `npm install --legacy-peer-deps`
   - Diagnose root cause separately

3. **Upgrade Node version**:
   - Check if Node.js 20 is latest stable
   - Verify all dependencies support Node 20
   - Update workflow Node version if needed

### Symptom: Build exits with non-zero code

**Error Messages**:
- "npm ERR! code 1"
- "Exit code 1"
- Command output shows error

**Investigation**:
1. View full build logs in GitHub Actions
2. Search for error keyword (Error, fail, exception)
3. Check if errors started with recent changes
4. Try building locally with same steps

**Common Causes**:
- Missing environment variables
- TypeScript compilation errors
- Linting errors (if linter runs)
- Missing dependencies
- Incompatible dependency versions

**Solutions**:
```bash
# Build locally first
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Check for linting errors
npm run lint

# Verify all imports exist
npm run check-imports
```

### Symptom: Build succeeds but dist is empty

**Investigation**:
```bash
# Check if dist folder created
ls -la frontend/dist/

# Check if index.html exists
ls -la frontend/dist/index.html

# Check build output size
du -sh frontend/dist/
```

**Solutions**:
1. Verify build script in package.json:
   ```json
   {
     "scripts": {
       "build": "vite build"
     }
   }
   ```

2. Check vite.config.js for output configuration:
   ```javascript
   export default {
     build: {
       outDir: 'dist'
     }
   }
   ```

3. Verify source files exist:
   ```bash
   ls -la frontend/src/
   ```

## Vercel Deployment Failures

### Symptom: Deployment fails on Vercel

**Error Messages**:
- "Deployment error"
- "Invalid configuration"
- "Build failed on Vercel"

**Investigation**:
1. Check GitHub Actions logs for error details
2. Log in to Vercel dashboard
3. Check deployment logs in project
4. Check build console in Vercel

**Common Causes**:
- Invalid environment variables
- Secret not found
- Node version mismatch
- Resource limits exceeded
- Filesystem permission issues

**Solutions**:
1. **Verify Vercel secrets**:
   - Check VERCEL_TOKEN is valid
   - Check VERCEL_ORG_ID matches token's org
   - Check VERCEL_PROJECT_ID exists in org

2. **Check Vercel project settings**:
   - Log in to vercel.com
   - Select TipStream project
   - Check Settings > Build & Development
   - Verify build command matches: `npm run build`
   - Verify output directory: `frontend/dist`

3. **Verify node version**:
   - Vercel project > Settings
   - Check "Node.js Version"
   - Should match workflow (20.x)

4. **Check environment configuration**:
   - Variables > Environment Variables
   - Verify VITE_* variables are set
   - Check Vercel-specific configuration

## Smoke Test Failures

### Symptom: Smoke test fails

**Error Messages**:
- "grep: no match"
- "Command exited with code 1"
- "curl: (7) Failed to connect"

**Investigation**:
```bash
# Test URL directly
curl -I https://tipstream-silk.vercel.app

# Check response
curl https://tipstream-silk.vercel.app | head -20

# Verify grep pattern
curl https://tipstream-silk.vercel.app | grep -i tipstream
```

**Common Causes**:
- Deployment not complete (too fast)
- Wrong URL in smoke test
- Application not including expected string
- Proxy/firewall blocking access

**Solutions**:
1. **Add retry delay in workflow**:
   ```yaml
   - name: Wait for deployment
     run: sleep 10
   
   - name: Smoke test
     run: curl -f https://tipstream-silk.vercel.app | grep TipStream
   ```

2. **Verify deployment URL**:
   - Check preview-url output from Vercel action
   - Match URL in smoke test exactly
   - Check for typos or protocol issues

3. **Update smoke test pattern**:
   - Find string always present in app
   - Could be: "TipStream", "<!DOCTYPE", etc
   - Test locally: `curl https://tipstream-silk.vercel.app | grep "pattern"`

4. **Check network connectivity**:
   - Verify runner can reach internet
   - Check firewall/proxy rules
   - Test with simple curl to Google

## Preview Deployment Issues

### Symptom: Preview URL not posted to PR

**Investigation**:
1. Check GitHub Actions workflow logs
2. Look for "Comment PR" step output
3. Verify PR comment section manually
4. Check if workflow completed successfully

**Common Causes**:
- Workflow failed before comment step
- Preview URL not generated by Vercel action
- GitHub token missing permissions
- Comment action failed silently

**Solutions**:
1. **Verify workflow completion**:
   - Check if "Smoke test" step passed
   - Verify "Comment PR" step ran

2. **Check Vercel action output**:
   - Add debug logging: `set -x`
   - Check preview-url variable
   - Verify URL format

3. **Verify GitHub permissions**:
   - Workflow file uses default GITHUB_TOKEN
   - Token should have PR comment permissions
   - Check repository settings for token scope

### Symptom: Preview environment bloated/slow

**Investigation**:
```bash
# Check bundle size
ls -lh frontend/dist/assets/

# Compare to production
# Check if large files included
```

**Solutions**:
1. **Remove debug code**:
   - Strip sourcemaps (already done in production)
   - Remove console.log statements
   - Remove unused dependencies

2. **Optimize bundle**:
   - Review vite.config.js
   - Check for unused imports
   - Consider code splitting

## Production Deployment Issues

### Symptom: Production deployment hangs

**Investigation**:
1. Check GitHub Actions logs for stuck step
2. Check Vercel deployment status
3. Monitor for timeout errors

**Solutions**:
1. **Increase workflow timeout**:
   ```yaml
   jobs:
     deploy:
       timeout-minutes: 20
   ```

2. **Cancel and retry**:
   - Click "Cancel" in GitHub Actions
   - Wait for cancellation
   - Manually re-run workflow

3. **Check Vercel quotas**:
   - Log in to vercel.com
   - Settings > Usage
   - Check if quota exceeded

### Symptom: Production deployment succeeds but site broken

**Investigation**:
```bash
# Check if page loads
curl https://tipstream-silk.vercel.app

# Check HTTP status
curl -I https://tipstream-silk.vercel.app

# Check content
curl https://tipstream-silk.vercel.app | grep -i error
```

**Solutions**:
1. **Verify content served correctly**:
   - Check index.html exists on Vercel
   - Check CSS/JS files accessible
   - Verify no 404 errors

2. **Check Vercel cache**:
   - Vercel project > Deployments
   - Select recent deployment
   - Click "Inspect cache"

3. **Clear cache and redeploy**:
   - Vercel project > Settings > Git
   - Click "Clear cache"
   - Redeploy by pushing to main

4. **Rollback if needed**:
   - Follow ROLLBACK_PROCEDURES.md
   - Run rollback workflow
   - Deploy fix after investigation

## Health Check Issues

### Symptom: Health check reports issues but site works

**Investigation**:
1. Manually test URL from multiple locations
2. Check GitHub health check logs
3. Verify health check is testing correct endpoint

**Common Causes**:
- Network issue from GitHub runner
- Temporary service degradation
- Health check too strict

**Solutions**:
1. **Add retries to health check**:
   - Already implemented (3 retries with 5s delay)
   - Check if all retries failing

2. **Adjust timeout**:
   - Increase timeout in health-check.yml if needed
   - Some endpoints legitimately slow

3. **Update check pattern**:
   - Verify "TipStream" is actually present
   - Try manual curl from runner

## Secret and Environment Issues

### Symptom: Deployment fails with "Token error"

**Investigation**:
```bash
# Cannot test directly (secret), but verify:
# 1. Secret exists in GitHub
# 2. Secret has correct name (case-sensitive)
# 3. Secret assigned to correct environment
```

**Solutions**:
1. **Check secret configuration**:
   - Go to Settings > Environments > production
   - Verify VERCEL_TOKEN is listed
   - Check spelling exactly

2. **Rotate secret**:
   - Follow SECRETS.md procedures
   - Create new Vercel token
   - Update GitHub secret

3. **Verify environment**:
   - Check job uses: `environment: production`
   - Check environment exists in GitHub

### Symptom: Build env variables not set

**Investigation**:
1. Check build logs for env variable values
2. Verify app code reads from env
3. Check if env var names match

**Solutions**:
1. **Add debug logging**:
   ```yaml
   - name: Debug env
     run: |
       echo "VITE_NETWORK=$VITE_NETWORK"
       echo "VITE_APP_URL=$VITE_APP_URL"
   ```

2. **Set in workflow**:
   ```yaml
   - name: Build
     env:
       VITE_NETWORK: mainnet
       VITE_APP_URL: https://tipstream-silk.vercel.app
     run: npm run build
   ```

3. **Set in Vercel project**:
   - Vercel dashboard > Settings > Environment Variables
   - Add VITE_* variables
   - Trigger redeploy

## Git and Merge Issues

### Symptom: Deployment not triggered after merge

**Investigation**:
1. Check if commit reached main branch
2. Verify branch protection rules
3. Check if workflow file changed

**Solutions**:
1. **Verify commit on main**:
   ```bash
   git log main | head -5
   ```

2. **Manually trigger workflow**:
   - Actions tab > Select workflow
   - Click "Run workflow" button
   - Confirm execution

3. **Check branch protection**:
   - Settings > Branches > main
   - Verify rules allow push

## Network and Connectivity

### Symptom: "Cannot reach registry" or DNS errors

**Investigation**:
1. Check npm registry status
2. Check network connectivity from runner
3. Check for firewall/proxy issues

**Solutions**:
1. **Try retry**:
   - GitHub Actions automatically retries
   - Wait for automatic retry

2. **Clear npm cache**:
   - Add step: `npm cache clean --force`
   - Remove package-lock.json and retry

3. **Use different registry** (temporary):
   ```bash
   npm install --registry https://registry.npmjs.org/
   ```

## General Troubleshooting Steps

1. **Reproduce locally**:
   ```bash
   git checkout <branch>
   npm ci
   npm run build
   npm run test
   ```

2. **Check logs carefully**:
   - Read full error message
   - Look for line numbers
   - Search for keywords: error, failed, invalid

3. **Compare to working deployment**:
   - Find last successful deployment
   - Compare code changes
   - Check dependency changes

4. **Isolate changes**:
   - Revert recent changes one by one
   - Test after each revert
   - Identify problematic change

5. **Ask for help**:
   - Share full logs with team
   - Include workflow steps and environment
   - Share recent changes
   - Share error messages exactly

## Debugging Workflows

### Enable debug logging
```yaml
# Add at top of workflow
env:
  ACTIONS_STEP_DEBUG: true
```

### Add custom logging
```bash
set -x  # Echo all commands
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
```

### Save artifacts for inspection
```yaml
- name: Save build artifacts
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: build-output
    path: frontend/dist/
```

## Related Documentation

- See DEPLOYMENT_WORKFLOW.md for workflow details
- See DEPLOYMENT_ENVIRONMENTS.md for setup
- See SECRETS.md for credential issues
- See ROLLBACK_PROCEDURES.md for emergency recovery
- See MONITORING.md for observability

## Support

For unresolved issues:
1. Document steps to reproduce
2. Share full error messages and logs
3. Include workflow run URL
4. Contact maintainers with details
5. Create issue if broader problem
