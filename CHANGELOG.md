# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- `authenticate()` now always resolves with `userSession.loadUserData()` instead
  of the raw `authResponsePayload`, which lacked the
  `profile.stxAddress.mainnet` property and caused silent address lookup
  failures (Issue #226).
- Root URL ("/") now redirects to `/send` instead of showing a blank 404 page
  for authenticated users (Issue #225).
- NotFound page displays the attempted URL path so users know what went wrong.

### Added

- `user-data.js` pure helper module with `getMainnetAddress`,
  `getTestnetAddress`, `getNetworkAddress`, and `isValidUserData` functions
  for safe user data extraction without importing the Stacks SDK.
- `getSenderAddress()` helper centralises the session-based address lookup
  that was duplicated across six components and one hook.
- `trackAuthError()` analytics method records authentication and data shape
  failures under the errors map with an `auth:` prefix.
- Session restore validates user data shape on page load and tracks failures
  in analytics when the stored session has an unexpected format.
- handleAuth guards with `isValidUserData()` before setting user state,
  showing an error toast and tracking the event when validation fails.
- Defensive null guard in Header wallet address display prevents rendering
  broken text when the address is missing.
- Unit tests for `getNetworkAddress` (11 tests), `trackAuthError` (2 tests).
- Centralised route constants module (`config/routes.js`) eliminates hard-coded
  path strings across the entire frontend.
- `usePageTitle` hook updates `document.title` on every route change.
- `SkipNav` component for keyboard-first navigation to the main content area.
- `RouteSkeleton` loading placeholder shown while lazy-loaded pages resolve.
- `LazyErrorBoundary` catches chunk-load failures and offers a retry button.
- `RequireAdmin` route guard restricts admin dashboard access to the contract
  owner and redirects other users to the default route.
- Route title, label, and metadata maps in `config/routes.js` serve as a
  single source of truth for navigation UI and document titles.
- `trackRouteRedirect` analytics method for monitoring redirect frequency.
- Playwright e2e tests for root redirect and 404 page behaviour.
- Comprehensive unit tests for routing, NotFound, route constants, page titles,
  SkipNav, RouteSkeleton, LazyErrorBoundary, and RequireAdmin.

### Security

- Mainnet seed phrases are excluded from version control (never committed).
- Pre-commit hook blocks staged changes containing mnemonic patterns.
- CI pipeline scans every push and PR for leaked secrets.
- Enforce `PostConditionMode.Deny` across all contract interactions
  (frontend and CLI scripts). Previously the test script and some
  transaction paths used `PostConditionMode.Allow`, which permits the
  contract to transfer arbitrary STX from the user's account without
  explicit bounds.
- Documented timelock bypass vulnerability in `set-paused` and `set-fee-basis-points`
  (see [TIMELOCK-BYPASS-AUDIT.md](docs/TIMELOCK-BYPASS-AUDIT.md))
- Added frontend AdminDashboard that exclusively uses timelocked propose-wait-execute path
- ESLint rules ban direct bypass function references (`set-paused`, `set-fee-basis-points`)
- All admin transaction builders enforce `PostConditionMode.Deny`
- Chainhook bypass detection module flags direct admin calls that skip the timelock

### Added

- `SECURITY.md` with vulnerability reporting and wallet rotation advisory.
- `CONTRIBUTING.md` with setup instructions and PR workflow.
- `ARCHITECTURE.md` with system design documentation.
- `settings/Mainnet.toml.example` and `settings/Testnet.toml.example` safe
  credential templates.
- `settings/README.md` documenting network configuration setup.
- `.gitleaks.toml` secret scanning configuration.
- `scripts/hooks/pre-commit` mnemonic detection hook.
- `scripts/setup-hooks.sh` one-command hook installer.
- GitHub Actions secret scanning workflow (`.github/workflows/secret-scan.yml`).
- Chainhook `/api/admin/events` endpoint for querying admin event history
- Chainhook `/api/admin/bypasses` endpoint for querying detected bypass events
- Chainhook `bypass-detection.js` module for real-time admin event monitoring
- Admin navigation link only visible to the contract owner
- Visual timelock progress bar on pending change cards in AdminDashboard
- `AdminDashboard` component with owner-only access, pause/fee controls, and pending change display
- `useAdmin` hook for polling contract owner, pending changes, and block height
- `admin-contract.js` library with read-only query helpers and Clarity hex parser
- `admin-transactions.js` library with timelocked propose/execute/cancel transaction builders
- `timelock.js` utility module with countdown calculations and formatting
- Admin operations guide ([ADMIN-OPERATIONS.md](docs/ADMIN-OPERATIONS.md))
- Contract upgrade strategy ([CONTRACT-UPGRADE-STRATEGY.md](docs/CONTRACT-UPGRADE-STRATEGY.md))
- Timelock bypass audit report ([TIMELOCK-BYPASS-AUDIT.md](docs/TIMELOCK-BYPASS-AUDIT.md))
- 40 unit tests for timelock utilities
- 18 unit tests for Clarity hex value parser
- 19 unit tests for admin transaction builders
- Contract tests for timelocked pause change propose/execute cycle
- Contract tests for timelocked fee change propose/execute/cancel cycle
- Contract tests comparing direct bypass vs timelocked path behavior
- `/admin` route in App.jsx with lazy-loaded AdminDashboard
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

- `.gitignore` expanded to cover private keys, certificates, and hosting
  platform local state.
- `scripts/deploy.sh` validates credential file presence and git tracking
  status before deployment.
- `scripts/test-contract.cjs` validates mnemonic word count.
- `settings/Devnet.toml` header updated with cross-reference to example
  templates.
- `.env.example` expanded with deployment-specific variables.
- README security section rewritten with credential handling details.
- SendTip fee preview now uses dynamic fee percentage from shared constants
  instead of a hardcoded "0.5%" string.
- Test script output now shows full fee breakdown before broadcasting.

### Fixed

- Corrected `set-fee` and `toggle-pause` to actual function names in README contract table
- Added missing read-only functions to README documentation
