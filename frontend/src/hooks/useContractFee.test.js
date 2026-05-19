import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useContractFee } from './useContractFee';

vi.mock('../config/contracts', () => ({
    CONTRACT_ADDRESS: 'SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60',
    CONTRACT_NAME: 'tipstream',
    STACKS_API_BASE: 'https://api.hiro.so',
    FN_GET_CURRENT_FEE_BASIS_POINTS: 'get-current-fee-basis-points',
    FN_GET_FEE_FOR_AMOUNT: 'get-fee-for-amount',
    FN_GET_FEE_SUMMARY: 'get-fee-summary',
}));

vi.mock('../context/DemoContext', () => ({
    useDemoMode: () => ({ demoEnabled: false }),
}));

const mockFetchCurrentFee = vi.fn();

vi.mock('../lib/admin-contract', () => ({
    fetchCurrentFee: (...args) => mockFetchCurrentFee(...args),
}));

describe('useContractFee', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts with the SDK fallback value while loading', () => {
        mockFetchCurrentFee.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        expect(result.current.loading).toBe(true);
        expect(result.current.feeBasisPoints).toBe(50);
    });

    it('resolves to the live fee from the contract', async () => {
        mockFetchCurrentFee.mockResolvedValue(75);
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.feeBasisPoints).toBe(75);
        expect(result.current.isLive).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('computes feePercent correctly for the default 50 bps', async () => {
        mockFetchCurrentFee.mockResolvedValue(50);
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.feePercent).toBeCloseTo(0.5);
    });

    it('computes feePercent correctly for 100 bps', async () => {
        mockFetchCurrentFee.mockResolvedValue(100);
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.feePercent).toBeCloseTo(1.0);
    });

    it('falls back to SDK constant when the contract call fails', async () => {
        mockFetchCurrentFee.mockRejectedValue(new Error('Network error'));
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.feeBasisPoints).toBe(50);
        expect(result.current.isLive).toBe(false);
        expect(result.current.error).toBe('Network error');
    });

    it('falls back to SDK constant when contract returns a negative value', async () => {
        mockFetchCurrentFee.mockResolvedValue(-1);
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.feeBasisPoints).toBe(50);
    });

    it('falls back to SDK constant when contract returns null', async () => {
        mockFetchCurrentFee.mockResolvedValue(null);
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.feeBasisPoints).toBe(50);
    });

    it('accepts zero fee when fee is disabled on-chain', async () => {
        mockFetchCurrentFee.mockResolvedValue(0);
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.feeBasisPoints).toBe(0);
        expect(result.current.feePercent).toBe(0);
        expect(result.current.isLive).toBe(true);
    });

    it('refresh() re-fetches the fee on demand', async () => {
        mockFetchCurrentFee
            .mockResolvedValueOnce(50)
            .mockResolvedValueOnce(80);
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.feeBasisPoints).toBe(50);

        await act(async () => {
            result.current.refresh();
        });
        await waitFor(() => expect(result.current.feeBasisPoints).toBe(80));
        expect(mockFetchCurrentFee).toHaveBeenCalledTimes(2);
    });

    it('clears error state after a successful refresh', async () => {
        mockFetchCurrentFee
            .mockRejectedValueOnce(new Error('Timeout'))
            .mockResolvedValueOnce(50);
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.error).toBe('Timeout'));

        await act(async () => {
            result.current.refresh();
        });
        await waitFor(() => expect(result.current.error).toBeNull());
        expect(result.current.feeBasisPoints).toBe(50);
        expect(result.current.isLive).toBe(true);
    });

    it('isLive is false before the first successful fetch', () => {
        mockFetchCurrentFee.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        expect(result.current.isLive).toBe(false);
    });

    it('exposes a refresh function', async () => {
        mockFetchCurrentFee.mockResolvedValue(50);
        const { result } = renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(typeof result.current.refresh).toBe('function');
    });

    it('does not poll when pollInterval is 0', async () => {
        mockFetchCurrentFee.mockResolvedValue(50);
        renderHook(() => useContractFee({ pollInterval: 0 }));
        await waitFor(() => expect(mockFetchCurrentFee).toHaveBeenCalledTimes(1));
        await new Promise(r => setTimeout(r, 50));
        expect(mockFetchCurrentFee).toHaveBeenCalledTimes(1);
    });
});
