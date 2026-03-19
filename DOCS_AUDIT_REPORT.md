# Documentation Audit Report

## Executive Summary

Core documentation contains drift signals indicating inconsistencies between documentation and current project state. This report identifies stale claims, outdated counts, and missing information that judges and engineers would notice.

## Drift Signals Identified

### 1. Test Count Discrepancy (CRITICAL)

**Finding:** README claims "Runs 23 contract tests" but actual test count is 88.

**Location:** README.md line 178

**Current:** "Runs 23 contract tests on Clarinet simnet covering:"

**Actual Count:**
- Contract tests: 88 test cases in `tests/tipstream.test.ts`
- Frontend tests: 40+ unit test files covering hooks, utilities, components
- Total: 128+ tests

**Impact:** Judges may question quality of test coverage given understatement.

---

### 2. Missing Recent Additions (Issue #291 & #290)

**Finding:** Documentation does not mention two major features added:

**Missing from README:**
- Event Feed Pagination & Selective Enrichment (Issue #291)
- Last-Known-Good Caching for Resilience (Issue #290)

**Missing from ROADMAP:**
- Performance optimization work
- API resilience improvements

**Impact:** Engineers deploying to production won't know about caching behavior or pagination changes.

---

### 3. Auto-Refresh Interval Misalignment

**Finding:** README states "60-second polling" but actual default is 30 seconds.

**Location:** README.md line 20, and contractEvents.js

**Current README:** "Auto-Refresh — 60-second polling"

**Actual Code:** `POLL_INTERVAL_MS = 30_000` (30 seconds) in contractEvents.js line 22

**Impact:** Performance claims and documentation inconsistency.

---

### 4. Token Tip Route Status Unclear

**Finding:** `/token-tip` route listed as available but feature status undefined.

**Location:** README.md line 92

**Issue:** Feature listed but:
- Not marked as "planned" or "beta"
- Component exists but needs SIP-010 token support
- Unclear if ready for production

---

### 5. Extension Contract Status Ambiguous

**Finding:** ARCHITECTURE.md suggests contracts are planned but doesn't clarify status.

**Location:** ARCHITECTURE.md Lines 44-57

**Issue:** Lists contracts as:
- "planned" but unclear which are in-progress vs. future
- tipstream-traits exists but others may be stubs
- No estimated timeline

---

### 6. Admin Dashboard Features Incomplete

**Finding:** README claims admin controls without noting some are behind timelocks.

**Location:** README.md lines 19, 119-123

**Missing Detail:** Some operations have 144-block (~24 hour) timelocks.

**Current:** Lists functions but doesn't clarify which are:
- Immediate (direct bypass)
- Timelocked (propose-wait-execute)
- Restricted to multisig

---

### 7. Security Features Under-Documented

**Finding:** README mentions "PostConditionMode.Deny" but under-explains execution.

**Location:** README.md lines 224-228 vs. actual behavior

**Missing:**
- Post-condition ceiling calculation
- Fee-aware validation rules
- UI enforcement of timelocked paths

---

### 8. Unauthenticated Access Behavior Ambiguous

**Finding:** README redirect behavior unclear for unauthenticated users.

**Location:** README.md line 89 - states "/" redirects authenticated, implies not for unauthenticated

**Missing:** What unauthenticated users see on "/" (landing page description)

---

## Documentation Files Under Review

Core documents audited:
- README.md (10.8KB) - Primary intro document
- ARCHITECTURE.md (6.5KB) - System design
- ROADMAP.md (1.8KB) - Feature planning
- SECURITY.md (6.3KB) - Security policy
- CHANGELOG.md (32KB) - Release history
- docs/*.md (various) - Technical guides

---

## Acceptance Criteria Status

| Criteria | Status | Notes |
|---|---|---|
| Core docs agree on deployed features | ❌ FAIL | Inconsistent test counts, missing features |
| Stale counts and descriptions removed | ❌ FAIL | 23 vs 88 tests, 60s vs 30s polling |
| Judge-facing overview included | ❌ MISSING | No standout overview for judges |
| Docs-maintenance process documented | ❌ MISSING | No checklist or process defined |

---

## Recommended Fixes

### Priority 1 (Critical)

1. Update test count: 23 → 88 contract tests + frontend tests
2. Update polling interval: 60s → 30s
3. Document Issue #290 (caching) and #291 (pagination)
4. Clarify timelocked vs direct admin operations

### Priority 2 (Important)

5. Add judge-facing overview section to README
6. Clarify /token-tip route status
7. Update extension contract roadmap with status
8. Explain unauthenticated user experience

### Priority 3 (Enhancement)

9. Add docs review checklist to release process
10. Create feature status legend
11. Document performance metrics baseline

---

## Proposed New Sections

### README Addition: "Project Status Overview"

Quick reference for judges and reviewers:
- Live features and their status (beta, stable, experimental)
- Performance baseline numbers
- Test coverage overview
- Known limitations

### Documentation Maintenance Process

Add to CONTRIBUTING.md:
- Quarterly docs audit checklist
- Review test counts documentation
- Verify all feature statuses
- CI check for outdated version numbers

---

## Files Requiring Updates

Priority order:
1. README.md - Test counts, polling interval, missing features
2. ROADMAP.md - Add recent optimization work
3. ARCHITECTURE.md - Clarify extension contracts
4. SECURITY.md - Clarify admin operation types
5. docs/README.md - Add maintenance checklist
