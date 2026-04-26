import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { STACKS_API_BASE } from '../config/contracts';
import { microToStx, stxToMicro } from '../lib/balance-utils';
import { useDemoMode } from '../context/DemoContext';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

/**
 * Promise-based delay that can be cancelled via AbortSignal.
 * @param {number} ms - Milliseconds to wait
 * @param {AbortSignal} [signal] - Optional signal to cancel the delay
 * @returns {Promise<void>}
 */
const delay = (ms, signal) => new Promise((resolve, reject) => {
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

function normalizeMicroStxBalance(rawBalance) {
    if (typeof rawBalance === 'number') {
        if (!Number.isFinite(rawBalance) || !Number.isInteger(rawBalance) || rawBalance < 0) {
            return null;
        }
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
 * Includes automatic retry on transient failures.
 *
 * @param {string|null} address - Stacks principal to query. Pass null to skip.
 * @returns {{
 *   balance: string|null,
 *   balanceStx: number|null,
 *   loading: boolean,
 *   error: string|null,
 *   lastFetched: number|null,
 *   refetch: () => Promise<void>
 * }} Hook state and refetch helper.
 */
export function useBalance(address) {
    const { demoEnabled, demoBalance } = useDemoMode();
    const isMounted = useRef(true);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetched, setLastFetched] = useState(null);

    const retryCount = useRef(0);
    /** @type {import('react').MutableRefObject<AbortController|null>} */
    const abortControllerRef = useRef(null);

    useEffect(() => {
        return () => {
            isMounted.current = false;
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, []);

    const fetchBalance = useCallback(async () => {
        if (!address) {
            setBalance(null);
            return;
        }

        // Handle demo mode
        if (demoEnabled) {
            setLoading(true);
            // Simulate network delay
            await new Promise(r => setTimeout(r, 400));
            setBalance(stxToMicro(demoBalance).toString());
            setLastFetched(Date.now());
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        retryCount.current = 0;

        const attempt = async () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            try {
                const res = await fetch(
                    `${STACKS_API_BASE}/extended/v1/address/${address}/stx`,
                    { signal: abortControllerRef.current.signal }
                );

                if (!res.ok) {
                    throw new Error(`API returned ${res.status}`);
                }

                const data = await res.json();
                if (!isMounted.current) return;

                const normalized = normalizeMicroStxBalance(data?.balance);
                if (normalized === null) {
                    throw new Error('Unexpected balance format in API response');
                }

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
                console.error('Failed to fetch balance:', err.message);
                setError(err.message);
                setLoading(false);
            }
        };

        await attempt();
    }, [address, demoEnabled, demoBalance]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    /** Derived STX balance — memoised to avoid re-computing on every render. */
    const balanceStx = useMemo(() => microToStx(balance), [balance]);

    return { balance, balanceStx, loading, error, lastFetched, refetch: fetchBalance };
}

