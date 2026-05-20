import { useState, useEffect, useCallback, useRef } from 'react';
import { STACKS_API_BASE } from '../config/contracts';
import { useStxPrice } from './useStxPrice';
import { useDemoMode } from '../context/DemoContext';

export const DEFAULT_FEE_MICROSTX = 5_000;
export const DEFAULT_LOW_FEE_MICROSTX = 3_000;
export const DEFAULT_HIGH_FEE_MICROSTX = 15_000;

export const HIGH_FEE_THRESHOLD_MICROSTX = 50_000;
const REFRESH_INTERVAL_MS = 30_000;

const DUMMY_PAYLOAD_HEX = '0000000000000000000000000000000000000000';

function uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function generateDummyTransactionPayloadHex() {
    try {
        const { makeContractCall, principalCV, uintCV, stringUtf8CV, PostConditionMode } = await import('@stacks/transactions');
        const { network } = await import('../utils/stacks');
        const { CONTRACT_ADDRESS, CONTRACT_NAME, FN_SEND_CATEGORIZED_TIP } = await import('../config/contracts');
        
        const dummyRecipient = 'SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60';
        const dummyAmount = 1000000;
        
        const functionArgs = [
            principalCV(dummyRecipient),
            uintCV(dummyAmount),
            stringUtf8CV('Thanks!'),
            uintCV(0)
        ];
        
        const tx = await makeContractCall({
            contractAddress: CONTRACT_ADDRESS,
            contractName: CONTRACT_NAME,
            functionName: FN_SEND_CATEGORIZED_TIP,
            functionArgs,
            senderKey: '0000000000000000000000000000000000000000000000000000000000000001',
            network,
            postConditionMode: PostConditionMode.Deny,
            postConditions: [],
        });
        
        const serialized = tx.serialize();
        return uint8ArrayToHex(serialized);
    } catch (e) {
        return DUMMY_PAYLOAD_HEX;
    }
}

export function useTransactionFeeEstimate({ pollInterval = REFRESH_INTERVAL_MS } = {}) {
    const { demoEnabled } = useDemoMode();
    const { toUsd } = useStxPrice();

    const [feeLevel, setFeeLevel] = useState('medium');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [speedEstimates, setSpeedEstimates] = useState({
        low: { microSTX: DEFAULT_LOW_FEE_MICROSTX, STX: DEFAULT_LOW_FEE_MICROSTX / 1_000_000, Usd: null },
        medium: { microSTX: DEFAULT_FEE_MICROSTX, STX: DEFAULT_FEE_MICROSTX / 1_000_000, Usd: null },
        high: { microSTX: DEFAULT_HIGH_FEE_MICROSTX, STX: DEFAULT_HIGH_FEE_MICROSTX / 1_000_000, Usd: null },
    });

    const isMountedRef = useRef(true);
    const intervalRef = useRef(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const updateUsdPrices = useCallback((estimatesObj) => {
        const updated = {};
        Object.keys(estimatesObj).forEach((level) => {
            const est = estimatesObj[level];
            const usdVal = toUsd ? toUsd(est.STX) : null;
            updated[level] = {
                ...est,
                Usd: usdVal,
            };
        });
        return updated;
    }, [toUsd]);

    useEffect(() => {
        if (isMountedRef.current) {
            setSpeedEstimates(prev => updateUsdPrices(prev));
        }
    }, [updateUsdPrices]);

    const estimate = useCallback(async () => {
        if (!isMountedRef.current) return;
        setLoading(true);
        if (demoEnabled) {
            if (isMountedRef.current) {
                setLoading(false);
                setError(null);
            }
            return;
        }

        let baseEstimates = null;
        const payloadHex = await generateDummyTransactionPayloadHex();

        try {
            const response = await fetch(`${STACKS_API_BASE}/v2/fees/transaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transaction_payload: payloadHex,
                    estimated_len: 200,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.estimations) && data.estimations.length >= 3) {
                    baseEstimates = {
                        low: { microSTX: data.estimations[0].fee, STX: data.estimations[0].fee / 1_000_000 },
                        medium: { microSTX: data.estimations[1].fee, STX: data.estimations[1].fee / 1_000_000 },
                        high: { microSTX: data.estimations[2].fee, STX: data.estimations[2].fee / 1_000_000 },
                    };
                }
            }
        } catch (e) {
            // Silence Stacks Node API error
        }

        if (!baseEstimates) {
            try {
                const response = await fetch(`${STACKS_API_BASE}/extended/v1/fee_rate`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && typeof data.fee_rate === 'number') {
                        const standardFee = Math.max(DEFAULT_FEE_MICROSTX, data.fee_rate * 250);
                        baseEstimates = {
                            low: { microSTX: Math.floor(standardFee * 0.6), STX: (standardFee * 0.6) / 1_000_000 },
                            medium: { microSTX: standardFee, STX: standardFee / 1_000_000 },
                            high: { microSTX: Math.floor(standardFee * 2), STX: (standardFee * 2) / 1_000_000 },
                        };
                    }
                }
            } catch (e) {
                // Silence secondary fallback error
            }
        }

        if (!baseEstimates) {
            baseEstimates = {
                low: { microSTX: DEFAULT_LOW_FEE_MICROSTX, STX: DEFAULT_LOW_FEE_MICROSTX / 1_000_000 },
                medium: { microSTX: DEFAULT_FEE_MICROSTX, STX: DEFAULT_FEE_MICROSTX / 1_000_000 },
                high: { microSTX: DEFAULT_HIGH_FEE_MICROSTX, STX: DEFAULT_HIGH_FEE_MICROSTX / 1_000_000 },
            };
        }

        if (isMountedRef.current) {
            setSpeedEstimates(updateUsdPrices(baseEstimates));
            setLoading(false);
            setError(null);
        }
    }, [demoEnabled, updateUsdPrices]);

    const activeEstimate = speedEstimates[feeLevel];

    return {
        feeEstimateMicroSTX: activeEstimate.microSTX,
        feeEstimateSTX: activeEstimate.STX,
        feeEstimateUsd: activeEstimate.Usd,
        loading,
        error,
        highFeeWarning: activeEstimate.microSTX >= HIGH_FEE_THRESHOLD_MICROSTX,
        feeLevel,
        setFeeLevel,
        speedEstimates,
        refresh: estimate,
    };
}
