import { useState, useEffect, useCallback, useRef } from 'react';
import { STACKS_API_BASE } from '../config/contracts';
import { useStxPrice } from './useStxPrice';
import { useDemoMode } from '../context/DemoContext';

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
