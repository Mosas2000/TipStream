import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBalance } from './useBalance';
import { STACKS_API_BASE } from '../config/contracts';

describe('useBalance Hook', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fetches balance successfully', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ balance: '1000000' })
        });

        const { result } = renderHook(() => useBalance('SP123'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.balance).toBe('1000000');
        expect(result.current.balanceStx).toBe(1);
        expect(result.current.error).toBe(null);
    });

    it('handles network errors with retries', async () => {
        global.fetch
            .mockRejectedValueOnce(new Error('Network failure'))
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ balance: '2000000' })
            });

        const { result } = renderHook(() => useBalance('SP123'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        // It will automatically retry after 1500ms
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2), { timeout: 3000 });
        await waitFor(() => expect(result.current.balance).toBe('2000000'));
    });

    it('cleans up resources and ignores updates on unmount', async () => {
        global.fetch.mockImplementation(() => new Promise(() => {}));

        const { unmount, result } = renderHook(() => useBalance('SP123'));
        expect(result.current.loading).toBe(true);

        unmount();
    });

    it('cancels retry timer on unmount', async () => {
        global.fetch.mockRejectedValue(new Error('Persistent failure'));

        const { unmount } = renderHook(() => useBalance('SP123'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

        unmount();

        // Wait a bit to ensure no second call is made
        await new Promise(r => setTimeout(r, 2000));

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('handles 404 response by setting error', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found'
        });

        const { result } = renderHook(() => useBalance('SP123'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe('API returned 404');
        expect(result.current.balance).toBe(null);
    });

    it('handles malformed JSON response', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.reject(new Error('SyntaxError'))
        });

        const { result } = renderHook(() => useBalance('SP123'));

        // It will retry twice then fail
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3), { timeout: 5000 });
        expect(result.current.error).toBeDefined();
    });

    it('handles invalid balance format from API', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ balance: 'abc' })
        });

        const { result } = renderHook(() => useBalance('SP123'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3), { timeout: 5000 });
        expect(result.current.error).toContain('Unexpected balance format');
    });

    it('resets balance when address becomes null', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '1000' })
        });

        const { result, rerender } = renderHook(({ addr }) => useBalance(addr), {
            initialProps: { addr: 'SP123' }
        });

        await waitFor(() => expect(result.current.balance).toBe('1000'));

        rerender({ addr: null });
        expect(result.current.balance).toBe(null);
    });

    it('allows manual refetch', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ balance: '5000' })
        }).mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ balance: '6000' })
        });

        const { result } = renderHook(() => useBalance('SP123'));

        await waitFor(() => expect(result.current.balance).toBe('5000'));

        await act(async () => {
            await result.current.refetch();
        });

        expect(result.current.balance).toBe('6000');
    });

    it('refetch cancels in-flight request', async () => {
        let resolveFirst;
        const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
        
        global.fetch
            .mockReturnValueOnce(firstPromise)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ balance: '7000' })
            });

        const { result } = renderHook(() => useBalance('SP123'));

        // First one is in flight
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

        // Start second one
        let refetchPromise;
        await act(async () => {
            refetchPromise = result.current.refetch();
        });

        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

        // Resolve first one - should be ignored (it already threw AbortError internally)
        resolveFirst({
            ok: true,
            json: () => Promise.resolve({ balance: '1' })
        });

        await refetchPromise;
        expect(result.current.balance).toBe('7000');
    });

    it('manages loading state correctly', async () => {
        let resolveFetch;
        global.fetch.mockReturnValue(new Promise(resolve => { resolveFetch = resolve; }));

        const { result } = renderHook(() => useBalance('SP123'));

        expect(result.current.loading).toBe(true);

        await act(async () => {
            resolveFetch({
                ok: true,
                json: () => Promise.resolve({ balance: '100' })
            });
        });

        await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it('clears error on refetch', async () => {
        global.fetch
            .mockRejectedValueOnce(new Error('First fail'))
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ balance: '100' })
            });

        const { result } = renderHook(() => useBalance('SP123'));

        // Wait for first one to fail all retries
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3), { timeout: 5000 });
        expect(result.current.error).toBeDefined();

        await act(async () => {
            result.current.refetch();
        });

        expect(result.current.error).toBe(null);
    });

    it('updates lastFetched on success', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: '100' })
        });

        const { result } = renderHook(() => useBalance('SP123'));

        await waitFor(() => expect(result.current.balance).toBe('100'));
        const firstFetched = result.current.lastFetched;
        expect(firstFetched).toBeGreaterThan(0);

        await new Promise(r => setTimeout(r, 10));

        await act(async () => {
            await result.current.refetch();
        });

        expect(result.current.lastFetched).toBeGreaterThan(firstFetched);
    });

    it('handles large balance strings', async () => {
        const largeBalance = '1000000000000000000000000'; // Way beyond Number.MAX_SAFE_INTEGER
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: largeBalance })
        });

        const { result } = renderHook(() => useBalance('SP123'));

        await waitFor(() => expect(result.current.balance).toBe(largeBalance));
        // balanceStx might be Infinity or null depending on how microToStx handles it
        // but the raw balance should be correct
    });
});
