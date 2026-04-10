# GitHub Actions Debugging Guide

Advanced troubleshooting for workflow issues.

## Enable Debug Logging

### Method 1: Repository Secrets
1. Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Name: `ACTIONS_STEP_DEBUG`
4. Value: `true`
5. Re-run workflow

### Method 2: Workflow File
```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

## Log Analysis

### Find Specific Steps
```bash
gh run view <RUN_ID> --log | grep "##\[group\]Step"
```

### Extract Step Logs
```bash
gh run view <RUN_ID> --log > full.log
grep "npm install" full.log
```

### Search for Errors
```bash
gh run view <RUN_ID> --log | grep -i error
gh run view <RUN_ID> --log | grep -i fail
gh run view <RUN_ID> --log | grep -i "exit code"
```

## Common Log Patterns

### Step Started
```
##[group]Run npm install
Run npm install
shell: /bin/bash -e {0}
```

### Step Output
```
npm notice
npm notice [package information]
up to date
```

### Step Completed
```
##[endgroup]
```

### Error Format
```
##[error]Error message here
Error: Problem description
```

## Environment Inspection

### Add Debug Step
```yaml
- name: Debug environment
  run: |
    echo "Node version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "Current directory: $(pwd)"
    echo "Directory contents:"
    ls -la
    echo "Environment variables:"
    env | sort | head -20
```

### Check Available Files
```bash
- name: Verify build artifacts
  run: |
    echo "Checking for build artifacts..."
    if [ -f "frontend/dist/index.html" ]; then
       index.html found"echo "
      ls -lh frontend/dist/index.html
    else
       index.html NOT found"echo "
      echo "Contents of dist:"
      ls -la frontend/dist/ || echo "dist directory not found"
    fi
```

## Artifact Inspection

### Upload Artifacts for Debugging
```yaml
- name: Upload artifacts on failure
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: build-artifacts
    path: |
      frontend/dist/
      node_modules/.package-lock.json
```

### Download Artifacts
```bash
gh run download <RUN_ID> -n build-artifacts
ls -R build-artifacts/
```

## Testing Locally

### Simulate Workflow Environment
```bash
# Use act to run workflows locally
# https://github.com/nektos/act
brew install act

# Run specific workflow
act -j build

# Run with debug
act -j build -v
```

### Manual Reproduction
```bash
# Checkout same branch as workflow
git checkout <branch>

# Run same commands as workflow
npm ci
npm run build
npm run test:smoke
```

## Workflow Debugging Tips

### Add Timestamps
```yaml
- name: Build
  run: |
    echo "Build started at: $(date)"
    npm run build
    echo "Build completed at: $(date)"
```

### Check Previous Steps
```yaml
- name: Verify previous step
  if: success()
  run: |
    if [ -f "frontend/dist/index.html" ]; then
      echo "Previous build succeeded"
    else
      echo "Previous build failed - dist missing"
      exit 1
    fi
```

### Conditional Execution
```yaml
- name: Debug on failure
  if: failure()
  run: |
    echo "Workflow failed - debugging info:"
    npm run build --verbose
    npm list
```

## CI/CD Performance

### Measure Step Duration
```yaml
- name: Performance timing
  run: |
    START=$(date +%s)
    npm ci
    npm run build
    END=$(date +%s)
    echo "Total time: $((END - START)) seconds"
```

### Cache Analysis
```yaml
- name: Check cache
  run: |
    echo "Cache hit: ${{ steps.setup.outputs.cache-hit }}"
    echo "npm cache:"
    npm cache verify
```

## Secret Debugging

### Verify Secret Is Set
```yaml
- name: Verify secret
  run: |
    if [ -z "${{ secrets.VERCEL_TOKEN }}" ]; then
      echo "ERROR: VERCEL_TOKEN not set"
      exit 1
    else
      echo "SUCCESS: VERCEL_TOKEN is configured"
      # DO NOT ECHO SECRET VALUE
    fi
```

### Token Validation
```yaml
- name: Validate token format
  env:
    TOKEN: ${{ secrets.VERCEL_TOKEN }}
  run: |
    if [[ ${#TOKEN} -lt 10 ]]; then
      echo "ERROR: Token appears invalid (too short)"
      exit 1
    fi
```

## Network Debugging

### Test Connectivity
```yaml
- name: Test network
  run: |
    echo "Testing DNS resolution:"
    nslookup github.com
    
    echo "Testing npm registry:"
    curl -s https://registry.npmjs.org/ | head -c 100
    
    echo "Testing Vercel API:"
    curl -s https://api.vercel.com/v2/version
```

### Proxy/Firewall Testing
```bash
# If npm install fails:
npm config get registry
curl https://registry.npmjs.org/

# If Vercel deploy fails:
curl -I https://api.vercel.com
```

## Job Context Debugging

### Inspect Context
```yaml
- name: Dump context
  run: |
    echo "GitHub context:"
    echo "${{ toJson(github) }}"
    
    echo "Job status:"
    echo "Status: ${{ job.status }}"
```

## Workflow Validation

### Validate Syntax
```bash
# Check workflow YAML syntax
yamllint .github/workflows/preview-deploy.yml

# Or use GitHub CLI
gh workflow list
```

### Test Workflow Locally
```bash
# Using act
act -l  # List available workflows
act --list  # List available jobs

# Run specific job with debug
act -j deploy-job -v
```

## Common Debug Scenarios

### Scenario: npm install hangs
```bash
# Add timeout and verbose logging
- run: |
    npm ci --verbose --no-optional --loglevel=verbose \
      --fetch-timeout=60000 --fetch-retry-mintimeout=20000 \
      --fetch-retry-maxtimeout=120000
```

### Scenario: Build succeeds but no artifacts
```bash
- name: Verify build
  run: |
    echo "Checking for build output..."
    find . -name "dist" -type d
    find . -name "*.html" -path "*/dist/*"
    du -sh frontend/dist/
```

### Scenario: Vercel deploy fails silently
```bash
- name: Deploy with debug
  run: |
    npm install -g vercel
    vercel deploy --prod --token=${{ secrets.VERCEL_TOKEN }} \
      --confirm --verbose 2>&1 | tee deploy.log
    cat deploy.log
```

## Monitoring Workflow Health

### Check Workflow Success Rate
```bash
gh run list --workflow preview-deploy.yml --limit 50 | \
  awk '{print $7}' | sort | uniq -c
```

### Get Failed Runs
```bash
gh run list --workflow preview-deploy.yml --status failure
```

### View Specific Failure
```bash
gh run view <FAILED_RUN_ID> --log | tail -50
```

## Incident Investigation

### Timeline Creation
```bash
# Get run timestamps
gh run list --workflow preview-deploy.yml --limit 10

# Compare with git commits
git log --oneline --since="2024-01-01" --until="2024-01-02"

# Create timeline of events
```

### Root Cause Analysis
1. **When did it start?** Check run history
2. **What changed?** Check commits/PRs merged
3. **What failed?** Check logs and output
4. **Why failed?** Trace root cause
5. **How to prevent?** Implement safeguard

## Resources

- GitHub Actions documentation: https://docs.github.com/en/actions
- Workflow syntax reference: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- act tool: https://github.com/nektos/act
- yamllint: https://www.yamllint.com/

## Quick Commands Reference

```bash
# List recent runs
gh run list --limit 10

# View run logs
gh run view <RUN_ID> --log

# View specific job
gh run view <RUN_ID> -j <JOB_NAME> --log

# Cancel run
gh run cancel <RUN_ID>

# Rerun failed jobs
gh run rerun <RUN_ID> --failed

# Download artifacts
gh run download <RUN_ID> -n <ARTIFACT_NAME>

# Watch in real time
gh run watch <RUN_ID>
```

## Support

For workflow debugging:
1. Enable debug logging and rerun
2. Review logs line by line
3. Reproduce locally with same commands
4. Check dependencies and versions match
5. Verify environment variables configured
6. Consult this guide for specific issues
7. Ask team members if stuck
