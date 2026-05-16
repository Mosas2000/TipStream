import { useState, useEffect, useCallback, useRef } from 'react';
import { STACKS_API_BASE } from '../../config/contracts';
import { useDemoMode } from '../../context/DemoContext';

const API_BASE = STACKS_API_BASE;

/** How often (ms) to poll for an updated transaction status. */
export const POLL_INTERVAL = 8000;

/**
 * Maximum number of poll attempts before the component transitions to the
 * timed_out state.  At 8 s per poll this gives a ~5-minute window.
 *
 * Reduced from 60 to 38 to implement a reasonable timeout that prevents
 * indefinite polling while still allowing sufficient time for typical
 * Stacks block confirmation times (10-30 minutes for finality, but most
 * transactions appear in mempool within 5 minutes).
 */
export const MAX_POLLS = 38;

/**
 * Derived timeout duration in milliseconds, exported so callers and tests
 * can reference the same value without hard-coding it.
 */
export const POLL_TIMEOUT_MS = MAX_POLLS * POLL_INTERVAL;

const EXPLORER_BASE_URL = 'https://explorer.hiro.so/txid';

/** Visual configuration for each transaction status. */
const STATUS_CONFIG = {
  pending: {
    label: 'Pending confirmation...',
    color: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    dot: 'bg-yellow-400 animate-pulse',
  },
  confirmed: {
    label: 'Confirmed on-chain',
    color: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    dot: 'bg-green-500',
  },
  failed: {
    label: 'Transaction failed',
    color: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
  },
  timed_out: {
    label: 'Confirmation timed out',
    color: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200',
    dot: 'bg-orange-500',
  },
};

/**
 * TxStatus -- polls the Stacks API for a transaction's on-chain status and
 * renders a visual indicator (pending / confirmed / failed / timed_out) along
 * with an explorer link.
 *
 * Polling stops automatically when the transaction reaches a terminal state
 * (confirmed or failed) or when MAX_POLLS attempts have been exhausted.  In
 * the latter case the component transitions to the timed_out state and
 * surfaces a retry button so the user can resume polling without reloading
 * the page.
 *
 * @param {Object}   props
 * @param {string}   props.txId          - The transaction ID to monitor.
 * @param {Function} [props.onConfirmed] - Called with the tx data object once
 *                                         the transaction is confirmed.
 * @param {Function} [props.onFailed]    - Called with the failure reason string
 *                                         when the transaction fails.
 * @param {Function} [props.onTimeout]   - Called with the txId when polling
 *                                         exhausts MAX_POLLS without a result.
 */
export default function TxStatus({ txId, onConfirmed, onFailed, onTimeout }) {
  const { demoEnabled } = useDemoMode();
  const [status, setStatus] = useState('pending');
  const [pollCount, setPollCount] = useState(0);

  // Store callbacks in refs so the polling loop is not restarted when the
  // parent passes new arrow-function references on every render (see #232).
  const onConfirmedRef = useRef(onConfirmed);
  const onFailedRef = useRef(onFailed);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => { onConfirmedRef.current = onConfirmed; }, [onConfirmed]);
  useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  // Keep pollCount accessible inside checkStatus without adding it as a
  // dependency, which would recreate the callback on every increment and
  // trigger an extra immediate fetch via the mount effect below.
  const pollCountRef = useRef(pollCount);
  useEffect(() => { pollCountRef.current = pollCount; }, [pollCount]);

  /**
   * Reset polling state so the user can retry after a timeout.
   * Transitions back to pending and resets the poll counter to zero.
   */
  const handleRetry = useCallback(() => {
    setPollCount(0);
    setStatus('pending');
  }, []);

  /**
   * Poll the Stacks API for the current transaction status.
   * Invokes the appropriate callback ref when the transaction reaches a
   * terminal state (success or abort).
   *
   * pollCount is read from a ref so this callback is stable across renders
   * and does not cause the mount effect to re-fire on every increment.
   */
  const checkStatus = useCallback(async () => {
    // Handle demo transaction confirmation simulation
    if (demoEnabled && txId.startsWith('0x')) {
      if (pollCountRef.current >= 1) {
        setStatus('confirmed');
        onConfirmedRef.current?.({ tx_status: 'success', tx_id: txId });
      }
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/extended/v1/tx/${txId}`);
      if (!response.ok) return;

      const data = await response.json();
      const txStatus = data.tx_status;

      if (txStatus === 'success') {
        setStatus('confirmed');
        onConfirmedRef.current?.(data);
      } else if (txStatus === 'abort_by_response' || txStatus === 'abort_by_post_condition') {
        setStatus('failed');
        onFailedRef.current?.(txStatus);
      }
    } catch {
      // Network error -- keep polling
    }
  }, [txId, demoEnabled]);

  // Schedule the next poll using setTimeout (not setInterval) so the
  // effect correctly cleans up when the component unmounts or when a
  // terminal state is reached.
  useEffect(() => {
    if (status !== 'pending') return;

    // Transition to timed_out state when polling limit is exhausted.
    // This prevents indefinite polling and provides users with a clear
    // timeout message and retry option.
    if (pollCount >= MAX_POLLS) {
      setStatus('timed_out');
      onTimeoutRef.current?.(txId);
      return;
    }

    const interval = demoEnabled ? 2000 : POLL_INTERVAL;

    const timer = setTimeout(() => {
      checkStatus();
      setPollCount((c) => c + 1);
    }, interval);

    return () => clearTimeout(timer);
  }, [status, pollCount, checkStatus, demoEnabled, txId]);

  // Fire an immediate check on mount (and whenever txId changes).
  useEffect(() => {
    Promise.resolve().then(() => checkStatus());
  }, [checkStatus]);

  const config = STATUS_CONFIG[status];
  const explorerUrl = demoEnabled ? '#' : `${EXPLORER_BASE_URL}/${txId}?chain=mainnet`;

  return (
    <div
      data-testid="tx-status"
      data-status={status}
      aria-busy={status === 'pending'}
      className={`mt-4 p-4 rounded-xl border ${config.color}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} aria-hidden="true" />
        <span className="text-sm font-medium">{config.label}</span>
        {status === 'pending' && pollCount > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">({pollCount}/{MAX_POLLS})</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <a
          href={explorerUrl}
          target={demoEnabled ? undefined : '_blank'}
          rel={demoEnabled ? undefined : 'noopener noreferrer'}
          onClick={demoEnabled ? (e) => e.preventDefault() : undefined}
          className={`text-xs font-mono underline break-all hover:opacity-80 transition-opacity ${demoEnabled ? 'cursor-default' : ''}`}
        >
          {txId.slice(0, 10)}...{txId.slice(-8)}
        </a>
        {demoEnabled && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-tighter">
            Mock TX
          </span>
        )}
      </div>

      {status === 'pending' && pollCount > 0 && !demoEnabled && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Stacks blocks typically take 10-30 minutes.
        </p>
      )}

      {status === 'timed_out' && (
        <div className="mt-3 space-y-2">
          <p className="text-xs">
            Polling stopped after {Math.round(POLL_TIMEOUT_MS / 60000)} minutes without a
            confirmed result. The transaction may still be processing.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs font-semibold underline hover:opacity-70 transition-opacity"
              aria-label="Retry polling for transaction status"
            >
              Retry polling
            </button>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline hover:opacity-70 transition-opacity"
              aria-label="View transaction details on Stacks Explorer"
            >
              Check on explorer
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
