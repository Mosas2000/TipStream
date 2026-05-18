/**
 * @module tipstreak-sdk/hooks/useBalance
 *
 * React hook to fetch and track the STX balance for a Stacks address.
 * Includes automatic retry on transient failures and AbortController cleanup.
 *
 * @requires react
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { microToStx } from '../core/balance-utils.js';

const STACKS_API_BASE = 'https://api.hiro.so';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', abortHandler);
      resolve();
    }, ms);

    const abortHandler = () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    };

    signal?.addEventListener('abort', abortHandler, { once: true });
  });
}

function normalizeMicroStxBalance(rawBalance) {
  if (typeof rawBalance === 'number') {
    if (!Number.isFinite(rawBalance) || !Number.isInteger(rawBalance) || rawBalance < 0) return null;
    return String(rawBalance);
  }
  if (typeof rawBalance === 'string') {
    const trimmed = rawBalance.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    return trimmed;
  }
  return null;
}

/**
 * Fetch and track the STX balance for a Stacks address.
 *
 * @param {string|null} address - Stacks principal to query. Pass null to skip.
 * @param {object} [options]
 * @param {string} [options.apiBase='https://api.hiro.so'] - Stacks API base URL
 * @returns {{
 *   balance: string|null,
 *   balanceStx: number|null,
 *   loading: boolean,
 *   error: string|null,
 *   lastFetched: number|null,
 *   refetch: () => Promise<void>
 * }}
 *
 * @example
 * const { balanceStx, loading } = useBalance('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ');
 */
export function useBalance(address, options = {}) {
  const { apiBase = STACKS_API_BASE } = options;
  const isMounted = useRef(true);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const retryCount = useRef(0);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }

    setLoading(true);
    setError(null);
    retryCount.current = 0;

    const attempt = async () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch(
          `${apiBase}/extended/v1/address/${address}/stx`,
          { signal: abortControllerRef.current.signal }
        );

        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data = await res.json();
        if (!isMounted.current) return;

        const normalized = normalizeMicroStxBalance(data?.balance);
        if (normalized === null) throw new Error('Unexpected balance format in API response');

        setBalance(normalized);
        setLastFetched(Date.now());
        setLoading(false);
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (!isMounted.current) return;

        if (retryCount.current < MAX_RETRIES) {
          retryCount.current += 1;
          try {
            await delay(RETRY_DELAY_MS, abortControllerRef.current.signal);
          } catch {
            return;
          }
          if (!isMounted.current) return;
          return attempt();
        }

        setError(err.message);
        setLoading(false);
      }
    };

    await attempt();
  }, [address, apiBase]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const balanceStx = useMemo(() => microToStx(balance), [balance]);

  return { balance, balanceStx, loading, error, lastFetched, refetch: fetchBalance };
}
