import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { STACKS_API_BASE } from '../config/contracts';
import { microToStx } from '../lib/balance-utils';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

/**
 * Fetch and track the STX balance for a Stacks address.
 * Includes automatic retry on transient failures.
 *
 * The balance is stored as the raw string returned by the Stacks API
 * (`/extended/v1/address/:addr/stx`), representing micro-STX. Consumers
 * should use the balance-utils helpers (`microToStx`, `formatBalance`) to
 * convert for display rather than dividing by a magic number.
 *
 * @param {string|null} address - Stacks principal to query. Pass null to skip.
 * @returns {{ balance: string|null, balanceStx: number|null, loading: boolean, error: string|null, lastFetched: number|null, refetch: () => Promise<void> }}
 */
export function useBalance(address) {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastFetched, setLastFetched] = useState(null);

    const retryCount = useRef(0);

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

                if (typeof data?.balance !== 'string' && typeof data?.balance !== 'number') {
                    throw new Error('Unexpected balance format in API response');
                }

                setBalance(String(data.balance));
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
