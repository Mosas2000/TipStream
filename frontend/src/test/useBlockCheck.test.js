import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBlockCheck } from '../hooks/useBlockCheck';

const mockFetchReadOnly = vi.fn();
const mockCvToJSON = vi.fn();

vi.mock('@stacks/transactions', () => ({
    fetchCallReadOnlyFunction: (...args) => mockFetchReadOnly(...args),
    cvToJSON: (...args) => mockCvToJSON(...args),
    principalCV: vi.fn((addr) => ({ type: 'principal', value: addr })),
}));

vi.mock('../utils/stacks', () => ({
    network: { url: 'https://api.test' },
    getSenderAddress: vi.fn(() => 'SP1SENDER'),
}));

vi.mock('../config/contracts', () => ({
    CONTRACT_ADDRESS: 'SP_CONTRACT',
    CONTRACT_NAME: 'tipstream',
    FN_IS_USER_BLOCKED: 'is-user-blocked',
}));

describe('useBlockCheck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts with blocked as null and checking as false', () => {
        const { result } = renderHook(() => useBlockCheck());
        expect(result.current.blocked).toBeNull();
        expect(result.current.checking).toBe(false);
    });

    it('sets blocked to null when recipient is empty', () => {
        const { result } = renderHook(() => useBlockCheck());
        act(() => {
            result.current.checkBlocked('');
        });
        expect(result.current.blocked).toBeNull();
        expect(result.current.checking).toBe(false);
    });

    it('sets blocked to null when recipient equals sender', () => {
        const { result } = renderHook(() => useBlockCheck());
        act(() => {
            result.current.checkBlocked('SP1SENDER');
        });
        expect(result.current.blocked).toBeNull();
    });

    it('trims whitespace from recipient address', () => {
        const { result } = renderHook(() => useBlockCheck());
        act(() => {
            result.current.checkBlocked('  SP1SENDER  ');
        });
        // Trimmed equals sender, so should be null
        expect(result.current.blocked).toBeNull();
    });

    it('sets checking to true during contract call', async () => {
        let resolveCall;
        mockFetchReadOnly.mockReturnValue(new Promise(r => { resolveCall = r; }));

        const { result } = renderHook(() => useBlockCheck());

        act(() => {
            result.current.checkBlocked('SP2RECIPIENT');
        });

        expect(result.current.checking).toBe(true);

        const cvResult = {};
        mockCvToJSON.mockReturnValue({ value: false });

        await act(async () => {
            resolveCall(cvResult);
        });

        await waitFor(() => {
            expect(result.current.checking).toBe(false);
        });
    });

    it('sets blocked to true when contract returns true', async () => {
        const cvResult = {};
        mockFetchReadOnly.mockResolvedValue(cvResult);
        mockCvToJSON.mockReturnValue({ value: true });

        const { result } = renderHook(() => useBlockCheck());

        await act(async () => {
            result.current.checkBlocked('SP2RECIPIENT');
        });

        await waitFor(() => {
            expect(result.current.blocked).toBe(true);
        });
    });

    it('sets blocked to true when contract returns string true', async () => {
        mockFetchReadOnly.mockResolvedValue({});
        mockCvToJSON.mockReturnValue({ value: 'true' });

        const { result } = renderHook(() => useBlockCheck());

        await act(async () => {
            result.current.checkBlocked('SP2RECIPIENT');
        });

        await waitFor(() => {
            expect(result.current.blocked).toBe(true);
        });
    });

    it('sets blocked to false when contract returns false', async () => {
        mockFetchReadOnly.mockResolvedValue({});
        mockCvToJSON.mockReturnValue({ value: false });

        const { result } = renderHook(() => useBlockCheck());

        await act(async () => {
            result.current.checkBlocked('SP2RECIPIENT');
        });

        await waitFor(() => {
            expect(result.current.blocked).toBe(false);
        });
    });

    it('sets blocked to null on contract call error', async () => {
        mockFetchReadOnly.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useBlockCheck());

        await act(async () => {
            result.current.checkBlocked('SP2RECIPIENT');
        });

        await waitFor(() => {
            expect(result.current.checking).toBe(false);
        });

        expect(result.current.blocked).toBeNull();
    });

    it('reset clears blocked state and stops checking', async () => {
        mockFetchReadOnly.mockResolvedValue({});
        mockCvToJSON.mockReturnValue({ value: true });

        const { result } = renderHook(() => useBlockCheck());

        await act(async () => {
            result.current.checkBlocked('SP2RECIPIENT');
        });

        await waitFor(() => {
            expect(result.current.blocked).toBe(true);
        });

        act(() => {
            result.current.reset();
        });

        expect(result.current.blocked).toBeNull();
        expect(result.current.checking).toBe(false);
    });

    it('discards stale responses after reset', async () => {
        let resolveCall;
        mockFetchReadOnly.mockReturnValue(new Promise(r => { resolveCall = r; }));

        const { result } = renderHook(() => useBlockCheck());

        act(() => {
            result.current.checkBlocked('SP2RECIPIENT');
        });

        // Reset before the call resolves
        act(() => {
            result.current.reset();
        });

        mockCvToJSON.mockReturnValue({ value: true });

        await act(async () => {
            resolveCall({});
        });

        // Should stay null because the abortRef was incremented
        expect(result.current.blocked).toBeNull();
    });

    it('passes correct arguments to fetchCallReadOnlyFunction', async () => {
        mockFetchReadOnly.mockResolvedValue({});
        mockCvToJSON.mockReturnValue({ value: false });

        const { result } = renderHook(() => useBlockCheck());

        await act(async () => {
            result.current.checkBlocked('SP2RECIPIENT');
        });

        expect(mockFetchReadOnly).toHaveBeenCalledWith(
            expect.objectContaining({
                contractAddress: 'SP_CONTRACT',
                contractName: 'tipstream',
                functionName: 'is-user-blocked',
                senderAddress: 'SP1SENDER',
            }),
        );
    });
});
