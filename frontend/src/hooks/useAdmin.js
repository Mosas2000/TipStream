import { useState, useEffect, useCallback, useRef } from 'react';
import {
    fetchCurrentBlockHeight,
    fetchPauseState,
    fetchFeeState,
    fetchContractOwner,
} from '../lib/admin-contract';
import { getPendingChangeStatus } from '../lib/timelock';

/**
 * Hook that provides admin state from the contract.
 *
 * Fetches contract owner, pause state, fee state, and current block
 * height on mount and at a configurable polling interval.
 *
 * @param {string|null} userAddress - The connected user's STX address
 * @param {object} [options]
 * @param {number} [options.pollInterval=30000] - Polling interval in ms
 * @returns {object} Admin state and controls
 */
export function useAdmin(userAddress, options = {}) {
    const { pollInterval = 30000 } = options;

    const [contractOwner, setContractOwner] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [blockHeight, setBlockHeight] = useState(0);
    const [pauseState, setPauseState] = useState({
        pendingPause: null,
        effectiveHeight: 0,
    });
    const [feeState, setFeeState] = useState({
        pendingFee: null,
        effectiveHeight: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const intervalRef = useRef(null);

    const fetchAll = useCallback(async () => {
        try {
            const [height, owner, pause, fee] = await Promise.all([
                fetchCurrentBlockHeight(),
                fetchContractOwner(),
                fetchPauseState(),
                fetchFeeState(),
            ]);

            setBlockHeight(height);
            setContractOwner(owner);
            setPauseState(pause);
            setFeeState(fee);
            setError(null);

            if (userAddress && owner) {
                setIsOwner(userAddress === owner);
            } else {
                setIsOwner(false);
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch admin state');
        } finally {
            setLoading(false);
        }
    }, [userAddress]);

    useEffect(() => {
        fetchAll();

        intervalRef.current = setInterval(fetchAll, pollInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [fetchAll, pollInterval]);

    const pendingPauseStatus = getPendingChangeStatus(
        pauseState.pendingPause,
        pauseState.effectiveHeight,
        blockHeight
    );

    const pendingFeeStatus = getPendingChangeStatus(
        feeState.pendingFee,
        feeState.effectiveHeight,
        blockHeight
    );

    const refresh = useCallback(() => {
        setLoading(true);
        return fetchAll();
    }, [fetchAll]);

    return {
        contractOwner,
        isOwner,
        blockHeight,
        pauseState,
        feeState,
        pendingPauseStatus,
        pendingFeeStatus,
        loading,
        error,
        refresh,
    };
}
