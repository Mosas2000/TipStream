/**
 * @module hooks/useFeedConnectionStatus
 *
 * Hook for monitoring connection status and enrichment API health.
 *
 * Detects network issues and API degradation to inform UI about
 * reliability and enable graceful fallback behaviors.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { STACKS_API_BASE } from '../config/contracts';

const DEGRADATION_THRESHOLD = 3;
const API_PROBE_PATH = '/v2/info';
const API_PROBE_INTERVAL_MS = 30_000;
const API_PROBE_TIMEOUT_MS = 5_000;

export function useFeedConnectionStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [failureCount, setFailureCount] = useState(0);
  const [lastSuccess, setLastSuccess] = useState(() => Date.now());

  const recordSuccess = useCallback(() => {
    setFailureCount(0);
    setApiHealthy(true);
    setLastSuccess(Date.now());
  }, []);

  const recordFailure = useCallback(() => {
    setFailureCount(prev => {
      const next = prev + 1;
      if (next >= DEGRADATION_THRESHOLD) {
        setApiHealthy(false);
      }
      return next;
    });
  }, []);

  const recordTimeout = useCallback(() => {
    recordFailure();
  }, [recordFailure]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatus = useCallback(() => {
    if (!isOnline) return 'offline';
    if (!apiHealthy) return 'degraded';
    return 'healthy';
  }, [isOnline, apiHealthy]);

  const reset = useCallback(() => {
    setFailureCount(0);
    setApiHealthy(true);
  }, []);

  return {
    isOnline,
    apiHealthy,
    failureCount,
    lastSuccess,
    status: getStatus(),
    recordSuccess,
    recordFailure,
    recordTimeout,
    reset,
  };
}
