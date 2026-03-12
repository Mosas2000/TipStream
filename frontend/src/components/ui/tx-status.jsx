import { useState, useEffect, useCallback, useRef } from 'react';
import { STACKS_API_BASE } from '../../config/contracts';

const API_BASE = STACKS_API_BASE;

/** How often (ms) to poll for an updated transaction status. */
export const POLL_INTERVAL = 8000;

/** Maximum number of poll attempts before giving up. */
export const MAX_POLLS = 60;

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
};

/**
 * TxStatus -- polls the Stacks API for a transaction's on-chain status and
 * renders a visual indicator (pending / confirmed / failed) along with an
 * explorer link.
 *
 * @param {Object}   props
 * @param {string}   props.txId        - The transaction ID to monitor.
 * @param {Function} [props.onConfirmed] - Called with the tx data object once
 *                                          the transaction is confirmed.
 * @param {Function} [props.onFailed]    - Called with the failure reason string
 *                                          when the transaction fails.
 */
export default function TxStatus({ txId, onConfirmed, onFailed }) {
  const [status, setStatus] = useState('pending');
  const [pollCount, setPollCount] = useState(0);

  // Store callbacks in refs so the polling loop is not restarted when the
  // parent passes new arrow-function references on every render (see #232).
  const onConfirmedRef = useRef(onConfirmed);
  const onFailedRef = useRef(onFailed);

  useEffect(() => { onConfirmedRef.current = onConfirmed; }, [onConfirmed]);
  useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);

  /**
   * Poll the Stacks API for the current transaction status.
   * Invokes the appropriate callback ref when the transaction reaches a
   * terminal state (success or abort).
   */
  const checkStatus = useCallback(async () => {
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
      // Network error, keep polling
    }
  }, [txId]);

  // Schedule the next poll using setTimeout (not setInterval) so the
  // effect correctly cleans up when the component unmounts or when a
  // terminal state is reached.
  useEffect(() => {
    if (status !== 'pending' || pollCount >= MAX_POLLS) return;

    const timer = setTimeout(() => {
      checkStatus();
      setPollCount((c) => c + 1);
    }, POLL_INTERVAL);

    return () => clearTimeout(timer);
  }, [status, pollCount, checkStatus]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const config = STATUS_CONFIG[status];
  const explorerUrl = `${EXPLORER_BASE_URL}/${txId}?chain=mainnet`;

  return (
    <div data-testid="tx-status" className={`mt-4 p-4 rounded-xl border ${config.color}`} role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} aria-hidden="true" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono underline break-all hover:opacity-80 transition-opacity"
        >
          {txId.slice(0, 10)}...{txId.slice(-8)}
        </a>
      </div>
      {status === 'pending' && pollCount >= MAX_POLLS && (
        <p className="mt-2 text-xs opacity-70 dark:opacity-60">
          Still waiting. Check the explorer for the latest status.
        </p>
      )}
    </div>
  );
}
