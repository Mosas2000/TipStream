# Documentation Maintenance Process

## Overview

This document defines a repeatable process for maintaining documentation accuracy and consistency. Documentation serves as the primary interface for judges, contributors, and users to understand the project.

## Quarterly Audit Checklist

Run this checklist every three months or before major releases.

### 1. Feature Inventory

- [ ] Verify all live features are described in README.md
- [ ] Check that planned features are listed in ROADMAP.md
- [ ] Confirm feature status labels are accurate (Stable, Beta, Experimental)
- [ ] Update demo screenshots if new features added
- [ ] Verify feature flags or experimental toggles are documented

### 2. Technical Counts & Metrics

- [ ] Update test count (contract + frontend + integration tests)
- [ ] Run `npm test` and document pass/fail rate
- [ ] Verify API/polling intervals match actual code
- [ ] Check contract function count matches documentation
- [ ] Document performance baselines if performance changes

### 3. Architectural Consistency

- [ ] Verify all deployed contract addresses current

- [ ] Check that component paths match actual directory structure
- [ ] Confirm context providers are all documented
- [ ] Update data model description if schema changes
- [ ] Verify deployment process matches actual CI/CD

### 4. Security & Admin Operations

- [ ] Verify timelocked operations are documented
- [ ] Confirm ownership transfer process matches code
- [ ] Check fee structure and minimums are current
- [ ] Document any pending security audits or findings
- [ ] Verify post-condition enforcement strategy is current

### 5. Dependency Status

- [ ] Check React version matches actual dependenc

ies
- [ ] Verify Clarity version and SDK versions are current
- [ ] Update wallet support list if changed
- [ ] Confirm TypeScript version if used
- [ ] Check node version requirements

### 6. Routing & Pages

- [ ] Verify all documented routes exist
- [ ] Check route order matches navigation structure
- [ ] Update page descriptions if logic changed
- [ ] Mark deprecated routes as such
- [ ] Confirm all pages have correct auth requirements

### 7. Documentation Cross-References

- [ ] Search for broken links (README -> ARCHITECTURE etc.)
- [ ] Verify docs/README.md index is current
- [ ] Check CHANGELOG.md entries for correctness
- [ ] Confirm all issues referenced exist
- [ ] Update docs when new guides are added

### 8. Unauthenticated Experience

- [ ] Verify landing page description matches behavior
- [ ] Check that private routes are actually private
- [ ] Confirm public pages are accessible
- [ ] Document any demo mode or beta access

### 9. Release Notes

- [ ] Review CHANGELOG.md for accuracy
- [ ] Verify version numbers are consistent
- [ ] Check that breaking changes are highlighted
- [ ] Confirm all new files/features listed
- [ ] Update security advisories if needed

### 10. Judge-Facing Overview

- [ ] Verify project status section is current
- [ ] Check that standout features are highlighted
- [ ] Confirm test coverage numbers are accurate
- [ ] Update recent wins/achievements
- [ ] Verify deployment stability claim

## Process Integration

### Pre-Release Checklist

Before tagging a release:

1. Run full quarterly checklist above
2. Fix all identified drift signals
3. Update CHANGELOG.md with release notes
4. Create a `docs-audit` branch and commit fixes
5. Request review of documentation changes
6. Merge only after review approval

### Continuous Maintenance

**Weekly:**
- If features added/removed, update README.md immediately
- If routes changed, update routing table

**Monthly:**
- Review open issues for documentation impact
- Check GitHub discussions for documentation questions
- Update any dates or timelines

**Quarterly:**
- Run full checklist above
- File issues for any needed documentation work
- Review for tone and consistency

## Drift Signal Types

Common documentation drift signals to watch for:

| Signal Type | Examples | Check Frequency |
|---|---|---|
| Stale counts | Test count, feature count, function count | Weekly |
| Outdated intervals | Polling, cache TTL, timeouts | Monthly |
| Incomplete feature lists | New endpoints, new pages | Weekly |
| Inconsistent status | Different docs claim different feature status | Monthly |
| Broken links | Links to issues, docs, external resources | Quarterly |
| Architecture mismatch | Components described don't match code | Monthly |
| Missing explanations | Security features, admin operations | Quarterly |
| Abandoned plans | ROADMAP items never progressed | Quarterly |

## Automated Checks

Integrate into CI/CD where possible:

### Pre-commit Hook

```bash
#!/bin/bash
# Check for obvious drift signals in documentation
grep -l "npm test" README.md && grep -q "Runs [0-9]* contract tests" && echo "Update test count before committing"
```

### CI Check

Verify documentation links in GitHub Actions:

```yaml
- name: Check documentation
  run: |
    npm run test
    echo "Test count: $(grep -c 'it(' tests/tipstream.test.ts)"
```

## Document Ownership

| Document | Owner | Review Cadence |
|---|---|---|
| README.md | Tech Lead | Monthly |
| ROADMAP.md | Project Manager | Quarterly |
| ARCHITECTURE.md | Architect | Monthly |
| SECURITY.md | Security Lead | Quarterly |
| CHANGELOG.md | Release Manager | Per release |
| docs/*.md | Respective authors | Quarterly |

## Escalation Path

If drift signal found:

1. **Minor (typos, links)** → Fix immediately
2. **Moderate (outdated metrics)** → File issue, fix before release
3. **Major (architecture mismatch)** → Escalate to weekly sync, plan fix

## Quick Audit Commands

Keep handy for quick checks:

```bash
# Count contract tests
grep -c "it(" tests/tipstream.test.ts

# Count frontend tests
find frontend/src -name "*.test.js" | wc -l

# Check polling interval
grep "POLL_INTERVAL" frontend/src/lib/contractEvents.js

# Count documented functions
grep "^| \`" README.md | wc -l

# Check for broken links
npm install -g markdown-link-check
markdown-link-check README.md
```

## References

- [Documentation Audit Report](../DOCS_AUDIT_REPORT.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Architecture](ARCHITECTURE.md)
- [Roadmap](../ROADMAP.md)
