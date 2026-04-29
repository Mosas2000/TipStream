# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Direct read-only function for contract pause state (Issue #345):
  - New `get-is-paused` read-only function provides direct access to pause state
  - Returns simple boolean response: `(ok true)` for paused, `(ok false)` for running
  - Eliminates need to infer pause state from other contract responses
  - Frontend helpers updated to use new function for improved clarity
  - Comprehensive contract tests for both v2 and legacy contracts
  - Frontend integration tests verify correct API usage
  - Example scripts for querying and monitoring pause state
  - Migration guide for integrators
  - Documentation updates across PAUSE_API_REFERENCE, PAUSE_OPERATIONS, and ADMIN_OPERATIONS

- Cancel-pause-change functionality for contract pause operations:
  - New `cancel-pause-change` function allows admins to cancel pending pause proposals
  - Provides operational symmetry with existing `cancel-fee-change` function
  - Reduces operational risk when pause proposals submitted in error
  - Clear state cleanup on cancellation (clears pending-pause and pending-pause-height)
  - Comprehensive contract tests covering authorization, state cleanup, and edge cases
  - Admin dashboard component (AdminPauseControl) for pause proposal management
  - Frontend utilities library for pause state calculations and validation
  - Extensive test suite (44 state management tests, 50 utility tests, 33 component tests)
  - Documentation suite:
    - PAUSE_OPERATIONS.md: Technical implementation details
    - PAUSE_CONTROL_RUNBOOK.md: Operational procedures for admins
    - ADMIN_OPERATIONS.md: Updated with cancel-pause task
    - CANCEL_PAUSE_MIGRATION.md: Deployment and rollback guidance
  - Authorization checks prevent non-admin operations
  - Timelock validation prevents execution before expiration
  - Error messages clearly identify operation failures

- Notification state scoping by wallet address and network:
  - Notification read state now scoped per wallet address and network
  - Each wallet maintains independent unread notification counts
  - Network switching preserves separate read states
  - Automatic migration from legacy single-key storage
  - State resets correctly on wallet disconnect/reconnect
  - Comprehensive tests for multi-account scenarios
  - Documentation in docs/NOTIFICATION_STATE.md

- Frontend environment and contract configuration validation (Issue #289):
  - Startup validation blocks application launch when config is invalid
  - CI validation script fails fast on misconfigured deployments
  - Validates network values (mainnet, testnet, devnet)
  - Validates app URL format and protocol
  - Validates contract address format
  - Validates contract name naming conventions
  - Validates Stacks API URL with network mismatch warnings
  - Comprehensive error messages identify misconfigured fields
  - User-facing error banner displays config issues before app loads
  - Prebuild hook validates config before production builds
  - Unit tests for all validation functions
  - Configuration documentation in frontend/CONFIG.md

### Changed

- Added last-known-good caching for read-heavy surfaces (Issue #290):
  - Persistent cache stores successful API responses with configurable TTL
  - Automatic fallback to cached data when live APIs are unavailable or slow
  - Visual freshness indicators show users whether they are viewing live or cached data
  - Transaction operations locked when live data unavailable to prevent incorrect actions
  - Strategic cache invalidation on state changes (tip-sent, profile-update)

- Event feed pipeline refactored for scale and performance (Issue #291):
  - Implemented selective message enrichment: messages are now fetched only
    for visible/paginated tips instead of all tips, reducing API calls by ~90%
    on initial page load.
  - Added page-level caching with 2-minute TTL and invalidation boundaries
    to reduce redundant Stacks API requests during pagination.
  - Implemented stable cursor-based pagination with deduplication guarantees
    to enable reliable multi-page traversal as events are added on-chain.
  - RecentTips component refactored to use new `useFilteredAndPaginatedEvents`
    hook, centralizing filter/sort/paginate logic and improving composability.

### Added (Issue #290)

- `frontend/src/lib/persistentCache.js`: localStorage-backed cache with TTL support,
  metadata tracking, and statistics collection.
- `frontend/src/hooks/useCachedData.js`: Generic hook for fetch with automatic
  fallback to persistent cache on error or timeout.
- `frontend/src/hooks/useCachedStats.js`: Platform stats-specific hook with
  appropriate TTL and timeout settings.
- `frontend/src/hooks/useCachedLeaderboard.js`: Leaderboard-specific hook with
  extended cache TTL for aggregated data.
- `frontend/src/lib/cachedApiClient.js`: Transparent fetch wrapper with automatic
  response caching, timeout handling, and per-endpoint TTL configuration.
- `frontend/src/lib/cacheInvalidationManager.js`: Utilities for pattern-based and
  event-based cache invalidation to prevent stale data cascades.
- `frontend/src/hooks/useTransactionLockout.js`: Hook for controlling transaction
  availability based on data source (live/cache/none).
- `frontend/src/context/ResilienceContext.jsx`: Global context for coordinating
  cache invalidation and connection status monitoring across the app.
- `frontend/src/components/FreshnessIndicator.jsx`: Visual component showing cache
  status, data age, and retry button for manual refresh.
- `docs/LAST_KNOWN_GOOD_CACHING.md`: Comprehensive guide covering architecture,
  components, usage patterns, TTL guidelines, and troubleshooting.
- `docs/MIGRATION_GUIDE_290.md`: Step-by-step integration guide for adding caching
  to existing components with before/after examples.
- Unit tests for persistent cache, cached data hook, cache invalidation, and
  transaction lockout with edge case and integration coverage.

### Added (Issue #291)

- `frontend/src/lib/eventCursorManager.js`: Opaque cursor-based pagination
  helper with support for stable cursors and deduplication across event pages.
- `frontend/src/lib/eventPageCache.js`: LRU-style page caching with TTL and
  invalidation boundaries to prevent redundant event fetches.
- `frontend/src/lib/enrichmentMetrics.js`: Performance metrics collection for
  measuring message enrichment API load and cache effectiveness.
- `frontend/src/hooks/useSelectiveMessageEnrichment.js`: Hook for selective
  enrichment of only visible tips with message data, reducing batch API calls.
- `frontend/src/hooks/usePaginatedEvents.js`: Hook for paginated event loading
  with integrated page caching and cursor generation.
- `frontend/src/hooks/useFilteredAndPaginatedEvents.js`: Unified hook combining
  filtering, sorting, pagination, and selective enrichment for event feeds.
- `frontend/src/lib/contractEvents.js#fetchEventPage`: New single-page fetcher
  for component-level event pagination independent of bulk initial load.
- `docs/PERFORMANCE_PROFILING.md`: Profiling guide with measurement techniques
  and expected metrics demonstrating 90% reduction in enrichment API calls.
- Unit tests for event cursor manager and page cache with edge case coverage.

### Added (Issue #248)

- `frontend/src/test/useStxPrice.test.js` with 19 tests covering
  initial loading, price fetch, error states, toUsd conversion,
  refetch behavior, 60s interval polling, unmount cleanup, price
  preservation on poll failure, and CoinGecko URL verification.
- `frontend/src/test/useBlockCheck.test.js` with 14 tests covering
  initial state, empty/self recipient, checking state, blocked/not-
  blocked results, error handling, reset, stale response discard,
  sequential calls, and error completion.
- `frontend/src/test/parseTipEvent.test.js` with 23 tests covering
  tip-sent and tip-categorized parsing, missing fields, messages,
  large values, case sensitivity, whitespace, malformed input, u0
  amounts/tip-ids, empty messages, high categories, and contract
  principal addresses.
- `frontend/src/test/tipBackValidation.test.js` with 21 tests covering
  constants, empty/null inputs, boundary amounts, typical values,
  NaN/Infinity strings, and small positive amounts.
- `frontend/src/test/address-validation.test.js` with 30 tests covering
  Stacks address regex (SP/SM/ST prefixes, length boundaries at 37-42,
  special chars, dots, spaces) and contract ID validation.
- `frontend/src/test/send-tip-validation.test.js` with 26 tests covering
  amount validation, self-tip detection, balance-insufficient check,
  constants, TIP_CATEGORIES, and default message fallback.
- `frontend/src/test/batch-tip-validation.test.js` with 29 tests covering
  duplicate address detection, per-recipient amount validation, message
  length limits, self-tip detection, totalAmount computation, and
  MAX_BATCH_SIZE/MIN_TIP_STX constants.
- `frontend/src/test/token-tip-validation.test.js` with 23 tests covering
  parseContractId splitting, integer amount parsing, whitelist status
  response shapes, multi-dot rejection, and null/undefined inputs.
- `frontend/src/test/useBalance.test.js` expanded to 17 tests adding
  refetch behavior, address change re-fetch, null address reset,
  lastFetched timestamp, and refetch function exposure.
- `frontend/src/test/stacks-utils.test.js` with 7 tests covering
  isWalletInstalled with various provider combinations, appDetails
  name and icon, and network resolution.
- `frontend/src/test/pwa-cache-rules.test.js` with 58 tests covering
  PWA runtime cache strategy validation for balance, transaction,
  nonce, and static asset endpoints.
- `frontend/src/test/Leaderboard.test.jsx` with 12 tests covering
  rendering, loading skeleton, error state, tab switching, refresh
  button, timestamp display, and Load More behavior.
- `frontend/src/test/buildLeaderboardStats.test.js` with 12 tests
  covering aggregation, self-tips, address counting, and sorting.
- `frontend/src/test/contractEvents.test.js` expanded to 22 tests
  adding mid-pagination short page, second-page error, empty repr
  filtering, falsy block_time, and combined offset+maxPages.

- `BatchTip` now reports accurate outcome summaries after on-chain
  confirmation instead of always showing a blanket success toast. Non-strict
  batch results are parsed to show full success, partial success, or all
  failed outcomes (Issue #238).

- `RecentTips` tip-back modal now provides complete dialog keyboard support:
  it traps `Tab`/`Shift+Tab` focus within the modal, closes on `Escape`,
  restores focus to the previously focused trigger on close, and supports
  backdrop click-to-close while preserving dialog semantics (Issue #236).

- `clearTipCache()` was executed inside automatic message-enrichment
  effects in both `RecentTips` and `TipHistory`, causing each refresh
  cycle to wipe shared tip-detail cache data for all mounted consumers.
  Automatic enrichment now preserves cache state, and hard cache clears
  are restricted to user-initiated `Refresh`/`Retry` actions only
  (Issue #235).
- Tip-detail cache entries in `fetchTipDetails` now use TTL-based
  expiration (`CACHE_TTL_MS = 5 minutes`) so stale entries are
  transparently refreshed on demand without global cache resets.
- When a TTL-expired tip detail refresh fails, `fetchTipDetail` now
  returns the last cached value as a resilience fallback instead of
  dropping message data to `null` immediately.
- `fetchTipMessages` now normalizes, validates (positive integer only),
  and deduplicates tip IDs per batch to avoid redundant read-only calls
  and silently skip invalid identifiers.
- `RecentTips` and `TipHistory` now deduplicate tip IDs before invoking
  `fetchTipMessages`, reducing duplicate message lookups when event
  streams contain repeated `tip-sent` entries.

- `fetchTipDetails` now exports `getCacheSize()` and `getCachedEntry()`
  as test/debug helpers to verify cache entry lifecycle and expiration.

### Added (Issue #235)

- `frontend/src/test/fetchTipDetails.test.js` with 33 tests covering
  cold/warm cache paths, TTL expiry, null/error handling, cache clear
  semantics, helper exports, and batch message fetch behavior.
- `frontend/src/test/RecentTips.refresh.test.jsx` with 4 tests proving
  `clearTipCache()` is not called by automatic enrichment and is only
  triggered by user `Refresh`/`Retry` actions, plus tip ID deduplication
  before message enrichment.
- `frontend/src/test/TipHistory.refresh.test.jsx` with 4 tests proving
  `clearTipCache()` is not called by automatic enrichment and is only
  triggered by user `Refresh`/`Retry` actions, plus tip ID deduplication
  before message enrichment.

### Added (Issue #236)

- `frontend/src/test/RecentTips.modal-a11y.test.jsx` with 4 integration
  tests covering modal role semantics, initial focus placement,
  `Escape` close with focus restoration, focus trapping, and backdrop
  click close behavior.

### Added (Issue #238)

- `frontend/src/lib/batchTipResults.js` with result parsing helpers used to
  summarize per-recipient outcomes from confirmed batch-tip transactions.
- `frontend/src/test/batch-tip-results.test.js` with 6 tests covering
  non-strict result parsing, strict-mode fallback parsing, and final
  user-facing outcome message generation.

- Four components (`Leaderboard`, `RecentTips`, `TipHistory`,
  `useNotifications`) each polled the same Stacks API contract-events
  endpoint on independent intervals, generating up to 15+ requests per
  minute and risking Hiro API rate limits.  All consumers now read from
  a single shared event cache managed by `TipContext` (Issue #234).
- `Leaderboard` no longer runs up to 10 sequential API pages on every
  60-second tick.  The initial page load still auto-paginates up to 10
  pages; subsequent refreshes use the shared 30-second cache cycle.
- `RecentTips` and `TipHistory` message enrichment (the secondary
  `fetchTipMessages` phase) now uses a cancellation guard to avoid
  stale updates when the component unmounts or the tip list changes
  before the fetch completes.

### Added (Issue #234)

- `frontend/src/lib/contractEvents.js`: Centralised Stacks API fetching
  layer with `fetchAllContractEvents`, `parseRawEvents`, `buildEventsUrl`,
  and constants `PAGE_LIMIT`, `MAX_INITIAL_PAGES`, `POLL_INTERVAL_MS`.
- Shared event cache in `TipContext`: `events`, `eventsLoading`,
  `eventsError`, `eventsMeta`, `lastEventRefresh`, `refreshEvents`,
  and `loadMoreEvents` exposed to all consumers via `useTipContext()`.
- Stale-response guard in `refreshEvents` using a monotonic `fetchIdRef`
  counter to discard responses from superseded requests.
- `frontend/src/test/contractEvents.test.js`: 17 unit tests for
  `parseRawEvents` and `fetchAllContractEvents`.
- `frontend/src/test/TipContext.shared-cache.test.jsx`: 8 integration
  tests for the provider's event cache lifecycle.

### Fixed

- Tip-back modal in `RecentTips` accepted zero, negative, and non-numeric
  amounts before opening the wallet prompt. Client-side validation now
  blocks invalid submissions with real-time feedback (Issue #233).

### Added (Issue #233)

- `validateTipBackAmount` function exported from `RecentTips` for
  testability. Rejects empty, NaN, non-positive, below-minimum, and
  above-maximum values, returning a descriptive error string.
- `MIN_TIP_STX` (0.001) and `MAX_TIP_STX` (10,000) constants exported
  from `RecentTips`, matching the existing `SendTip` constraints.
- Real-time validation on the tip-back amount input via
  `handleTipBackAmountChange`, which updates the error state on each
  keystroke.
- Validation guard at the top of `handleTipBack` that prevents the
  `openContractCall` wallet prompt from opening when the amount is invalid,
  and surfaces a toast notification to the user.
- Red border, `aria-invalid`, and `aria-describedby` on the amount input
  when a validation error exists.
- Error message element (`<p>`) below the amount input displaying the
  current validation error text.
- Send button disabled state tied to `tipBackError` presence in addition to
  the existing `sending` flag.
- Accessible labels (`<label htmlFor>` / `id`) on both the amount and
  message inputs inside the tip-back modal.
- `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` on the
  tip-back modal overlay for screen readers.
- `data-testid` attributes on the modal container, amount input, error
  message, send button, and cancel button for deterministic test targeting.
- State reset (amount, message, error) when the tip-back modal opens,
  ensuring a clean slate for each interaction.
- JSDoc documentation on `handleTipBack` describing its validation and
  contract-call flow.
- `frontend/src/test/RecentTips.tipback.test.jsx` with unit tests covering
  boundary constants, empty/missing values, non-numeric/non-positive
  values, minimum and maximum boundaries, valid amounts, and error message
  format.

### Fixed

- `TxStatus` polling restarts on every parent render due to unstable
  callback references. The `checkStatus` `useCallback` dependency array
  included `onConfirmed` and `onFailed`, but `SendTip` passed inline arrow
  functions that changed identity on each render, tearing down and
  recreating the polling timer repeatedly (Issue #232).
- Callbacks now stored in `useRef` containers that are synced via
  lightweight effects, so the polling loop reads the latest callback
  through the ref without depending on its identity. The `useCallback`
  dependency array is reduced to `[txId]` only.
- `SendTip` callbacks (`handleTxConfirmed`, `handleTxFailed`) memoized
  with `useCallback` as an additional best-practice guard against
  unnecessary child re-renders.

### Added (Issue #232)

- JSDoc documentation on `TxStatus` and `SendTip` components describing
  their purpose, props, and callback contracts.
- `EXPLORER_BASE_URL` and `STATUS_CONFIG` constants extracted to module
  scope in `TxStatus` for testability and to avoid per-render allocation.
- `data-testid="tx-status"` on the TxStatus container and
  `data-testid="pending-tx"` on the SendTip pending transaction wrapper.
- `role="status"` and `aria-live="polite"` on the TxStatus container for
  screen-reader announcements of status changes.
- `aria-hidden="true"` on the decorative status dot indicator.
- `frontend/src/test/tx-status.test.jsx` with 19 tests covering rendering,
  accessibility, callback invocation, polling behavior, ref stability,
  and network error resilience.

### Security

- Content-Security-Policy header added to `vercel.json` and `netlify.toml`
  deployment configurations. Both files previously had X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, and Permissions-Policy headers
  but no CSP, leaving the browser without script/style/connect restrictions
  on those deployment targets (Issue #230).
- CSP directives enforce: `default-src 'self'`, `script-src 'self'`,
  `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: https:`,
  `font-src 'self' data:`, `connect-src` with five whitelisted API origins,
  `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `object-src 'none'`, and `upgrade-insecure-requests`.
- `object-src 'none'` and `upgrade-insecure-requests` directives added to
  all three CSP sources (`_headers`, `vercel.json`, `netlify.toml`),
  strengthening the existing static headers file as well.

### Added

- `scripts/validate-csp.cjs` consistency checker that extracts the CSP
  value from all three deployment configs and verifies they are identical.
  Provides directive-level diff output when a mismatch is detected.
- `scripts/validate-csp.test.cjs` with 3 tests verifying the validation
  script reports correct directive count and source list.
- `validate:csp` npm script in root `package.json` for running the
  consistency check.

### Fixed

- `OfflineBanner` no longer uses `fixed top-0` positioning, which caused
  it to overlap the sticky `Header` when the user went offline. Both
  elements occupied the same viewport position with the same z-index,
  making navigation, wallet controls, and the disconnect button
  inaccessible (Issue #231).
- `OfflineBanner` now uses `sticky top-0` with a higher z-index (`z-[60]`)
  and renders in normal document flow before the Header, pushing it down
  naturally when visible.
- `Header` component conditionally adjusts its sticky `top` offset based
  on the `useOnlineStatus` hook value, shifting down by the banner height
  when offline to prevent stacking under the banner during scroll.
- Header offset transition animated with `transition-[top] duration-300`
  for smooth visual adjustment on connectivity changes.

### Added (Issue #231)

- Dismiss button on the `OfflineBanner` allowing users to manually close
  the offline warning. The dismissed state resets when connectivity
  returns so the banner reappears on the next offline transition.
- `BANNER_HEIGHT_CLASS` exported constant from `OfflineBanner` for shared
  height reference between components.
- `data-testid` attributes on both `OfflineBanner` and `Header` nav
  elements for reliable test targeting.
- `aria-live="assertive"` on the offline banner for explicit screen
  reader announcement.
- `@keyframes slide-down` animation in `index.css` for the banner
  entrance effect.
- `@media (prefers-reduced-motion: reduce)` rule disabling all custom
  animations for accessibility compliance.
- JSDoc documentation on `OfflineBanner`, `Header`, and `useOnlineStatus`.
- `OfflineBanner.test.jsx` with 14 tests covering visibility, positioning,
  accessibility, animation, exported constants, and dismiss behavior.
- `Header.test.jsx` with 12 tests covering offline positioning, layout,
  accessibility, and content rendering.
- `useOnlineStatus.test.jsx` with 6 tests covering initial state, event
  handling, rapid toggling, and cleanup on unmount.

### Security (prior)

- Chainhook `parseBody` now enforces a 10 MB request body size limit.
  Oversized payloads are rejected with HTTP 413, preventing memory
  exhaustion from multi-gigabyte POST requests (Issue #229).
- `Content-Length` header is checked before body parsing begins,
  allowing early rejection without buffering any data.
- `/api/tips/user/:address` endpoint now validates the address against
  a Stacks address regex (`SP|SM|ST` prefix + 33-41 alphanumeric chars),
  rejecting malformed or arbitrarily long strings with HTTP 400
  (Issue #229).
- `/api/tips` query parameters `limit` and `offset` are now validated:
  limit must be 1-100, offset must be non-negative. Invalid values
  return HTTP 400 with descriptive error messages.
- `/api/tips/:id` endpoint adds a defensive non-negative integer check
  on the parsed tip ID.

### Added

- `chainhook/validation.js` module exporting `MAX_BODY_SIZE`,
  `STACKS_ADDRESS_RE`, `isValidStacksAddress`, and `sanitizeQueryInt`
  helpers for server-side input validation.
- `chainhook/server.js` now exports `parseBody`, `extractEvents`,
  `parseTipEvent`, and `sendJson` for unit testing. Server startup
  is guarded behind a main-module check so imports do not start the
  HTTP listener.
- JSDoc comments on all exported server functions.
- `chainhook/validation.test.js` with 25 tests covering the
  `MAX_BODY_SIZE` constant, `STACKS_ADDRESS_RE` positive and negative
  cases, `isValidStacksAddress` type guards, and `sanitizeQueryInt`
  bounds checking.
- `chainhook/server.test.js` with 16 tests covering `parseBody`
  (valid JSON, invalid JSON, empty body, oversized body, boundary
  size), `extractEvents` (empty payload, SmartContractEvent,
  print_event, unrecognised type, contract_event fallback, multi-tx
  blocks), and `parseTipEvent` (valid tip, non-tip, missing/string
  event).
- `npm test` script in `chainhook/package.json`.

### Fixed

- `loadMetrics()` now deep-copies all nested object fields (`pageViews`,
  `batchSizes`, `tabNavigations`, `routeRedirects`, `errors`) from
  `DEFAULT_METRICS` instead of shallow-spreading them. The previous
  implementation shared mutable references, so incrementing any map-based
  metric permanently mutated the defaults and caused stale data to leak
  across `analytics.reset()` boundaries (Issue #228).
- `analytics.trackBatchTipStarted()` and `analytics.trackBatchTipSubmitted()`
  were called by the test suite but did not exist, producing `TypeError`.
  Both methods (and their counters) are now implemented (Issue #228).

### Added

- `batchTipsStarted`, `batchTipsSubmitted`, `batchTipsConfirmed`,
  `batchTipsFailed`, and `batchTipsCancelled` counters in analytics
  `DEFAULT_METRICS` for full batch-tip funnel tracking.
- `trackBatchTipStarted()`, `trackBatchTipSubmitted()`,
  `trackBatchTipConfirmed()`, `trackBatchTipFailed()`, and
  `trackBatchTipCancelled()` methods on the analytics object, each
  documented with JSDoc.
- `trackBatchSize(size)` method to record batch-tip recipient counts
  as a frequency map.
- `getSummary()` now includes `batchTipsStarted`, `batchTipsSubmitted`,
  `batchTipsConfirmed`, `batchTipsFailed`, `batchTipsCancelled`,
  `batchCompletionRate`, `batchDropOffRate`, `averageBatchSize`, and
  `sortedBatchSizes` computed analytics.
- `BatchTip` component wired to call all five batch-tracking methods
  and `trackBatchSize` at the appropriate funnel stages (start, submit,
  confirm, cancel, fail).
- 9 new analytics tests covering batch confirmed/failed/cancelled events,
  batch funnel lifecycle, batch size frequency map, average batch size,
  sorted batch sizes, and extended zero-rate and reset assertions.

### Fixed (prior)

- `useBalance` no longer wraps the API response in `BigInt()`. The balance is
  stored as the raw API string (micro-STX) and converted at point of use via
  the new `balance-utils` helpers, eliminating the `BigInt` / `Number` type
  mismatch that caused silent precision bugs (Issue #227).
- Inline `Number(balance) / 1_000_000` conversions in `SendTip` and `BatchTip`
  replaced with the centralised `microToStx()` helper.
- Inline `balanceSTX.toLocaleString(undefined, { ... })` display templates in
  `SendTip` and `BatchTip` replaced with the centralised `formatBalance()`
  helper.
- Magic-number `1_000_000` divisor in `SendTip` balance-vs-deduction checks
  replaced with `microToStx(totalDeduction(...))` calls.
- Post-condition arithmetic functions (`maxTransferForTip`, `feeForTip`,
  `totalDeduction`, `recipientReceives`) now coerce inputs via `Number()` to
  guard against string or BigInt values leaking through.
- Duplicate `MICRO_STX` constant in `utils.js` replaced with an import from
  `balance-utils`, establishing a single source of truth.

### Added

- `balance-utils.js` pure module with `MICRO_STX` constant, `parseBalance`,
  `microToStx`, `stxToMicro`, `formatBalance`, and `isValidBalance` helpers
  for safe, centralised balance conversion and display.
- `useBalance` hook now returns a memoised `balanceStx` property so consumers
  can access the STX value directly without importing `microToStx`.
- `useBalance` hook validates the API response shape and coerces the balance
  to a string, throwing a descriptive error for unexpected formats.
- `MICRO_STX` re-exported from `utils.js` for backward compatibility.
- 52 unit tests for `balance-utils` covering all helpers and edge cases.
- 9 unit tests for the `useBalance` hook covering fetch, coercion, error
  handling, and the derived `balanceStx` property.
- 4 string-input coercion tests for post-condition arithmetic functions.
- 2 tests verifying the `MICRO_STX` re-export from `utils.js`.

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
