import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { STACKS_API_BASE } from '../config/contracts';
import { microToStx } from '../lib/balance-utils';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

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
 * The balance is stored as a normalized non-negative integer string
 * representing micro-STX, derived from `/extended/v1/address/:addr/stx`.
 * Consumers
 * should use the balance-utils helpers (`microToStx`, `formatBalance`) to
 * convert for display rather than dividing by a magic number.
 *
 * On error the hook retries up to MAX_RETRIES times before setting the
 * error state. Call refetch() to manually retry after a failure.
 *
 * @param {string|null} address - Stacks principal to query. Pass null to skip.
 * @returns {{ balance: string|null, balanceStx: number|null, loading: boolean, error: string|null, lastFetched: number|null, refetch: () => Promise<void> }}
 */
export function useBalance(address) {
    const isMounted = useRef(true);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetched, setLastFetched] = useState(null);

    const retryCount = useRef(0);

    useEffect(() => {
        return () => {
            isMounted.current = false;
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
            try {
                const res = await fetch(
                    `${STACKS_API_BASE}/extended/v1/address/${address}/stx`
                );

                if (!res.ok) {
                    throw new Error(`API returned ${res.status}`);
                }

                const data = await res.json();

                const normalized = normalizeMicroStxBalance(data?.balance);
                if (normalized === null) {
                    throw new Error('Unexpected balance format in API response');
                }

                setBalance(normalized);
                setLastFetched(Date.now());
                setLoading(false);
            } catch (err) {
                if (retryCount.current < MAX_RETRIES) {
                    retryCount.current += 1;
                    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                    return attempt();
                }
                console.error('Failed to fetch balance:', err.message);
                setError(err.message);
                setLoading(false);
            }
        };

        await attempt();
    }, [address]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    /** Derived STX balance — memoised to avoid re-computing on every render. */
    const balanceStx = useMemo(() => microToStx(balance), [balance]);

    return { balance, balanceStx, loading, error, lastFetched, refetch: fetchBalance };
}
