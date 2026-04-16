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
 * @returns {Object} { data, loading, error, source, metadata, retry, clearCache }
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
    return Promise.race([
      fetchFn(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Fetch timeout')),
          timeout
        )
      ),
    ]);
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

      console.warn(`Failed to fetch data for "${cacheKey}":`, err.message);
      setError(err.message || 'Failed to load data');

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
