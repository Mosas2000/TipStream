/**
 * @module config/routes
 * @description Centralised route path constants for the TipStream SPA.
 *
 * Every path used in navigation, redirects, and links should reference
 * these constants instead of hard-coding strings. This prevents typos,
 * makes refactors safer, and provides a single source of truth for the
 * routing table.
 *
 * @example
 * import { ROUTE_SEND, DEFAULT_AUTHENTICATED_ROUTE } from './config/routes';
 * <NavLink to={ROUTE_SEND}>Send</NavLink>
 * <Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />
 */

/**
 * Root path -- redirects to DEFAULT_AUTHENTICATED_ROUTE for signed-in users.
 * @type {string}
 */
export const ROUTE_HOME = '/';

/**
 * Send a single STX tip.
 * @type {string}
 */
export const ROUTE_SEND = '/send';

/**
 * Send a token-based tip (SIP-010).
 * @type {string}
 */
export const ROUTE_TOKEN_TIP = '/token-tip';

/**
 * Live feed of recent tips across the platform.
 * @type {string}
 */
export const ROUTE_FEED = '/feed';

/**
 * Leaderboard showing top tippers and recipients.
 * @type {string}
 */
export const ROUTE_LEADERBOARD = '/leaderboard';

/**
 * Current user's tip history (sent and received).
 * @type {string}
 */
export const ROUTE_ACTIVITY = '/activity';

/**
 * User profile management.
 * @type {string}
 */
export const ROUTE_PROFILE = '/profile';

/**
 * Block/unblock addresses.
 * @type {string}
 */
export const ROUTE_BLOCK = '/block';

/**
 * Platform-wide statistics.
 * @type {string}
 */
export const ROUTE_STATS = '/stats';

/**
 * Admin dashboard (owner-only, guarded by RequireAdmin).
 * @type {string}
 */
export const ROUTE_ADMIN = '/admin';

/**
 * Telemetry dashboard (owner-only, guarded by RequireAdmin).
 * @type {string}
 */
export const ROUTE_TELEMETRY = '/telemetry';

/**
 * The route that "/" redirects to when the user is authenticated.
 * Change this single value to alter the default landing page site-wide.
 * @type {string}
 */
export const DEFAULT_AUTHENTICATED_ROUTE = ROUTE_SEND;

/**
 * Human-readable navigation labels keyed by route path.
 * Used by the nav bar and any component that needs a display name for a route.
 * @type {Record<string, string>}
 */
export const ROUTE_LABELS = {
  [ROUTE_SEND]: 'Send Tip',
  [ROUTE_TOKEN_TIP]: 'Token Tip',
  [ROUTE_FEED]: 'Live Feed',
  [ROUTE_LEADERBOARD]: 'Leaderboard',
  [ROUTE_ACTIVITY]: 'My Activity',
  [ROUTE_PROFILE]: 'Profile',
  [ROUTE_BLOCK]: 'Block',
  [ROUTE_STATS]: 'Stats',
  [ROUTE_ADMIN]: 'Admin',
  [ROUTE_TELEMETRY]: 'Telemetry',
};

/**
 * Document title templates keyed by route path.
 *
 * Consumed by the usePageTitle hook to set document.title on navigation.
 * Format: "Section -- TipStream" so the page purpose appears first in
 * browser tabs, bookmarks, and screen-reader announcements.
 * @type {Record<string, string>}
 */
export const ROUTE_TITLES = {
  [ROUTE_SEND]: 'Send Tip -- TipStream',
  [ROUTE_TOKEN_TIP]: 'Token Tip -- TipStream',
  [ROUTE_FEED]: 'Live Feed -- TipStream',
  [ROUTE_LEADERBOARD]: 'Leaderboard -- TipStream',
  [ROUTE_ACTIVITY]: 'My Activity -- TipStream',
  [ROUTE_PROFILE]: 'Profile -- TipStream',
  [ROUTE_BLOCK]: 'Block Manager -- TipStream',
  [ROUTE_STATS]: 'Platform Stats -- TipStream',
  [ROUTE_ADMIN]: 'Admin Dashboard -- TipStream',
  [ROUTE_TELEMETRY]: 'Telemetry -- TipStream',
};

/**
 * Fallback document title when no route-specific title is defined.
 * @type {string}
 */
export const DEFAULT_TITLE = 'TipStream';

/**
 * Extended route metadata keyed by path.
 *
 * Each entry describes the route's purpose, whether it requires
 * authentication, and whether it is restricted to the contract owner.
 * Components can consume this map for dynamic menus, breadcrumbs,
 * or automated sitemap generation.
 *
 * @type {Record<string, { description: string, requiresAuth: boolean, adminOnly: boolean }>}
 */
export const ROUTE_META = {
  [ROUTE_SEND]: {
    description: 'Send a single STX micro-tip to any Stacks address.',
    requiresAuth: true,
    adminOnly: false,
  },
  [ROUTE_TOKEN_TIP]: {
    description: 'Send a SIP-010 token tip.',
    requiresAuth: true,
    adminOnly: false,
  },
  [ROUTE_FEED]: {
    description: 'Real-time feed of tips across the platform.',
    requiresAuth: false,
    adminOnly: false,
  },
  [ROUTE_LEADERBOARD]: {
    description: 'Top tippers and recipients ranked by volume.',
    requiresAuth: false,
    adminOnly: false,
  },
  [ROUTE_ACTIVITY]: {
    description: 'Personal tip history for sent and received tips.',
    requiresAuth: true,
    adminOnly: false,
  },
  [ROUTE_PROFILE]: {
    description: 'Manage display name, bio, and avatar.',
    requiresAuth: true,
    adminOnly: false,
  },
  [ROUTE_BLOCK]: {
    description: 'Block or unblock specific Stacks addresses.',
    requiresAuth: true,
    adminOnly: false,
  },
  [ROUTE_STATS]: {
    description: 'Platform-wide aggregate statistics.',
    requiresAuth: false,
    adminOnly: false,
  },
  [ROUTE_ADMIN]: {
    description: 'Pause/resume, fee configuration, ownership transfer.',
    requiresAuth: true,
    adminOnly: true,
  },
  [ROUTE_TELEMETRY]: {
    description: 'Production telemetry, Web Vitals, conversion metrics, and error tracking.',
    requiresAuth: true,
    adminOnly: true,
  },
};
