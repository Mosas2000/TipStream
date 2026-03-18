/**
 * @module lib/eventPageCache
 *
 * Event page caching with invalidation boundaries and TTL management.
 *
 * Caches fetched event pages indexed by (pageSize, offset) to avoid
 * redundant API calls. Includes automatic invalidation for stale pages
 * based on configurable TTL and explicit invalidation signals.
 */

/**
 * TTL for cached event pages in milliseconds.
 * After this duration, pages are considered stale and re-fetched.
 */
const PAGE_CACHE_TTL_MS = 2 * 60 * 1000;

/**
 * In-memory cache for event pages.
 * Key format: "pageSize:offset"
 * Value: { events: Array, expiresAt: number, metadata: Object }
 */
const eventPageCache = new Map();

/**
 * Cache for event pagination state.
 * Tracks the total count and whether more events exist.
 */
let paginationState = {
  total: 0,
  hasMore: false,
  lastUpdated: 0,
};

/**
 * Generate a cache key for a page.
 *
 * @param {number} pageSize - Events per page.
 * @param {number} offset - Offset into event list.
 * @returns {string} Cache key.
 */
function getCacheKey(pageSize, offset) {
  return `${pageSize}:${offset}`;
}

/**
 * Get a cached page if it exists and has not expired.
 *
 * @param {number} pageSize - Events per page.
 * @param {number} offset - Offset into event list.
 * @returns {Object|null} Cached page object or null.
 */
export function getCachedPage(pageSize, offset) {
  const key = getCacheKey(pageSize, offset);
  const entry = eventPageCache.get(key);

  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    eventPageCache.delete(key);
    return null;
  }

  return entry;
}

/**
 * Store a page in the cache.
 *
 * @param {number} pageSize - Events per page.
 * @param {number} offset - Offset into event list.
 * @param {Array} events - Events in this page.
 * @param {Object} metadata - Additional metadata (total, hasMore, etc).
 */
export function setCachedPage(pageSize, offset, events, metadata = {}) {
  const key = getCacheKey(pageSize, offset);
  eventPageCache.set(key, {
    events: Array.isArray(events) ? [...events] : [],
    metadata: { ...metadata },
    expiresAt: Date.now() + PAGE_CACHE_TTL_MS,
  });
}

/**
 * Clear all cached pages.
 * Useful for hard refreshes triggered by user action.
 */
export function clearPageCache() {
  eventPageCache.clear();
  paginationState = { total: 0, hasMore: false, lastUpdated: 0 };
}

/**
 * Invalidate cached pages matching a pageSize.
 * Called when events are added/removed to keep early pages fresh.
 *
 * @param {number} pageSize - Only invalidate pages of this size.
 * @param {number} [preserveFrom=0] - Preserve pages at offset >= this value.
 */
export function invalidatePagesWithSize(pageSize, preserveFrom = 0) {
  for (const key of eventPageCache.keys()) {
    const [size, offset] = key.split(':').map(Number);
    if (size === pageSize && offset < preserveFrom) {
      eventPageCache.delete(key);
    }
  }
}

/**
 * Update pagination state (total count, hasMore flag).
 *
 * @param {number} total - Total events available.
 * @param {boolean} hasMore - Whether more events can be fetched.
 */
export function updatePaginationState(total, hasMore) {
  paginationState = { total, hasMore, lastUpdated: Date.now() };
}

/**
 * Get current pagination state.
 *
 * @returns {Object} State object with total, hasMore, lastUpdated.
 */
export function getPaginationState() {
  return { ...paginationState };
}

/**
 * Get cache statistics for debugging.
 *
 * @returns {Object} Cache size, page count, pagination state.
 */
export function getCacheStats() {
  return {
    cacheSize: eventPageCache.size,
    pageCache: Array.from(eventPageCache.keys()),
    paginationState: getPaginationState(),
  };
}
