/**
 * Centralised route path constants.
 *
 * Every path used in navigation, redirects, and links should reference
 * these constants instead of hard-coding strings. This prevents typos,
 * makes refactors safer, and provides a single source of truth for the
 * routing table.
 */

/** Default landing page for authenticated users. */
export const ROUTE_HOME = '/';

/** Send a single STX tip. */
export const ROUTE_SEND = '/send';

/** Send tips to multiple recipients at once. */
export const ROUTE_BATCH = '/batch';

/** Send a token-based tip (SIP-010). */
export const ROUTE_TOKEN_TIP = '/token-tip';

/** Live feed of recent tips across the platform. */
export const ROUTE_FEED = '/feed';

/** Leaderboard showing top tippers and recipients. */
export const ROUTE_LEADERBOARD = '/leaderboard';

/** Current user's tip history (sent and received). */
export const ROUTE_ACTIVITY = '/activity';

/** User profile management. */
export const ROUTE_PROFILE = '/profile';

/** Block/unblock addresses. */
export const ROUTE_BLOCK = '/block';

/** Platform-wide statistics. */
export const ROUTE_STATS = '/stats';

/** Admin dashboard (owner-only). */
export const ROUTE_ADMIN = '/admin';

/**
 * The route that "/" redirects to when the user is authenticated.
 * Change this value to alter the default landing page.
 */
export const DEFAULT_AUTHENTICATED_ROUTE = ROUTE_SEND;

/**
 * All navigable routes in display order.
 * Each entry maps a path to its human-readable label.
 */
export const ROUTE_LABELS = {
  [ROUTE_SEND]: 'Send Tip',
  [ROUTE_BATCH]: 'Batch',
  [ROUTE_TOKEN_TIP]: 'Token Tip',
  [ROUTE_FEED]: 'Live Feed',
  [ROUTE_LEADERBOARD]: 'Leaderboard',
  [ROUTE_ACTIVITY]: 'My Activity',
  [ROUTE_PROFILE]: 'Profile',
  [ROUTE_BLOCK]: 'Block',
  [ROUTE_STATS]: 'Stats',
  [ROUTE_ADMIN]: 'Admin',
};

/**
 * Document title templates keyed by route path.
 *
 * Used by the usePageTitle hook to set document.title on route changes.
 * The format is "Section -- TipStream" so the page purpose appears first
 * in browser tabs and bookmarks.
 */
export const ROUTE_TITLES = {
  [ROUTE_SEND]: 'Send Tip -- TipStream',
  [ROUTE_BATCH]: 'Batch Tip -- TipStream',
  [ROUTE_TOKEN_TIP]: 'Token Tip -- TipStream',
  [ROUTE_FEED]: 'Live Feed -- TipStream',
  [ROUTE_LEADERBOARD]: 'Leaderboard -- TipStream',
  [ROUTE_ACTIVITY]: 'My Activity -- TipStream',
  [ROUTE_PROFILE]: 'Profile -- TipStream',
  [ROUTE_BLOCK]: 'Block Manager -- TipStream',
  [ROUTE_STATS]: 'Platform Stats -- TipStream',
  [ROUTE_ADMIN]: 'Admin Dashboard -- TipStream',
};

/** Fallback document title when no route-specific title is defined. */
export const DEFAULT_TITLE = 'TipStream';
