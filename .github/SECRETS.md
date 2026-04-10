# Secrets Management and Security

This document provides comprehensive guidance for managing secrets and credentials in the TipStream deployment pipeline.

## Overview

The deployment system requires sensitive credentials for:
- Vercel API access (VERCEL_TOKEN)
- Organization identification (VERCEL_ORG_ID)
- Project targeting (VERCEL_PROJECT_ID)

All secrets are encrypted at rest and in transit by GitHub Actions.

## Secret Types and Purposes

### VERCEL_TOKEN (Personal Access Token)
- **Purpose**: Authenticates with Vercel API for deployments
- **Sensitivity**: Critical - grants deployment access
- **Scope**: Full organization access
- **Rotation**: Every 90 days
- **Compromise Impact**: Complete deployment compromise

### VERCEL_ORG_ID (Organization Identifier)
- **Purpose**: Routes API calls to correct organization
- **Sensitivity**: Low - public identifier
- **Scope**: Organization level
- **Rotation**: Never (static)
- **Compromise Impact**: Minimal if token is secure

### VERCEL_PROJECT_ID (Project Identifier)
- **Purpose**: Routes deployments to correct project
- **Sensitivity**: Low - could be discovered from public deployments
- **Scope**: Project level
- **Rotation**: Never (static, changes only on project recreation)
- **Compromise Impact**: Minimal without token

## Obtaining Credentials

### Step 1: Get VERCEL_TOKEN

1. Log in to https://vercel.com
2. Navigate to Account Settings > Tokens
3. Click "Create" button
4. Token configuration:
   - Name: "TipStream GitHub Actions"
   - Scope: "Full Access"
   - Expiration: "7 days" (optional, for testing before permanent)
5. Copy the token immediately (only shown once)
6. Store in secure location (password manager)

**Security note**: Use dedicated token per repository. Do not share tokens.

### Step 2: Get VERCEL_ORG_ID

For organization accounts:
1. Log in to https://vercel.com
2. Navigate to Team Settings > General
3. Copy the Team ID (format: typically UUID or alphanumeric)

For personal accounts:
- Use "personal" as organization ID, or
- Leave empty if using default scope

### Step 3: Get VERCEL_PROJECT_ID

1. Log in to https://vercel.com
2. Navigate to project "TipStream"
3. Click Settings > General
4. Locate "Project ID"
5. Copy the ID (format: typically alphanumeric)

Alternative method:
```bash
# If you have Vercel CLI installed
vercel project ls
# Find TipStream and copy ID
```

## Adding Secrets to GitHub

### Add to Production Environment (Required)

1. Go to repository Settings
2. Navigate to Environments > production
3. Under "Environment secrets" click "Add secret"
4. Add each secret:
   - Name: VERCEL_TOKEN | Value: [token from step 1]
   - Name: VERCEL_ORG_ID | Value: [org ID from step 2]
   - Name: VERCEL_PROJECT_ID | Value: [project ID from step 3]

### Add to Repository Secrets (Optional)

For preview deployments (if not using environment-specific):
1. Go to Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Add same secrets as above (or subset)

**Recommendation**: Use environment-specific secrets for production, repository secrets for shared use.

## Secret Rotation Procedures

### Regular Rotation (Every 90 Days)

1. **Create new token**:
   ```bash
   # Log in to Vercel
   # Settings > Tokens > Create
   # Store new token securely
   ```

2. **Update GitHub secret**:
   - Go to Settings > Environments > production
   - Find VERCEL_TOKEN
   - Click "Update"
   - Paste new token
   - Save

3. **Revoke old token**:
   - Log in to Vercel
   - Settings > Tokens
   - Find old token
   - Click "Remove"

4. **Document rotation**:
   - Log rotation in change management system
   - Record date, actor, reason
   - Update this guide if procedures changed

### Emergency Rotation (Suspected Compromise)

1. **Immediate actions**:
   - Note current time and date
   - Prepare new token before revoking old

2. **Revoke compromised token**:
   - Log in to Vercel immediately
   - Settings > Tokens
   - Remove compromised token
   - Review recent deployments for unauthorized activity

3. **Generate new token**:
   - Create new token with same scope
   - Store securely

4. **Update GitHub secret**:
   - Go to Settings > Environments > production
   - Update VERCEL_TOKEN immediately
   - Verify preview environment also uses correct token

5. **Audit trail**:
   - Review GitHub Actions logs for suspicious activity
   - Check Vercel deployment logs
   - Review commit history
   - Document incident in security logs

6. **Notify team**:
   - Inform maintainers of rotation
   - Update access documentation
   - Review and revoke other unnecessary credentials

## Security Best Practices

### Do's
- ✓ Use unique tokens per environment/repository
- ✓ Rotate tokens every 90 days
- ✓ Store tokens in password manager
- ✓ Use environment-specific secrets in GitHub
- ✓ Enable branch protection for main branch
- ✓ Require approvals for production deployments
- ✓ Log all secret access and rotations
- ✓ Verify token scope before deployment
- ✓ Monitor for unauthorized deployments

### Don'ts
- ✗ Hardcode secrets in code or config files
- ✗ Commit .env files with real secrets
- ✗ Share tokens in Slack, email, or chat
- ✗ Use personal tokens for automated systems
- ✗ Reuse tokens across multiple repositories
- ✗ Leave tokens in git history (even after deletion)
- ✗ Use overly permissive token scopes
- ✗ Ignore token rotation reminders
- ✗ Log secrets in GitHub Actions output

## Preventing Secret Leaks

### Pre-commit Checks
1. Enable git hooks to prevent secret commits:
   ```bash
   # Use tool like git-secrets or detect-secrets
   npm install detect-secrets --save-dev
   ```

2. Configure protected patterns:
   - Vercel tokens (start with specific prefix)
   - API keys and credentials
   - Private keys

### GitHub Secret Scanning
1. Repository Settings > Security > Secret scanning
2. Enable "Push protection" for enhanced detection
3. Review and resolve alerts automatically

### Code Review
- Reviewers check for hardcoded secrets
- Use automated secret scanning tools
- Never approve PRs containing exposed credentials

## Handling Exposed Secrets

If a secret appears in a commit or PR:

1. **Immediate actions** (within 5 minutes):
   - Do not merge or deploy
   - Revoke compromised token immediately
   - Create new token and update GitHub

2. **Remediation** (within 30 minutes):
   - Force push to rewrite git history
   - Or create new branch without secret
   - Delete PR without merging
   - Document incident

3. **Prevention** (same day):
   - Configure secret scanning
   - Add pre-commit hooks
   - Update team training

## Monitoring and Auditing

### Weekly Checks
- Review recent GitHub Actions logs
- Verify no unexpected deployments
- Check Vercel deployment history

### Monthly Audit
- List active secrets in GitHub
- Verify only production env has critical secrets
- Review access logs for unusual patterns
- Confirm rotation schedule compliance

### Quarterly Review
- Re-evaluate secret scope and necessity
- Document any manual deployments
- Update procedures based on incidents
- Train team on secret management

## Tools and Integration

### Local Secret Management
- **1Password, LastPass, or similar**: Store tokens securely
- **git-secrets**: Prevent accidental commits
- **detect-secrets**: Scan codebase for exposed secrets
- **vercel CLI**: Authenticate locally without hardcoding

### CI/CD Integration
- GitHub Actions: Native secrets management
- Secrets masking: Automatic in logs
- Environment separation: Production vs preview

## Related Documentation

- See DEPLOYMENT_ENVIRONMENTS.md for environment setup
- See DEPLOYMENT_WORKFLOW.md for workflow details
- See github.com/github/super-linter for secret scanning setup
- See Vercel documentation: https://vercel.com/docs/concepts/deployments/overview

## Support and Questions

For issues with secrets or deployments:
1. Check GitHub Actions logs for specific errors
2. Verify secret names match exactly (case-sensitive)
3. Ensure token has appropriate scope
4. Contact repository maintainers
5. Never share actual tokens when reporting issues
