import { useState, useEffect, useCallback } from 'react';
import { STACKS_API_BASE } from '../config/contracts';

/**
 * Fetch and track the STX balance for a Stacks address.
 *
 * The balance is stored as the raw string returned by the Stacks API
 * (`/extended/v1/address/:addr/stx`), representing micro-STX. Consumers
 * should use the balance-utils helpers (`microToStx`, `formatBalance`) to
 * convert for display rather than dividing by a magic number.
 *
 * @param {string|null} address - Stacks principal to query. Pass null to skip.
 * @returns {{ balance: string|null, loading: boolean, error: string|null, refetch: () => Promise<void> }}
 */
export function useBalance(address) {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchBalance = useCallback(async () => {
        if (!address) {
            setBalance(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `${STACKS_API_BASE}/extended/v1/address/${address}/stx`
            );

            if (!res.ok) {
                throw new Error(`API returned ${res.status}`);
            }

            const data = await res.json();
            setBalance(data.balance);
        } catch (err) {
            console.error('Failed to fetch balance:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    return { balance, loading, error, refetch: fetchBalance };
}
