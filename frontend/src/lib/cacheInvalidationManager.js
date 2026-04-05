/**
 * @module lib/cacheInvalidationManager
 *
 * Manages strategic cache invalidation for read-heavy surfaces.
 *
 * Handles selective invalidation patterns based on:
 * - Time-based expiration (TTL)
 * - Event-based triggers (new tips, profile updates)
 * - Manual invalidation requests
 */

import { clearCacheEntry } from './persistentCache';

const CACHE_KEYS = {
  LEADERBOARD: 'leaderboard',
  STATS: 'platform_stats',
  USER_PROFILE: 'user_profile_',
  BALANCE: 'user_balance_',
  EVENTS_FEED: 'events_feed',
};

const INVALIDATION_PATTERNS = {
  onTipSent: ['leaderboard', 'platform_stats', 'events_feed'],
  onProfileUpdate: ['user_profile_', 'leaderboard'],
  onBalanceChange: ['user_balance_'],
};

/**
 * Invalidate caches matching a pattern.
 *
 * @param {string} pattern - Cache key pattern (prefix match)
 */
export function invalidateByPattern(pattern) {
  // Collect keys first to avoid iteration issues when removing
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(pattern)) {
      keysToRemove.push(key.replace('tipstream_cache_', ''));
    }
  }
  
  keysToRemove.forEach(cacheKey => clearCacheEntry(cacheKey));
}

/**
 * Invalidate related caches when a tip is sent.
 *
 * Clears leaderboard, stats, and event feed caches to reflect new tip.
 */
export function invalidateOnTipSent() {
  INVALIDATION_PATTERNS.onTipSent.forEach(pattern => {
    invalidateByPattern(pattern);
  });
}

/**
 * Invalidate related caches when a user profile is updated.
 *
 * Clears user profile and leaderboard caches.
 */
export function invalidateOnProfileUpdate() {
  INVALIDATION_PATTERNS.onProfileUpdate.forEach(pattern => {
    invalidateByPattern(pattern);
  });
}

/**
 * Invalidate balance cache for a user.
 *
 * @param {string} address - User address
 */
export function invalidateUserBalance(address) {
  if (address) {
    clearCacheEntry(`${CACHE_KEYS.BALANCE}${address}`);
  }
}

/**
 * Invalidate all read-heavy view caches.
 *
 * Used when connectivity is restored to ensure fresh data.
 */
export function invalidateAllReadCaches() {
  Object.values(CACHE_KEYS).forEach(key => {
    invalidateByPattern(key);
  });
}

/**
 * Register invalidation handler for transactional events.
 *
 * @param {Object} tipContext - TipContext instance
 * @returns {Function} Unsubscribe function
 */
export function registerInvalidationHandlers(tipContext) {
  if (!tipContext) return () => {};

  invalidateOnTipSent();

  return () => {
    tipContext.triggerRefresh?.();
  };
}

export { CACHE_KEYS };
