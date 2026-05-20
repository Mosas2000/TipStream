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
