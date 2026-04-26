import { useState, useEffect, useCallback, useRef } from 'react';
import {
    fetchCurrentBlockHeight,
    fetchPauseState,
    fetchFeeState,
    fetchContractOwner,
} from '../lib/admin-contract';
import { getPendingChangeStatus } from '../lib/timelock';
import { useDemoMode } from '../context/DemoContext';

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
    const { demoEnabled, getDemoData } = useDemoMode();

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
        if (demoEnabled) {
            await new Promise(r => setTimeout(r, 400));
            const demoData = getDemoData();
            setBlockHeight(84000);
            setContractOwner(demoData.mockWalletAddress);
            setIsOwner(true); // Always admin in demo
            setPauseState({ pendingPause: null, effectiveHeight: 0 });
            setFeeState({ pendingFee: null, effectiveHeight: 0 });
            setLoading(false);
            setError(null);
            return;
        }

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
    }, [demoEnabled, getDemoData, userAddress]);

    useEffect(() => {
        fetchAll();

        if (pollInterval > 0) {
            intervalRef.current = setInterval(fetchAll, pollInterval);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
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

