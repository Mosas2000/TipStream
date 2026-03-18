/**
 * @module context/ResilienceContext
 *
 * Global context for managing API resilience and cache coordination.
 *
 * Tracks connection status, coordinates cache invalidation, and
 * provides resilience state to all child components.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { invalidateOnTipSent, invalidateOnProfileUpdate } from '../lib/cacheInvalidationManager';

const ResilienceContext = createContext(null);

export function ResilienceProvider({ children }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [apiHealth, setApiHealth] = useState('healthy');
  const [failureCount, setFailureCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setApiHealth('recovering');
      setFailureCount(0);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setApiHealth('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const recordApiSuccess = useCallback(() => {
    setFailureCount(0);
    setApiHealth('healthy');
  }, []);

  const recordApiFailure = useCallback(() => {
    setFailureCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setApiHealth('degraded');
      }
      return next;
    });
  }, []);

  const notifyTipSent = useCallback(() => {
    invalidateOnTipSent();
  }, []);

  const notifyProfileUpdate = useCallback(() => {
    invalidateOnProfileUpdate();
  }, []);

  const getResilienceStatus = useCallback(() => {
    if (!isOnline) return 'offline';
    if (apiHealth === 'offline') return 'offline';
    if (apiHealth === 'degraded') return 'degraded';
    if (apiHealth === 'recovering') return 'recovering';
    return 'healthy';
  }, [isOnline, apiHealth]);

  return (
    <ResilienceContext.Provider
      value={{
        isOnline,
        apiHealth,
        failureCount,
        status: getResilienceStatus(),
        recordApiSuccess,
        recordApiFailure,
        notifyTipSent,
        notifyProfileUpdate,
      }}
    >
      {children}
    </ResilienceContext.Provider>
  );
}

export function useResilience() {
  const context = useContext(ResilienceContext);
  if (!context) {
    throw new Error('useResilience must be used within ResilienceProvider');
  }
  return context;
}
