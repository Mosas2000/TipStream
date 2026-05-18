/**
 * @module hooks/useBalance
 *
 * App-level wrapper around tipstreak-sdk's useBalance.
 * Adds demo mode support and uses the configured STACKS_API_BASE.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBalance as useBalanceSDK } from 'tipstreak-sdk/react';
import { stxToMicro, microToStx } from 'tipstreak-sdk';
import { STACKS_API_BASE } from '../config/contracts';
import { useDemoMode } from '../context/DemoContext';

/**
 * Fetch and track the STX balance for a Stacks address.
 * Wraps tipstreak-sdk's useBalance with demo mode support.
 *
 * @param {string|null} address - Stacks principal to query. Pass null to skip.
 * @returns {{
 *   balance: string|null,
 *   balanceStx: number|null,
 *   loading: boolean,
 *   error: string|null,
 *   lastFetched: number|null,
 *   refetch: () => Promise<void>
 * }}
 */
export function useBalance(address) {
    const { demoEnabled, demoBalance } = useDemoMode();

    // Demo mode: bypass the SDK and return a simulated balance
    const [demoState, setDemoState] = useState({
        balance: null,
        loading: false,
        lastFetched: null,
    });

    useEffect(() => {
        if (!demoEnabled || !address) return;

        setDemoState((s) => ({ ...s, loading: true }));
        const timer = setTimeout(() => {
            setDemoState({
                balance: stxToMicro(demoBalance).toString(),
                loading: false,
                lastFetched: Date.now(),
            });
        }, 400);

        return () => clearTimeout(timer);
    }, [demoEnabled, address, demoBalance]);

    // Real mode: delegate entirely to the SDK
    const sdkResult = useBalanceSDK(demoEnabled ? null : address, {
        apiBase: STACKS_API_BASE,
    });

    const balanceStx = useMemo(
        () => microToStx(demoEnabled ? demoState.balance : sdkResult.balance),
        [demoEnabled, demoState.balance, sdkResult.balance]
    );

    if (demoEnabled) {
        return {
            balance: demoState.balance,
            balanceStx,
            loading: demoState.loading,
            error: null,
            lastFetched: demoState.lastFetched,
            refetch: useCallback(async () => {
                setDemoState((s) => ({ ...s, loading: true }));
                await new Promise((r) => setTimeout(r, 400));
                setDemoState({
                    balance: stxToMicro(demoBalance).toString(),
                    loading: false,
                    lastFetched: Date.now(),
                });
            }, [demoBalance]),
        };
    }

    return { ...sdkResult, balanceStx };
}
