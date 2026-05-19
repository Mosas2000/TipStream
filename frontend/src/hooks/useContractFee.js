import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCurrentFee } from '../lib/admin-contract';
import { FEE_BASIS_POINTS, BASIS_POINTS_DIVISOR } from '../lib/post-conditions';
import { useDemoMode } from '../context/DemoContext';

const POLL_INTERVAL_MS = 60_000;

/**
 * Fetch and cache the live platform fee rate from the contract.
 *
 * Falls back to the SDK's compile-time constant when the contract is
 * unreachable so the UI never shows a broken fee preview.
 *
 * @param {object} [options]
 * @param {number} [options.pollInterval=60000] - Polling interval in ms. Pass 0 to disable.
 * @returns {{
 *   feeBasisPoints: number,
 *   feePercent: number,
 *   loading: boolean,
 *   error: string|null,
 *   isLive: boolean,
 *   refresh: () => void,
 * }}
 */
export function useContractFee({ pollInterval = POLL_INTERVAL_MS } = {}) {
    const { demoEnabled } = useDemoMode();

    const [feeBasisPoints, setFeeBasisPoints] = useState(FEE_BASIS_POINTS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLive, setIsLive] = useState(false);

    const intervalRef = useRef(null);

    const load = useCallback(async () => {
        if (demoEnabled) {
            setFeeBasisPoints(FEE_BASIS_POINTS);
            setIsLive(false);
            setLoading(false);
            setError(null);
            return;
        }

        try {
            const bps = await fetchCurrentFee();
            setFeeBasisPoints(typeof bps === 'number' && bps >= 0 ? bps : FEE_BASIS_POINTS);
            setIsLive(true);
            setError(null);
        } catch (err) {
            setError(err.message || 'Failed to fetch fee rate');
            setIsLive(false);
        } finally {
            setLoading(false);
        }
    }, [demoEnabled]);

    useEffect(() => {
        load();

        if (pollInterval > 0) {
            intervalRef.current = setInterval(load, pollInterval);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [load, pollInterval]);

    const feePercent = (feeBasisPoints / BASIS_POINTS_DIVISOR) * 100;

    return {
        feeBasisPoints,
        feePercent,
        loading,
        error,
        isLive,
        refresh: load,
    };
}
