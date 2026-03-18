/**
 * @module hooks/useCachedStats
 *
 * Hook for fetching platform stats with cache fallback.
 *
 * Fetches live stats from the API and falls back to cached stats
 * when the API is unavailable or slow.
 */

import { useCallback } from 'react';
import { useCachedData } from './useCachedData';

const STATS_CACHE_KEY = 'platform_stats';
const STATS_CACHE_TTL = 2 * 60 * 1000;

/**
 * Hook for cached platform statistics.
 *
 * @param {Function} fetchStatsFn - Async function that fetches stats
 * @param {Object} options - Optional configuration
 * @returns {Object} Stats data and state
 */
export function useCachedStats(fetchStatsFn, options = {}) {
  const {
    timeout = 8000,
  } = options;

  const safeFetch = useCallback(async () => {
    if (!fetchStatsFn) {
      throw new Error('Fetch function required');
    }
    return await fetchStatsFn();
  }, [fetchStatsFn]);

  const {
    data,
    loading,
    error,
    source,
    metadata,
    retry,
    isCached,
    isLive,
  } = useCachedData(STATS_CACHE_KEY, safeFetch, {
    ttl: STATS_CACHE_TTL,
    timeout,
  });

  return {
    stats: data,
    loading,
    error,
    source,
    metadata,
    retry,
    isCached,
    isLive,
  };
}
