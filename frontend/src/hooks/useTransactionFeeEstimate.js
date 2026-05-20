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

export function useTransactionFeeEstimate() {
    return {
        feeEstimateMicroSTX: 5000,
        feeEstimateSTX: 0.005,
        feeEstimateUsd: '0.01',
        loading: false,
        error: null,
        highFeeWarning: false,
        feeLevel: 'medium',
        setFeeLevel: () => {},
        speedEstimates: {},
        refresh: async () => {},
    };
}
