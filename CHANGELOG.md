# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Security

- Enforce `PostConditionMode.Deny` across all contract interactions
  (frontend and CLI scripts). Previously the test script and some
  transaction paths used `PostConditionMode.Allow`, which permits the
  contract to transfer arbitrary STX from the user's account without
  explicit bounds.

### Added

- Shared post-condition helper modules for frontend (`lib/post-conditions.js`)
  and CLI scripts (`scripts/lib/post-conditions.cjs`).
- Fee calculation helpers: `feeForTip`, `totalDeduction`, `recipientReceives`.
- Fee preview panel in SendTip showing tip, fee, total wallet deduction,
  recipient net, and on-chain post-condition ceiling.
- Fee breakdown in the tip confirmation dialog.
- Fee-aware balance sufficiency checks that account for the 0.5% platform fee.
- Post-condition-specific error messages when transactions fail.
- ESLint rules (`no-restricted-properties` and `no-restricted-syntax`) banning
  `PostConditionMode.Allow` in frontend code.
- CI job running `scripts/audit-post-conditions.sh` to grep-audit all source
  files for `Allow` mode usage.
- 82 unit and integration tests for post-condition helpers.
- `docs/POST-CONDITION-GUIDE.md` explaining the enforcement strategy.
- `scripts/README.md` documenting all utility scripts.
- Mnemonic word-count and recipient address format validation in test script.
- Dry-run mode (`DRY_RUN=1`) for the test script.
- `.env.example` with documentation for all supported environment variables.

### Changed

- SendTip fee preview now uses dynamic fee percentage from shared constants
  instead of a hardcoded "0.5%" string.
- Test script output now shows full fee breakdown before broadcasting.
