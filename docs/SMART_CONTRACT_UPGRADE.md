# Smart Contract Upgrade & Versioning Guide

Procedures for planning, testing, and deploying smart contract updates on mainnet.

## Version Strategy

TipStream uses semantic versioning for contract upgrades:

**Format**: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (new features requiring user action)
- **MINOR**: Backwards-compatible additions (new functions, optimizations)
- **PATCH**: Bug fixes (no behavior change)

**Current Version**: 1.0.0 (Stable)

## Upgrade Categories

### Category A: Backwards-Compatible (MINOR)

- New read-only functions
- New public functions that don't affect existing state
- Gas optimizations
- Security enhancements (new validations)

**Example**: Adding `get-tip-stats()` read-only function

**Process**: Standard deployment (3-5 days)

### Category B: Additive State (MINOR/MAJOR)

- New data maps or state variables
- New error codes
- New events (contract doesn't emit yet, but could)

**Example**: Adding user "reputation" counter

**Process**: Careful migration plan (1-2 weeks)

**Consideration**: Existing contracts can't read new state; requires versioning

### Category C: Breaking Changes (MAJOR)

- Changing function signatures
- Removing functions
- Changing existing behavior
- State restructuring

**Example**: Renaming `send-tip` to `transfer-tip`

**Process**: Major version with migration window (4+ weeks)

## Pre-Upgrade Checklist

### 1. Design Phase (1 week)

- [ ] Document upgrade rationale in ARCHITECTURE_DECISIONS.md
- [ ] Specify all function changes (additions, removals, renames)
- [ ] List all state changes
- [ ] Identify backwards compatibility impact
- [ ] Estimate complexity (A/B/C category)

### 2. Development Phase (1-2 weeks)

- [ ] Code changes in feature branch
- [ ] Update contract version in `define-constant CONTRACT_VERSION`
- [ ] Full test suite on simnet (88+ tests must pass)
- [ ] Test on testnet with real wallet
- [ ] Document in CHANGELOG.md

### 3. Review Phase (1 week)

- [ ] Code review by maintainers
- [ ] Security review for new functions
- [ ] Integration testing with frontend
- [ ] Testnet user acceptance testing

### 4. Staging Phase (3-5 days)

- [ ] Deploy to testnet
- [ ] Verify against DEPLOYMENT_VERIFICATION.md checklist
- [ ] Announce upgrade timeline to community
- [ ] Gather feedback

### 5. Production Deployment (1 day)

- [ ] Deploy to mainnet with owner account
- [ ] Monitor contract for 24 hours
- [ ] Release frontend update (if needed)
- [ ] Announce in Discord/Twitter

## Deployment Procedures

### Simnet Testing (Local)

```bash
# 1. Update contract code
# 2. Run full test suite
npm test

# Expected output:
# ✓ 88 tests passed
```

### Testnet Deployment

```bash
# 1. Set up testnet environment
export MNEMONIC="your-testnet-seed-phrase"
export STACKS_NETWORK="testnet"

# 2. Check contract compiles
clarinet check

# 3. Deploy to testnet
npm run deploy:testnet

# 4. Verify deployment
clarinet info

# 5. Run verification checklist (docs/DEPLOYMENT_VERIFICATION.md)
```

### Mainnet Deployment

```bash
# 1. Set up mainnet environment (CRITICAL - verify address)
export MNEMONIC="your-mainnet-seed-phrase"
export STACKS_NETWORK="mainnet"

# 2. Final pre-deployment checks
npm test                           # All tests pass?
clarinet check                     # Compiles without errors?
git log --oneline -n 5            # Correct branch?

# 3. Deploy to mainnet (IRREVERSIBLE)
npm run deploy:mainnet

# 4. Wait for confirmation
# Watch tx at: https://explorer.hiro.so

# 5. Verify deployment
clarinet info
# Check: contract name, version, owner address

# 6. Run verification checklist
```

## Testnet vs Mainnet

| Aspect | Testnet | Mainnet |
|---|---|---|
| Cost | Free STX | Real STX |
| Audience | Developers | Live users |
| Reset | Can reset anytime | Immutable forever |
| Testing | Full user workflows | Real transactions |
| Rollback | Deploy new version | Deploy workaround or v2 |
| Security | "Good enough" rigor | Maximum rigor |
| Announcement | Optional | Required |

## Contract Versioning in Code

```clarity
;; At top of tipstream.clar
(define-constant CONTRACT_VERSION "1.0.0")
(define-constant UPDATED_BLOCK u12345678)  ;; Mainnet deployment block

;; Read-only function for clients to check
(define-read-only (get-contract-version)
  (ok CONTRACT_VERSION)
)
```

## Handling Migration

### Non-Breaking Backwards-Compatible

**No migration needed**, just deploy.

### Breaking Changes Requiring Migration

#### Option 1: Version Suffix (Recommended for Beta)

```clarity
;; Old contract:
(use-trait tipstream-v1 .tipstream-v1-trait)

;; New contract names:
.tipstream-v1-001
.tipstream-v1-002  ;; This one has breaking changes

;; User manually points wallet to new contract
```

**Pros**: Clean, no state migration needed
**Cons**: Requires user action, wallet update

#### Option 2: Wrapper Function (For Advanced Features)

```clarity
;; Keep old functions, add new ones
;; Example: send-tip still works, but dispatch to new internal logic

;; New internal function:
(define-private (send-tip-v2 (...) ...)
  ;; improved logic
)

;; Old interface:
(define-public (send-tip (...) ...)
  ;; calls send-tip-v2 internally
)
```

**Pros**: User sees no change
**Cons**: Complex implementation, potential bugs

## Monitoring Upgrade Health

### First 24 Hours

```bash
# Check metrics hourly:

# 1. Transaction success rate
curL https://api.hiro.so/v1/address/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T/transactions

# 2. Error rates
# Monitor frontend console errors
# Check for unusual patterns

# 3. Frontend compatibility
# Verify all pages load
# Test a real tip transaction
```

### First Week

- [ ] No major errors reported
- [ ] Transaction volume normal
- [ ] No unexpected behavior
- [ ] Community feedback positive

### First Month

- [ ] Performance stable
- [ ] All features working
- [ ] No security issues discovered
- [ ] Can mark as "Stable" in FEATURE_STATUS.md

## Rollback Procedures

**Important**: Smart contracts are immutable on mainnet.

### If Critical Bug Found

#### Option 1: Pause Contract (Emergency)

```clarity
(define-public (set-paused (paused bool))
  (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
  (ok (var-set paused paused))
)
```

Use only for genuine emergencies:

```bash
# Call pause function via RPC
curl -X POST https://stacks-node.example.com/v2/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "tx_type": "contract_call",
    "tx": { "set-paused": true }
  }'
```

#### Option 2: Deploy V2 Contract

1. Create new contract address: `tipstream-v2`
2. Deploy fixed version
3. Notify users of migration
4. Set old contract to paused state
5. Provide migration period (typically 30 days)

#### Option 3: Partial Function Disable

For bugs in specific functions:

```clarity
(define-public (send-tip (...) ...)
  (asserts! (not FUNCTION-DISABLED) ERR-DISABLED)
  ;; original code
)

(define-constant FUNCTION-DISABLED false)  ;; Set to true if bug discovered
```

Change constant and redeploy: `tipstream-v1-001` (patch version)

## Changelog & Release Notes

Every upgrade must update CHANGELOG.md:

```markdown
## [1.1.0] - 2026-04-15

### Added
- New `get-tip-stats()` read-only function for aggregated analytics
- Tip metadata storage (optional, backwards compatible)

### Changed
- Optimized fee calculation (no behavior change)
- Improved error messages for clarity

### Fixed
- Bug in block-recipient logic when recipient = sender

### Security
- Added validation for max fee bounds
- Hardened post-condition enforcement

### Migration
- No migration required (backwards compatible)
- Deploy and existing users can use v1 or v1.1 contracts
```

## Testing Upgrade Impact

### Integration Testing

```bash
# 1. Keep old contract deployed
# 2. Deploy new contract to new address
# 3. Test both simultaneously
# 4. Verify upgrade doesn't break existing dApps

# Example:
tipstream-v1 (SP31...tipstream) ← Old
tipstream-v2 (SP31...tipstream-v2) ← New

# Test both work in parallel
```

### Frontend Testing

```javascript
// Test contract upgrade without actual deployment
const v1_abi = require('./contracts/v1-abi.json')
const v2_abi = require('./contracts/v2-abi.json')

// Make sure v2 functions compatible
assert_same_interface(v1_abi, v2_abi)
```

## Communication Template

### Testnet Announcement

```
🧪 TipStream Contract Upgrade - Testnet

Version: 1.1.0
Changes: [bullet list]
Testing Period: [dates]

Testnet Contract: SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream-v1-1-testnet

Please test and report issues in #bugs channel.
```

### Mainnet Announcement

```
🚀 TipStream Contract Upgrade - Mainnet

Version: 1.1.0
Timeline: [schedule]
Impact: [user-facing changes, if any]
Migration: [required actions, if any]

New Contract: SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream
Update Link: [release URL]

Questions? Ask in #support
```

## References

- [CHANGELOG.md](../CHANGELOG.md) - Release history
- [SECURITY.md](../SECURITY.md) - Security procedures
- [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md) - Verification checklist
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System design

---

**Last Updated:** March 2026
**Maintained by:** Release Engineering Team
**Next Review:** When next upgrade planned

