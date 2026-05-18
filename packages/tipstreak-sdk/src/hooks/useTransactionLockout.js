/**
 * @module tipstreak-sdk/hooks/useTransactionLockout
 *
 * React hook for controlling transaction availability based on data source state.
 *
 * Prevents transactions when live data is unavailable or degraded,
 * and provides user-facing messaging explaining why actions are disabled.
 *
 * @requires react
 */

import { useMemo, useCallback } from 'react';

/**
 * @typedef {'live'|'cache'|'none'} DataSourceState
 */

/**
 * Control transaction availability based on data source health.
 *
 * @param {object} [sources]
 * @param {DataSourceState} [sources.primary='live'] - Primary data source state
 * @param {DataSourceState} [sources.secondary='live'] - Secondary data source state
 * @returns {{
 *   isLocked: boolean,
 *   lockReason: string|null,
 *   canSuggestRetry: boolean,
 *   severity: 'none'|'warning'|'critical',
 *   secondary: DataSourceState,
 *   getTransactionStatus: () => { allowed: boolean, reason: string|null, severity: string, canRetry: boolean }
 * }}
 *
 * @example
 * const { isLocked, lockReason } = useTransactionLockout({ primary: 'cache' });
 * // isLocked: true, lockReason: 'Using cached data. Transactions are temporarily disabled...'
 */
export function useTransactionLockout(sources = {}) {
  const { primary = 'live', secondary = 'live' } = sources;

  const isLocked = useMemo(() => primary === 'none' || primary === 'cache', [primary]);

  const lockReason = useMemo(() => {
    if (primary === 'none') return 'Unable to verify your account. Please check your connection.';
    if (primary === 'cache') return 'Using cached data. Transactions are temporarily disabled while we reconnect.';
    return null;
  }, [primary]);

  const canSuggestRetry = useMemo(() => primary === 'cache' || primary === 'none', [primary]);

  const severity = useMemo(() => {
    if (primary === 'none') return 'critical';
    if (primary === 'cache') return 'warning';
    return 'none';
  }, [primary]);

  const getTransactionStatus = useCallback(() => ({
    allowed: !isLocked,
    reason: lockReason,
    severity,
    canRetry: canSuggestRetry,
  }), [isLocked, lockReason, severity, canSuggestRetry]);

  return { isLocked, lockReason, canSuggestRetry, severity, secondary, getTransactionStatus };
}
