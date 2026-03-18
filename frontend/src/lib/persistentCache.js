/**
 * @module lib/persistentCache
 *
 * Persistent cache layer using localStorage for read-heavy view data.
 *
 * Stores successful API responses with timestamps and TTL metadata,
 * enabling graceful fallback to cached data when live APIs are unavailable.
 *
 * Cache entries include:
 * - data: the cached response payload
 * - timestamp: when the entry was cached (ms since epoch)
 * - ttl: time-to-live in milliseconds
 * - version: schema version for migration support
 */

const CACHE_VERSION = 1;
const STORAGE_KEY_PREFIX = 'tipstream_cache_';

/**
 * Generate a storage key for a cache entry.
 *
 * @param {string} cacheKey - The logical cache key.
 * @returns {string} Storage key for localStorage.
 */
function getStorageKey(cacheKey) {
  return `${STORAGE_KEY_PREFIX}${cacheKey}`;
}

/**
 * Store a value in persistent cache.
 *
 * @param {string} key - Logical cache key.
 * @param {*} data - Data to cache.
 * @param {number} ttlMs - Time-to-live in milliseconds.
 * @returns {boolean} True if cached successfully.
 */
export function setCacheEntry(key, data, ttlMs = 5 * 60 * 1000) {
  if (!key || ttlMs <= 0) {
    return false;
  }

  try {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      version: CACHE_VERSION,
    };
    localStorage.setItem(getStorageKey(key), JSON.stringify(entry));
    return true;
  } catch (err) {
    console.error('Failed to cache entry:', err.message);
    return false;
  }
}

/**
 * Retrieve a value from persistent cache if not expired.
 *
 * @param {string} key - Logical cache key.
 * @returns {*|null} Cached data, or null if not found or expired.
 */
export function getCacheEntry(key) {
  if (!key) {
    return null;
  }

  try {
    const stored = localStorage.getItem(getStorageKey(key));
    if (!stored) {
      return null;
    }

    const entry = JSON.parse(stored);
    if (!entry || entry.version !== CACHE_VERSION) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      localStorage.removeItem(getStorageKey(key));
      return null;
    }

    return entry.data;
  } catch (err) {
    console.error('Failed to retrieve cache entry:', err.message);
    return null;
  }
}

/**
 * Get metadata about a cached entry (timestamp and TTL).
 *
 * @param {string} key - Logical cache key.
 * @returns {Object|null} { timestamp, ttl, age, isExpired } or null.
 */
export function getCacheMetadata(key) {
  if (!key) {
    return null;
  }

  try {
    const stored = localStorage.getItem(getStorageKey(key));
    if (!stored) {
      return null;
    }

    const entry = JSON.parse(stored);
    if (!entry || entry.version !== CACHE_VERSION) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const isExpired = age > entry.ttl;

    return {
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      age,
      isExpired,
      expiresAt: entry.timestamp + entry.ttl,
    };
  } catch (err) {
    console.error('Failed to retrieve cache metadata:', err.message);
    return null;
  }
}

/**
 * Delete a cache entry.
 *
 * @param {string} key - Logical cache key.
 * @returns {boolean} True if deleted.
 */
export function clearCacheEntry(key) {
  if (!key) {
    return false;
  }

  try {
    localStorage.removeItem(getStorageKey(key));
    return true;
  } catch (err) {
    console.error('Failed to clear cache entry:', err.message);
    return false;
  }
}

/**
 * Clear all TipStream cache entries.
 *
 * @returns {number} Number of entries cleared.
 */
export function clearAllCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    return keysToRemove.length;
  } catch (err) {
    console.error('Failed to clear all cache:', err.message);
    return 0;
  }
}

/**
 * Get statistics about the cache.
 *
 * @returns {Object} { totalEntries, totalSize, entries }
 */
export function getCacheStats() {
  try {
    const entries = [];
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const stored = localStorage.getItem(key);
        totalSize += stored ? stored.length : 0;
        entries.push({
          key: key.replace(STORAGE_KEY_PREFIX, ''),
          size: stored ? stored.length : 0,
          metadata: getCacheMetadata(key.replace(STORAGE_KEY_PREFIX, '')),
        });
      }
    }

    return {
      totalEntries: entries.length,
      totalSize,
      entries,
    };
  } catch (err) {
    console.error('Failed to get cache stats:', err.message);
    return { totalEntries: 0, totalSize: 0, entries: [] };
  }
}
