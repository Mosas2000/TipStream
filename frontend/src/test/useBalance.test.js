import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBalance } from '../hooks/useBalance';

// Stub STACKS_API_BASE before the module resolves.
vi.mock('../config/contracts', () => ({
    STACKS_API_BASE: 'https://api.test',
}));

describe('useBalance', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns null balance when address is null', () => {
        const { result } = renderHook(() => useBalance(null));
        expect(result.current.balance).toBeNull();
        expect(result.current.balanceStx).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('fetches balance for a valid address', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '5000000' }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.balance).toBe('5000000');
        expect(result.current.balanceStx).toBe(5);
        expect(result.current.error).toBeNull();
    });

    it('stores balance as a string even when API returns a number', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: 3000000 }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.balance).toBe('3000000');
        expect(typeof result.current.balance).toBe('string');
    });

    it('rejects decimal balance strings from API payload', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '12.34' }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.balance).toBeNull();
        expect(result.current.error).toBe('Unexpected balance format in API response');
    });

    it('rejects scientific notation balance strings from API payload', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '1e6' }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.balance).toBeNull();
        expect(result.current.error).toBe('Unexpected balance format in API response');
    });

    it('computes balanceStx correctly from a micro-STX string', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '1500000' }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.balanceStx).toBe(1.5);
    });

    it('calls the correct API endpoint', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '0' }),
        });

        renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.test/extended/v1/address/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T/stx',
            );
        });
    });

    it('sets lastFetched timestamp on successful fetch', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '1000000' }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.lastFetched).toBeTypeOf('number');
        expect(result.current.lastFetched).toBeGreaterThan(0);
    });

    it('exposes a refetch function', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '1000000' }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(typeof result.current.refetch).toBe('function');
    });

    it('has null lastFetched before any fetch', () => {
        const { result } = renderHook(() => useBalance(null));
        expect(result.current.lastFetched).toBeNull();
    });

    it('refetch updates balance with fresh data', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '1000000' }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.balance).toBe('1000000');

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '9000000' }),
        });

        await act(async () => {
            await result.current.refetch();
        });

        expect(result.current.balance).toBe('9000000');
        expect(result.current.balanceStx).toBe(9);
    });

    it('re-fetches when address changes', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '1000000' }),
        });

        const { result, rerender } = renderHook(
            ({ addr }) => useBalance(addr),
            { initialProps: { addr: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T' } },
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.balance).toBe('1000000');

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '7000000' }),
        });

        rerender({ addr: 'SM2PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T' });

        await waitFor(() => {
            expect(result.current.balance).toBe('7000000');
        });
    });

    it('resets balance when address changes to null', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '1000000' }),
        });

        const { result, rerender } = renderHook(
            ({ addr }) => useBalance(addr),
            { initialProps: { addr: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T' } },
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.balance).toBe('1000000');

        rerender({ addr: null });

        await waitFor(() => {
            expect(result.current.balance).toBeNull();
        });

        expect(result.current.balanceStx).toBeNull();
    });
});

describe('useBalance retry and error handling', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('sets error when API returns non-ok status after retries', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: () => Promise.resolve({}),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        // Drain all retries (initial + 2 retries with 1500ms delay each)
        for (let i = 0; i < 3; i++) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(1600);
            });
        }

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('API returned 404');
        expect(result.current.balance).toBeNull();
    });

    it('sets error when API returns unexpected balance format after retries', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: null }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        for (let i = 0; i < 3; i++) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(1600);
            });
        }

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Unexpected balance format in API response');
        expect(result.current.balance).toBeNull();
    });

    it('sets error when API returns object balance after retries', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: { raw: '1000' } }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        for (let i = 0; i < 3; i++) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(1600);
            });
        }

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Unexpected balance format in API response');
    });

    it('sets error when fetch throws a network error after retries', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        for (let i = 0; i < 3; i++) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(1600);
            });
        }

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('Network offline');
    });

    it('retries before setting error (calls fetch MAX_RETRIES + 1 times)', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
        });

        renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        for (let i = 0; i < 3; i++) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(1600);
            });
        }

        // 1 initial + 2 retries = 3 calls
        expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('succeeds on retry after initial failure', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 500 })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ balance: '2000000' }),
            });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        // First attempt fails, advance past retry delay
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1600);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.balance).toBe('2000000');
        expect(result.current.error).toBeNull();
    });
});
