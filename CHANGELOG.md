# Changelog

All notable changes to the TipStream project will be documented in this file.

## [Unreleased]

### Security

- Documented timelock bypass vulnerability in `set-paused` and `set-fee-basis-points`
  (see [TIMELOCK-BYPASS-AUDIT.md](docs/TIMELOCK-BYPASS-AUDIT.md))
- Added frontend AdminDashboard that exclusively uses timelocked propose-wait-execute path
- ESLint rules ban direct bypass function references (`set-paused`, `set-fee-basis-points`)
- All admin transaction builders enforce `PostConditionMode.Deny`

### Added

- `AdminDashboard` component with owner-only access, pause/fee controls, and pending change display
- `useAdmin` hook for polling contract owner, pending changes, and block height
- `admin-contract.js` library with read-only query helpers and Clarity hex parser
- `admin-transactions.js` library with timelocked propose/execute/cancel transaction builders
- `timelock.js` utility module with countdown calculations and formatting
- Admin operations guide ([ADMIN-OPERATIONS.md](docs/ADMIN-OPERATIONS.md))
- Contract upgrade strategy ([CONTRACT-UPGRADE-STRATEGY.md](docs/CONTRACT-UPGRADE-STRATEGY.md))
- Security policy ([SECURITY.md](SECURITY.md))
- Timelock bypass audit report ([TIMELOCK-BYPASS-AUDIT.md](docs/TIMELOCK-BYPASS-AUDIT.md))
- 40 unit tests for timelock utilities
- 18 unit tests for Clarity hex value parser
- 19 unit tests for admin transaction builders
- Contract tests for timelocked pause change propose/execute cycle
- Contract tests for timelocked fee change propose/execute/cancel cycle
- Contract tests comparing direct bypass vs timelocked path behavior
- `/admin` route in App.jsx with lazy-loaded AdminDashboard

### Fixed

- Corrected `set-fee` and `toggle-pause` to actual function names in README contract table
- Added missing read-only functions to README documentation
