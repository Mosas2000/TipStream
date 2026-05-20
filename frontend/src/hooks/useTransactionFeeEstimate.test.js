import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock heavy Stacks dependencies to prevent slow cryptography execution in tests
vi.mock('@stacks/transactions', () => ({
    PostConditionMode: { Deny: 0x02 },
    uintCV: vi.fn((v) => ({ type: 'uint', value: v })),
    principalCV: vi.fn((v) => ({ type: 'principal', value: v })),
    stringUtf8CV: vi.fn((v) => ({ type: 'string-utf8', value: v })),
    makeContractCall: vi.fn().mockResolvedValue({
        serialize: () => new Uint8Array([0, 1, 2, 3])
    }),
}));

vi.mock('@stacks/network', () => ({
    STACKS_MAINNET: 'mainnet',
    STACKS_TESTNET: 'testnet',
    STACKS_DEVNET: 'devnet',
}));

vi.mock('../utils/stacks', () => ({
    network: 'mainnet',
    appDetails: { name: 'TipStream', icon: '/logo.svg' },
    userSession: { isUserSignedIn: () => false },
}));

vi.mock('../config/contracts', () => ({
    CONTRACT_ADDRESS: 'SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60',
    CONTRACT_NAME: 'tipstream',
    STACKS_API_BASE: 'https://api.hiro.so',
    FN_SEND_CATEGORIZED_TIP: 'send-categorized-tip',
}));

vi.mock('../context/DemoContext', () => ({
    useDemoMode: () => ({ demoEnabled: false }),
}));

vi.mock('./useStxPrice', () => ({
    useStxPrice: () => ({
        price: 2.5,
        loading: false,
        error: null,
        toUsd: (stx) => (Number(stx) * 2.5).toFixed(2),
    }),
}));

import { useTransactionFeeEstimate } from './useTransactionFeeEstimate';

describe('useTransactionFeeEstimate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts with fallback values when loading', () => {
        global.fetch.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useTransactionFeeEstimate({ pollInterval: 0 }));
        
        expect(result.current.loading).toBe(true);
        expect(result.current.feeEstimateMicroSTX).toBe(5000);
        expect(result.current.feeEstimateSTX).toBe(0.005);
    });

    it('updates USD conversion based on STX price hook', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                estimations: [
                    { fee: 3000, fee_rate: 1 },
                    { fee: 6000, fee_rate: 2 },
                    { fee: 12000, fee_rate: 3 }
                ]
            })
        });

        const { result } = renderHook(() => useTransactionFeeEstimate({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.feeEstimateMicroSTX).toBe(6000);
        expect(result.current.feeEstimateSTX).toBe(0.006);
        expect(result.current.feeEstimateUsd).toBe('0.02');
    });

    it('falls back to extended/v1/fee_rate when v2 POST fails', async () => {
        global.fetch
            .mockRejectedValueOnce(new Error('Cost estimation disabled'))
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ fee_rate: 40 }),
            });

        const { result } = renderHook(() => useTransactionFeeEstimate({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.feeEstimateMicroSTX).toBe(10000);
        expect(result.current.feeEstimateSTX).toBe(0.01);
    });

    it('falls back to default parameters when both network calls fail', async () => {
        global.fetch
            .mockRejectedValueOnce(new Error('V2 Failed'))
            .mockRejectedValueOnce(new Error('Extended Failed'));

        const { result } = renderHook(() => useTransactionFeeEstimate({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.feeEstimateMicroSTX).toBe(5000);
        expect(result.current.error).toBeNull();
    });

    it('supports selecting different fee levels (low, medium, high)', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                estimations: [
                    { fee: 3000, fee_rate: 1 },
                    { fee: 6000, fee_rate: 2 },
                    { fee: 12000, fee_rate: 3 }
                ]
            })
        });

        const { result } = renderHook(() => useTransactionFeeEstimate({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.feeLevel).toBe('medium');
        expect(result.current.feeEstimateMicroSTX).toBe(6000);

        act(() => {
            result.current.setFeeLevel('low');
        });
        expect(result.current.feeEstimateMicroSTX).toBe(3000);

        act(() => {
            result.current.setFeeLevel('high');
        });
        expect(result.current.feeEstimateMicroSTX).toBe(12000);
    });

    it('raises high fee warning when active level estimate meets or exceeds 50000 microSTX', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                estimations: [
                    { fee: 10000, fee_rate: 1 },
                    { fee: 20000, fee_rate: 2 },
                    { fee: 55000, fee_rate: 3 }
                ]
            })
        });

        const { result } = renderHook(() => useTransactionFeeEstimate({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.highFeeWarning).toBe(false);

        act(() => {
            result.current.setFeeLevel('high');
        });
        expect(result.current.highFeeWarning).toBe(true);
    });
});
