import { useState, useEffect, useCallback } from 'react';
import { STACKS_API_BASE } from '../config/contracts';

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
