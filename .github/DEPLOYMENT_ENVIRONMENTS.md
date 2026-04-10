# GitHub Actions Deployment Environments

This document describes the configuration and usage of GitHub Actions environments for the TipStream deployment workflows.

## Environment Structure

The deployment system uses two main GitHub environments:

### Preview Environment
- **Purpose**: Automatic preview deployments for pull requests
- **Trigger**: PR open, synchronize, or reopen events
- **Approval**: None (automatic)
- **Retention**: 7 days default from Vercel
- **Domain**: Vercel preview subdomain (auto-generated)

### Production Environment
- **Purpose**: Production deployments for main branch
- **Trigger**: Push to main after successful build
- **Approval**: Required (branch protection rule enforced)
- **Retention**: Persistent
- **Domain**: tipstream-silk.vercel.app (configured in Vercel)

## Secrets Configuration

Both environments require the following secrets to be configured:

### Required Secrets

1. **VERCEL_TOKEN**
   - Type: Personal Access Token
   - Source: Vercel account settings
   - Scope: Full access to organization
   - Used by: All deployment workflows
   - Rotation: Every 90 days recommended

2. **VERCEL_ORG_ID**
   - Type: Organization identifier
   - Source: Vercel team settings
   - Format: UUID
   - Used by: scope parameter in deployments
   - Rotation: Not required (static identifier)

3. **VERCEL_PROJECT_ID**
   - Type: Project identifier
   - Source: Vercel project settings
   - Format: UUID
   - Used by: Deployment targeting
   - Rotation: Not required (static identifier)

## Setup Instructions

### 1. Configure GitHub Environments

Navigate to repository settings and create two environments:

#### Environment: preview
```
Settings > Environments > New environment > preview
- No approval required
- No required reviewers
```

#### Environment: production
```
Settings > Environments > New environment > production
- Require approval before deployment: checked
- Restrict who can trigger a deployment: Teams or individuals (select maintainers)
```

### 2. Add Secrets to Production Environment

1. Go to Settings > Environments > production
2. Add the following secrets:
   - VERCEL_TOKEN: [personal access token]
   - VERCEL_ORG_ID: [org id]
   - VERCEL_PROJECT_ID: [project id]

### 3. Obtain Vercel Credentials

#### Get VERCEL_TOKEN
1. Log in to https://vercel.com
2. Go to Settings > Tokens
3. Create new token with "Full Access"
4. Copy token value

#### Get VERCEL_ORG_ID
1. Log in to https://vercel.com
2. Go to Team Settings (if using organization)
3. Copy Team ID from General section
4. For personal projects: use default personal scope

#### Get VERCEL_PROJECT_ID
1. Log in to https://vercel.com
2. Navigate to project TipStream
3. Go to Settings > General
4. Copy Project ID

### 4. Configure Branch Protection

To enforce approval requirement for production:

1. Go to Settings > Branches
2. Edit protection for main branch
3. Enable: "Require status checks to pass before merging"
4. Add required status checks:
   - deploy (the workflow job name)
5. Enable: "Restrict who can push to matching branches"

## Workflow Triggers

### Preview Deployment
Automatic on:
- Pull request opened
- Pull request synchronized (new commit)
- Pull request reopened after close

Skipped if:
- Workflow file unchanged in PR
- Build fails
- No Node.js changes detected

### Production Deployment
Automatic on:
- Push to main branch
- Only after preview deployment passes
- Only if build verification succeeds

Manual (rollback):
- Workflow dispatch from Actions tab
- Select target version
- Select environment

## Monitoring and Debugging

### View Deployment Status
1. Go to repository home
2. Actions tab > Select workflow
3. View recent runs and logs
4. Click run to see detailed output

### Common Deployment Issues

#### Build Failures
- Check npm dependencies in Actions logs
- Verify Node.js version matches package.json
- Check environment variables in build step

#### Smoke Test Failures
- Verify Vercel deployment completed
- Check URL format matches deployment
- Verify endpoint returns expected content

#### Timeout Issues
- Increase timeout-minutes in workflow if needed
- Check Vercel service status
- Verify network connectivity from runner

### Debug Commands

Pull workflow logs locally:
```bash
gh run list --workflow deploy.yml --limit 10
gh run view <RUN_ID> --log
```

Check Vercel deployment status:
```bash
vercel ls  # List deployments
vercel inspect <URL>  # Get deployment details
```

## Rollback Procedures

### Automatic Rollback (via workflow)
1. Go to Actions tab
2. Select "Rollback Deployment" workflow
3. Click "Run workflow"
4. Enter target version (commit SHA or tag)
5. Select environment
6. Confirm execution

### Manual Rollback
1. Identify last good commit
2. Push hotfix or revert commit to main
3. Wait for automated production deployment
4. Verify with smoke tests

## Access Control

### Approval Requirements
- Production deployments require approval
- Approvers: Maintainers team (configurable)
- Workflow: Deploy on approval automatic after approval

### Secrets Access
- Secrets only available to jobs in appropriate environment
- Preview runs do not have access to production secrets
- All secret access logged in GitHub audit trail

## Maintenance Tasks

### Weekly
- Review deployment logs for errors
- Check Vercel dashboard for quota usage
- Monitor error rates from smoke tests

### Monthly
- Rotate VERCEL_TOKEN (recommended every 90 days)
- Review and update environment approvers
- Audit access logs for unauthorized attempts

### Quarterly
- Verify backup/disaster recovery procedures
- Update DEPLOYMENT_ENVIRONMENTS.md with new practices
- Review and update branch protection rules

## Related Documentation

- See DEPLOYMENT_WORKFLOW.md for workflow details
- See SECRETS.md for secrets management procedures
- See ROLLBACK_PROCEDURES.md for incident response
- See VERCEL_INTEGRATION.md for platform specifics
