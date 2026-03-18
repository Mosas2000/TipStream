/**
 * @module hooks/useCachedLeaderboard
 *
 * Hook for fetching leaderboard data with cache fallback.
 *
 * Handles leaderboard-specific caching with appropriate TTL
 * and error handling.
 */

import { useCallback } from 'react';
import { useCachedData } from './useCachedData';

const LEADERBOARD_CACHE_KEY = 'leaderboard';
const LEADERBOARD_CACHE_TTL = 10 * 60 * 1000;

/**
 * Hook for cached leaderboard data.
 *
 * @param {Function} fetchLeaderboardFn - Async function that fetches leaderboard
 * @param {Object} options - Optional configuration
 * @returns {Object} Leaderboard data and state
 */
export function useCachedLeaderboard(fetchLeaderboardFn, options = {}) {
  const {
    timeout = 8000,
  } = options;

  const safeFetch = useCallback(async () => {
    if (!fetchLeaderboardFn) {
      throw new Error('Fetch function required');
    }
    return await fetchLeaderboardFn();
  }, [fetchLeaderboardFn]);

  const {
    data,
    loading,
    error,
    source,
    metadata,
    retry,
    isCached,
    isLive,
  } = useCachedData(LEADERBOARD_CACHE_KEY, safeFetch, {
    ttl: LEADERBOARD_CACHE_TTL,
    timeout,
  });

  return {
    entries: data,
    loading,
    error,
    source,
    metadata,
    retry,
    isCached,
    isLive,
  };
}
