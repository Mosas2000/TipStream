/**
 * @module lib/cachedApiClient
 *
 * HTTP client wrapper that automatically caches GET responses.
 *
 * Intercepts successful responses and stores them in persistent cache
 * for automatic fallback during API degradation.
 */

import { setCacheEntry, getCacheEntry } from './persistentCache';

/**
 * Configuration for cached endpoints.
 *
 * Maps endpoint patterns to cache TTL values.
 */
const CACHE_CONFIG = {
  '/stats': 5 * 60 * 1000,
  '/leaderboard': 10 * 60 * 1000,
  '/profile/': 10 * 60 * 1000,
  '/events': 30 * 1000,
};

/**
 * Generate cache key from endpoint URL.
 *
 * @param {string} endpoint - API endpoint
 * @returns {string} Cache key
 */
function getCacheKeyForEndpoint(endpoint) {
  return `api_${endpoint.replace(/\//g, '_')}`;
}

/**
 * Get TTL for an endpoint.
 *
 * @param {string} endpoint - API endpoint
 * @returns {number} TTL in milliseconds
 */
function getTtlForEndpoint(endpoint) {
  for (const [pattern, ttl] of Object.entries(CACHE_CONFIG)) {
    if (endpoint.includes(pattern)) {
      return ttl;
    }
  }
  return 5 * 60 * 1000;
}

/**
 * Make a cached GET request.
 *
 * @param {string} url - Full URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
export async function cachedFetch(url, options = {}) {
  const { timeout = 10000, useCache = true } = options;

  if (useCache && options.method?.toUpperCase() !== 'POST') {
    const cacheKey = getCacheKeyForEndpoint(url);
    const cached = getCacheEntry(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (useCache && response.status === 200) {
      const cacheKey = getCacheKeyForEndpoint(url);
      const ttl = getTtlForEndpoint(url);
      setCacheEntry(cacheKey, data, ttl);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (useCache && options.method?.toUpperCase() !== 'POST') {
      const cacheKey = getCacheKeyForEndpoint(url);
      const cached = getCacheEntry(cacheKey);
      if (cached) {
        return cached;
      }
    }

    throw err;
  }
}

/**
 * Make a GET request with caching.
 *
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
export async function cachedGet(url, options = {}) {
  return cachedFetch(url, { ...options, method: 'GET' });
}

/**
 * Make a POST request (bypasses cache).
 *
 * @param {string} url - URL to fetch
 * @param {Object} body - Request body
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
export async function cachedPost(url, body, options = {}) {
  return cachedFetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
    useCache: false,
  });
}

/**
 * Register a custom cache configuration for an endpoint.
 *
 * @param {string} pattern - URL pattern to match
 * @param {number} ttlMs - Cache TTL in milliseconds
 */
export function registerCachePattern(pattern, ttlMs) {
  CACHE_CONFIG[pattern] = ttlMs;
}
