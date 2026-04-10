# Deployment Documentation Index

Complete reference for the TipStream deployment system.

## Getting Started

### New Team Members
Start with these documents in order:
1. **QUICK_REFERENCE.md** - Quick lookup for common tasks
2. **DEPLOYMENT_WORKFLOW.md** - Overview of how deployments work
3. **DEPLOYMENT_CHECKLIST.md** - Quality gates for safe releases
4. **ROLLBACK_PROCEDURES.md** - How to recover from issues

### Operators and DevOps Engineers
Use these for operational responsibilities:
1. **DEPLOYMENT_ENVIRONMENTS.md** - Environment setup and config
2. **SECRETS.md** - Credential management
3. **MONITORING.md** - Observability and alerts
4. **DEPLOYMENT_TROUBLESHOOTING.md** - Issue diagnosis

### Incident Response
When something breaks:
1. **QUICK_REFERENCE.md** - Emergency procedures
2. **ROLLBACK_PROCEDURES.md** - Recovery steps
3. **DEPLOYMENT_TROUBLESHOOTING.md** - Diagnosis help
4. **ACTIONS_DEBUGGING.md** - Workflow debugging
5. **MONITORING.md** - Health check procedures

## Document Purposes

### QUICK_REFERENCE.md
- Fast lookup for common tasks
- Cheat sheets and command examples
- Quick emergency procedures
- When: "How do I...?"
- Audience: Everyone

### DEPLOYMENT_WORKFLOW.md
- Technical architecture of workflows
- Step-by-step workflow explanations
- Integration with Vercel
- Performance metrics and timing
- When: "How does this work?"
- Audience: Engineers, DevOps

### DEPLOYMENT_ENVIRONMENTS.md
- GitHub Actions environment setup
- Secret configuration procedures
- Branch protection rules
- Approval workflows
- When: "How do I set up environments?"
- Audience: Admins, DevOps

### SECRETS.md
- Credential lifecycle management
- Token generation and rotation
- Emergency credential revocation
- Security best practices
- When: "How do I manage credentials?"
- Audience: Admins, security team

### ROLLBACK_PROCEDURES.md
- Incident response procedures
- Root cause diagnosis
- Step-by-step recovery
- Prevention strategies
- When: "Production is broken!"
- Audience: On-call engineers

### DEPLOYMENT_CHECKLIST.md
- Quality assurance gates
- Pre-deployment verification
- Post-deployment validation
- Sign-off procedures
- When: "Is this safe to deploy?"
- Audience: Developers, QA, reviewers

### MONITORING.md
- Key metrics and KPIs
- Alert configuration
- Dashboard setup
- Performance optimization
- When: "Why is performance degrading?"
- Audience: DevOps, product

### DEPLOYMENT_TROUBLESHOOTING.md
- Common problem diagnosis
- Step-by-step solutions
- Error message interpretation
- When: "Why did deployment fail?"
- Audience: Engineers, on-call

### BEST_PRACTICES.md
- Team standards and conventions
- Code review guidelines
- Communication procedures
- Continuous improvement
- When: "What's the standard way?"
- Audience: Team leads, senior engineers

### ACTIONS_DEBUGGING.md
- Advanced workflow debugging
- Log analysis techniques
- Local workflow testing
- Performance profiling
- When: "Why is the workflow failing?"
- Audience: DevOps, platform engineers

## Workflow Files Reference

### Production Workflows (Automatic)
- **.github/workflows/preview-deploy.yml** (96 lines)
  - Triggers on PR open/sync/reopen
  - Deploys to Vercel preview environment
  - Comments PR with preview URL
  - No approval needed

- **.github/workflows/production-deploy.yml** (129 lines)
  - Triggers on push to main
  - Deploys to production domain
  - Requires environment approval
  - Creates deployment record

### Operational Workflows
- **.github/workflows/health-check.yml** (77 lines)
  - Runs every 15 minutes
  - Tests uptime and performance
  - Creates issue on failure
  - Fully automated

- **.github/workflows/rollback.yml** (91 lines)
  - Manual trigger only
  - Can target any commit/tag
  - Works for both environments
  - Enables fast incident recovery

## Configuration Files

- **.github/DEPLOYMENT_ENVIRONMENTS.md** - Setup reference
- **.github/environments-config.example.yml** - Template config
- **.github/deployment-verification.js** - Smoke test script

## File Organization

```
.github/
 workflows/
 preview-deploy.yml           # PR preview deployments   
 production-deploy.yml        # Main branch to production   
 health-check.yml             # Scheduled monitoring   
 rollback.yml                 # Manual incident recovery   
 DEPLOYMENT_README.md             # This file
 QUICK_REFERENCE.md               # Cheat sheet
 DEPLOYMENT_WORKFLOW.md           # Technical details
 DEPLOYMENT_ENVIRONMENTS.md       # Setup procedures
 SECRETS.md                       # Credential management
 ROLLBACK_PROCEDURES.md           # Incident response
 DEPLOYMENT_CHECKLIST.md          # Quality gates
 MONITORING.md                    # Observability
 DEPLOYMENT_TROUBLESHOOTING.md   # Issue diagnosis
 BEST_PRACTICES.md                # Standards
 ACTIONS_DEBUGGING.md             # Workflow debugging
 environments-config.example.yml  # Config template
 deployment-verification.js       # Smoke test script
```

## Quick Navigation

### By Task
| Task | Document |
|------|----------|
| Deploy code | QUICK_REFERENCE.md |
| Set up environment | DEPLOYMENT_ENVIRONMENTS.md |
| Manage secrets | SECRETS.md |
| Emergency recovery | ROLLBACK_PROCEDURES.md |
| Pre-deployment check | DEPLOYMENT_CHECKLIST.md |
| Monitor production | MONITORING.md |
| Fix broken deployment | DEPLOYMENT_TROUBLESHOOTING.md |
| Understand workflows | DEPLOYMENT_WORKFLOW.md |
| Debug workflow issue | ACTIONS_DEBUGGING.md |
| Follow best practices | BEST_PRACTICES.md |

### By Audience
| Role | Key Documents |
|------|---------------|
| Developer | QUICK_REFERENCE, BEST_PRACTICES, DEPLOYMENT_CHECKLIST |
| On-Call Engineer | QUICK_REFERENCE, ROLLBACK_PROCEDURES, MONITORING |
| DevOps Engineer | DEPLOYMENT_WORKFLOW, DEPLOYMENT_ENVIRONMENTS, SECRETS, ACTIONS_DEBUGGING |
| SRE/Platform | MONITORING, DEPLOYMENT_TROUBLESHOOTING, ACTIONS_DEBUGGING |
| Engineering Manager | BEST_PRACTICES, MONITORING, ROLLBACK_PROCEDURES |
| Product Manager | MONITORING, DEPLOYMENT_CHECKLIST |

## Key Metrics

### Deployment Performance
- Build time: 1-2 minutes (cached)
- Deploy time: 1-2 minutes
- Total time: 3-4 minutes
- Availability target: > 99.9%
- Error rate target: < 1%

### Quality Gates
- Code coverage: > 70%
- Test passing: 100%
- Performance: P95 < 3 seconds
- Core Web Vitals: All "Good"

## Common Workflows

### Deploying a Feature
1. Create PR with feature branch
2. Wait for preview deployment (3-4 min)
3. Test on preview URL
4. Get code review approval
5. Merge to main
6. Production deploys automatically (5-7 min total)
7. Monitor metrics for 30 minutes
8. Verify no increase in errors

### Emergency Rollback
1. Identify issue in production
2. Get last good commit SHA
3. Go to Actions > Rollback Deployment
4. Enter commit SHA and "production"
5. Wait for rollback to complete (3-4 min)
6. Verify smoke test passes
7. Monitor production URL
8. Create issue for root cause

### Rotating Secrets
1. Generate new token in Vercel
2. Update GitHub secret via Settings
3. Revoke old token in Vercel
4. Document rotation date
5. Confirm new token works on next deploy

### Investigating Failed Deployment
1. Check GitHub Actions logs
2. Look for error message in logs
3. Check DEPLOYMENT_TROUBLESHOOTING for symptoms
4. Reproduce issue locally if possible
5. Fix code or configuration
6. Commit and push (automatically redeploys)
7. Verify success in Actions tab

## Monitoring Dashboard URLs

- Production: https://tipstream-silk.vercel.app
- Vercel Analytics: https://vercel.com/[team]/tipstream/analytics
- GitHub Actions: https://github.com/[org]/tipstream/actions

## Support and Escalation

### For Questions
1. Check QUICK_REFERENCE.md
2. Search relevant documentation file
3. Ask team members in Slack
4. Create discussion issue

### For Issues
1. Check DEPLOYMENT_TROUBLESHOOTING.md
2. Review Actions logs
3. Enable debug logging if needed
4. Contact on-call engineer
5. Create incident issue if critical

### For Suggestions
1. Create discussion issue
2. Propose changes to relevant doc
3. Get team feedback
4. Update documentation
5. Share learnings with team

## Related Repositories

- GitHub repository: https://github.com/[org]/tipstream
- Vercel project: https://vercel.com/[team]/tipstream
- Monitoring: https://vercel.com/[team]/tipstream/analytics

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-XX | Initial deployment documentation |
| | | - Preview and production workflows |
| | | - Health check monitoring |
| | | - Rollback procedures |
| | | - Environment configuration |
| | | - Secrets management |
| | | - Troubleshooting guides |

## Last Updated

Check commit history for full change log:
```bash
git log --oneline .github/DEPLOYMENT*.md .github/*.yml
```

## Contributing

To update documentation:
1. Make changes to relevant .md file
2. Ensure accuracy and clarity
3. Add examples if helpful
4. Get review from ops team
5. Merge to main
6. Update version history if major change

## Questions?

- Check QUICK_REFERENCE.md for quick answers
- Browse table of contents above
- Search within document using Ctrl+F
- Ask team members
- Create issue for clarification requests
