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
const API_DEGRADED_LATENCY_MS = 2_500;

export function useFeedConnectionStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [apiHealthy, setApiHealthy] = useState(true);
  const [failureCount, setFailureCount] = useState(0);
  const [lastSuccess, setLastSuccess] = useState(() => Date.now());

  const apiProbeUrl = useMemo(() => `${STACKS_API_BASE}${API_PROBE_PATH}`, [STACKS_API_BASE]);
  const [apiReachable, setApiReachable] = useState(null);
  const [apiLatencyMs, setApiLatencyMs] = useState(null);
  const [apiProbing, setApiProbing] = useState(false);
  const [lastProbeAt, setLastProbeAt] = useState(null);
  const [lastProbeError, setLastProbeError] = useState(null);

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

  const probeApiHealth = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    setApiProbing(true);

    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_PROBE_TIMEOUT_MS);

    try {
      const response = await fetch(apiProbeUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setApiReachable(true);
      setApiLatencyMs(Date.now() - start);
      setLastProbeAt(Date.now());
      setLastProbeError(null);
    } catch (err) {
      const message = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'error');
      setApiReachable(false);
      setApiLatencyMs(null);
      setLastProbeAt(Date.now());
      setLastProbeError(message);
    } finally {
      clearTimeout(timeoutId);
      setApiProbing(false);
    }
  }, [apiProbeUrl]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setApiReachable(null);
      setApiLatencyMs(null);
      setApiProbing(false);
      setLastProbeAt(null);
      setLastProbeError(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [probeApiHealth]);

  useEffect(() => {
    if (!isOnline) return;

    probeApiHealth();
    const intervalId = setInterval(probeApiHealth, API_PROBE_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isOnline, probeApiHealth]);

  const browserStatus = useMemo(() => (isOnline ? 'online' : 'offline'), [isOnline]);

  const apiStatus = useMemo(() => {
    if (!isOnline) return 'unknown';
    if (apiReachable === null) return 'unknown';
    if (apiReachable === false) return 'unreachable';

    if (typeof apiLatencyMs === 'number' && apiLatencyMs >= API_DEGRADED_LATENCY_MS) {
      return 'degraded';
    }

    return apiHealthy ? 'healthy' : 'degraded';
  }, [isOnline, apiReachable, apiHealthy, apiLatencyMs]);

  const combinedStatus = useMemo(() => {
    if (browserStatus === 'offline') return 'offline';
    if (apiStatus === 'unknown') return 'checking';
    if (apiStatus === 'unreachable') return 'api-down';
    if (apiStatus === 'degraded') return 'degraded';
    return 'healthy';
  }, [browserStatus, apiStatus]);

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
    browserStatus,

    apiStatus,
    apiHealthy,
    apiReachable,
    apiLatencyMs,
    apiProbing,
    lastProbeAt,
    lastProbeError,

    failureCount,
    lastSuccess,

    status: combinedStatus,
    legacyStatus: getStatus(),

    probeNow: probeApiHealth,

    recordSuccess,
    recordFailure,
    recordTimeout,
    reset,
  };
}
