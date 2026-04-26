/**
 * @module hooks/useCachedData
 *
 * Hook for fetching data with automatic fallback to persistent cache.
 *
 * Attempts to fetch live data, caches successful responses, and
 * falls back to cached data if the fetch fails or times out.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { setCacheEntry, getCacheEntry, getCacheMetadata } from '../lib/persistentCache';

/**
 * Hook for data fetching with cache fallback.
 *
 * @param {string} cacheKey - Key for persistent cache storage.
 * @param {Function} fetchFn - Async function that fetches data.
 * @param {Object} options - Configuration options.
 * @param {number} options.ttl - Cache TTL in milliseconds (default 5 mins).
 * @param {number} options.timeout - Fetch timeout in milliseconds (default 10 secs).
 * @returns {Object} result
 * @returns {*} result.data - The fetched or cached data.
 * @returns {boolean} result.loading - Whether a fetch is in progress.
 * @returns {string|null} result.error - Error message if fetch failed and no cache available.
 * @returns {'live'|'cache'|'none'} result.source - The source of the current data.
 * @returns {Object|null} result.metadata - Cache metadata (e.g. expiration).
 * @returns {Function} result.retry - Manually trigger a re-fetch.
 * @returns {Function} result.clearCache - Clear both state and persistent storage for this key.
 * @returns {boolean} result.isCached - Convenience flag for source === 'cache'.
 * @returns {boolean} result.isLive - Convenience flag for source === 'live'.
 */
export function useCachedData(
  cacheKey,
  fetchFn,
  options = {}
) {
  const {
    ttl = 5 * 60 * 1000,
    timeout = 10 * 1000,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('cache');
  const [metadata, setMetadata] = useState(null);
  const cancelledRef = useRef(false);

  const fetchWithTimeout = useCallback(async () => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Fetch timeout')),
        timeout
      );
    });

    try {
      const result = await Promise.race([fetchFn(), timeoutPromise]);
      return result;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [fetchFn, timeout]);

  const loadData = useCallback(async () => {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    try {
      const liveData = await fetchWithTimeout();
      if (cancelledRef.current) return;

      setCacheEntry(cacheKey, liveData, ttl);
      setData(liveData);
      setSource('live');
      setMetadata(null);
    } catch (err) {
      if (cancelledRef.current) return;

      console.warn(`[useCachedData] Failed to fetch live data for "${cacheKey}":`, err.message || err);
      setError(err.message || 'Failed to load live data');

      const cachedData = getCacheEntry(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setSource('cache');
        setMetadata(getCacheMetadata(cacheKey));
      } else {
        setData(null);
        setSource('none');
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, fetchWithTimeout, ttl]);

  const retry = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const clearCache = useCallback(() => {
    setData(null);
    setMetadata(null);
    setSource('none');
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadData]);

  return {
    data,
    loading,
    error,
    source,
    metadata,
    retry,
    clearCache,
    isCached: source === 'cache',
    isLive: source === 'live',
  };
}
