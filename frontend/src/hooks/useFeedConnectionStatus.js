/**
 * @module hooks/useFeedConnectionStatus
 *
 * Hook for monitoring connection status and enrichment API health.
 *
 * Detects network issues and API degradation to inform UI about
 * reliability and enable graceful fallback behaviors.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const CONNECTION_TIMEOUT_MS = 5000;
const DEGRADATION_THRESHOLD = 3;

export function useFeedConnectionStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [failureCount, setFailureCount] = useState(0);
  const lastSuccessRef = useRef(Date.now());

  const recordSuccess = useCallback(() => {
    setFailureCount(0);
    setApiHealthy(true);
    lastSuccessRef.current = Date.now();
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
    lastSuccess: lastSuccessRef.current,
    status: getStatus(),
    recordSuccess,
    recordFailure,
    recordTimeout,
    reset,
  };
}
