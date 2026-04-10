# Deployment Best Practices

This guide establishes standards for safe, reliable deployments.

## Pre-Deployment Standards

### Code Quality Standards
1. **Testing Requirements**:
   - Minimum 70% code coverage
   - All unit tests passing
   - Integration tests passing
   - Manual testing on staging
   - Cross-browser testing complete

2. **Code Review Requirements**:
   - Minimum 1 approval required
   - No outstanding comments
   - Security review completed
   - Performance review completed
   - Architecture review completed (if applicable)

3. **Documentation Requirements**:
   - README updated if needed
   - Complex logic documented
   - API contracts documented
   - Configuration documented
   - Breaking changes documented
   - Migration guide provided (if applicable)

### Dependency Management
1. **Dependency Updates**:
   - Keep dependencies current
   - Use npm audit to check for vulnerabilities
   - Review breaking changes before upgrading
   - Test updates on staging first

2. **Dependency Security**:
   - No high-severity vulnerabilities
   - No critical security issues
   - Regular security audits
   - Automated dependency scanning enabled

3. **Dependency Size**:
   - Monitor bundle size
   - Remove unused dependencies
   - Use tree-shaking where possible
   - Lazy load heavy features

### Git Practices
1. **Commit Messages**:
   - Clear, descriptive subject line (50 chars max)
   - Detailed explanation in body (optional)
   - Reference issue numbers when applicable
   - Explain "why", not just "what"

2. **Branch Naming**:
   - Use lowercase with hyphens
   - Descriptive names (e.g., feature/user-auth)
   - No issue numbers in branch name
   - No special characters

3. **Pull Request Process**:
   - One feature per PR
   - Focused, reviewable changes
   - Clear PR description
   - Address all review comments
   - Squash commits before merge

## Deployment Process Standards

### Staging Deployment
1. **Test Coverage**:
   - All critical paths tested
   - Load testing completed
   - Accessibility testing passed
   - Performance acceptable

2. **Verification**:
   - Manual QA sign-off
   - Cross-browser verification
   - Mobile testing passed
   - Third-party integrations working

3. **Documentation**:
   - Deployment notes captured
   - Known issues documented
   - Rollback procedure reviewed
   - Team notified

### Production Deployment
1. **Timing**:
   - Deploy during business hours
   - Avoid peak usage times
   - Schedule in advance
   - Notify team and stakeholders

2. **Preparation**:
   - Verify rollback procedure
   - On-call engineer assigned
   - Monitoring configured
   - Alert thresholds set

3. **Execution**:
   - Follow checklist exactly
   - Monitor metrics actively
   - Be ready to rollback
   - Communicate status continuously

4. **Post-Deployment**:
   - Monitor for 30 minutes
   - Review logs for errors
   - Verify metrics normal
   - Document deployment
   - Get stakeholder sign-off

## Commit Standards

### Format
```
<subject line, max 50 chars>

<body paragraph, explain why and how, 72 char wrap>

<additional paragraphs if needed>
```

### Subject Line
- Start with verb: Add, Fix, Update, Remove, Refactor
- Be specific about what changed
- No period at end
- Lowercase (except proper nouns)
- Example: "Add email notification service for pending tips"

### Body
- Explain motivation and impact
- Describe alternatives considered
- List any breaking changes
- Reference related issues: "Fixes #123"

### Examples

Good:
```
Fix memory leak in tip listener

Remove unused event listener that was attached on
component mount but never cleaned up. This prevented
garbage collection and caused memory usage to grow
over time.

Fixes #234
```

Bad:
```
Fixed stuff
```

## Release Standards

### Version Numbering (Semantic Versioning)
- MAJOR.MINOR.PATCH (e.g., 1.2.3)
- MAJOR: Incompatible API changes
- MINOR: Backward-compatible features
- PATCH: Backward-compatible fixes

### Release Process
1. Update version in package.json
2. Update CHANGELOG.md
3. Create release tag
4. Deploy to staging for final verification
5. Create GitHub Release
6. Deploy to production
7. Monitor for issues

### Documentation
- Release notes in GitHub Release
- Breaking changes clearly documented
- Migration guide if applicable
- Known issues listed

## Error Handling Standards

### Client-Side Errors
1. **Always show user feedback**:
   - Error messages in UI
   - Suggest corrective action
   - Avoid technical jargon
   - Provide support contact if needed

2. **Log for debugging**:
   - Send to error tracking service
   - Include context and stack trace
   - Include user information (if allowed)
   - Include feature/action that failed

3. **Graceful degradation**:
   - Disable feature instead of breaking
   - Show loading state if pending
   - Cache previous results if available
   - Offer fallback option

### Server-Side Errors
1. **Respond with appropriate status**:
   - 4xx: Client error
   - 5xx: Server error
   - 503: Service unavailable
   - Match HTTP semantics

2. **Include error details**:
   - Error code for client to handle
   - Message for logging
   - Stack trace in development
   - No sensitive info in production

3. **Log systematically**:
   - Structured logging (JSON)
   - Include request ID for tracing
   - Include timestamp
   - Include severity level

## Performance Standards

### Target Metrics
- Page load: < 3 seconds P95
- Core Web Vitals: All "Good"
- First Contentful Paint: < 2.5 seconds
- Largest Contentful Paint: < 2.5 seconds
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 5 seconds

### Performance Checklist
- [ ] Bundle size reviewed
- [ ] Network requests optimized
- [ ] Assets compressed
- [ ] Caching configured
- [ ] CDN enabled
- [ ] Images optimized
- [ ] Code splitting configured
- [ ] Lazy loading implemented

### Optimization Strategies
1. **Bundle Size**:
   - Tree-shake unused code
   - Code split large features
   - Compress assets
   - Remove source maps from production

2. **Network**:
   - Minimize requests
   - Use compression
   - Enable HTTP/2
   - Use CDN for static assets

3. **Runtime**:
   - Defer non-critical scripts
   - Lazy load images
   - Virtualize long lists
   - Memoize expensive computations

## Security Standards

### Secret Management
- No secrets in code
- Use environment variables
- Rotate credentials regularly
- Store in secure vault
- Audit access logs

### Input Validation
- Validate all user input
- Sanitize before display
- Use type checking
- Escape output appropriately
- Validate on server

### API Security
- Use HTTPS only
- Implement rate limiting
- Add request validation
- Use CORS properly
- Implement authentication

### Dependencies
- Use pinned versions
- Regular security audits
- Monitor advisories
- Update promptly
- Avoid untrusted packages

## Monitoring Standards

### Metrics to Track
- Error rate (target < 1%)
- Response time (P95 < 3s)
- Uptime (target > 99.9%)
- User sessions
- Feature usage
- Conversion rates

### Alerts to Configure
- Error rate spike
- Response time degradation
- Uptime/availability issues
- Resource exhaustion
- Budget alerts

### Review Cadence
- Real-time: Critical issues
- Hourly: Error trends
- Daily: Performance trends
- Weekly: Capacity trends
- Monthly: Business metrics

## Documentation Standards

### README
- What the project does
- How to run locally
- How to deploy
- Known issues
- Contributing guidelines

### Inline Comments
- Why, not what
- Complex algorithms
- Non-obvious design decisions
- Assumptions made
- Known limitations

### API Documentation
- Endpoint descriptions
- Request/response examples
- Error codes and messages
- Rate limits
- Authentication requirements

### Runbooks
- Step-by-step procedures
- Expected outcomes
- Troubleshooting tips
- Who to contact
- When to escalate

## Communication Standards

### Incident Communication
- Acknowledge within 5 minutes
- Update every 15 minutes
- Clear and factual
- No blame or speculation
- Estimated time to resolution

### Deployment Communication
- Announce planned deployment
- Provide deployment window
- List changes included
- Possible impact statement
- Rollback plan if needed

### Post-Deployment
- Confirm successful deployment
- Share metrics/results
- Highlight improvements
- List known issues
- Thank contributing team members

## Team Standards

### Code Review
- Constructive feedback
- Respect and professionalism
- Focus on code, not person
- Suggest improvements
- Acknowledge good work

### Knowledge Sharing
- Document decisions
- Share learnings
- Mentor junior developers
- Contribute to runbooks
- Help with debugging

### On-Call Responsibilities
- Respond to incidents quickly
- Follow incident procedures
- Document actions taken
- Communicate status updates
- Maintain environment stability

## Continuous Improvement

### Retrospectives
- After incidents
- After releases
- Quarterly reviews
- Identify improvements
- Implement changes

### Metrics Review
- Track deployment frequency
- Track deployment success rate
- Track change lead time
- Track recovery time
- Track team satisfaction

### Process Updates
- Document lessons learned
- Update runbooks
- Improve tooling
- Automate manual steps
- Train team on improvements

## Related Documentation

- See DEPLOYMENT_WORKFLOW.md for workflow details
- See DEPLOYMENT_CHECKLIST.md for pre-deployment checks
- See ROLLBACK_PROCEDURES.md for incident response
- See MONITORING.md for observability standards
- See DEPLOYMENT_TROUBLESHOOTING.md for issue resolution

## Questions and Support

For questions about standards:
1. Check this documentation
2. Review recent deployments
3. Ask team members
4. Create discussion issue
5. Update standards if needed
