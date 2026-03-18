/**
 * @module hooks/useTransactionLockout
 *
 * Hook for managing transaction state based on API availability.
 *
 * Prevents transactions when live data is unavailable or degraded.
 * Provides messaging to inform users why actions are disabled.
 */

import { useMemo, useCallback } from 'react';

/**
 * Hook for controlling transaction availability.
 *
 * @param {Object} sources - Map of data source states
 * @param {string} sources.primary - Primary data source ('live', 'cache', 'none')
 * @param {string} sources.secondary - Optional secondary data source
 * @returns {Object} Transaction control state and helpers
 */
export function useTransactionLockout(sources = {}) {
  const {
    primary = 'live',
    secondary = 'live',
  } = sources;

  const isLocked = useMemo(() => {
    return primary === 'none' || primary === 'cache';
  }, [primary]);

  const lockReason = useMemo(() => {
    if (primary === 'none') {
      return 'Unable to verify your account. Please check your connection.';
    }
    if (primary === 'cache') {
      return 'Using cached data. Transactions are temporarily disabled while we reconnect.';
    }
    return null;
  }, [primary]);

  const canSuggestRetry = useMemo(() => {
    return primary === 'cache' || primary === 'none';
  }, [primary]);

  const severity = useMemo(() => {
    if (primary === 'none') return 'critical';
    if (primary === 'cache') return 'warning';
    return 'none';
  }, [primary]);

  const getTransactionStatus = useCallback(() => {
    return {
      allowed: !isLocked,
      reason: lockReason,
      severity,
      canRetry: canSuggestRetry,
    };
  }, [isLocked, lockReason, severity, canSuggestRetry]);

  return {
    isLocked,
    lockReason,
    canSuggestRetry,
    severity,
    getTransactionStatus,
  };
}
