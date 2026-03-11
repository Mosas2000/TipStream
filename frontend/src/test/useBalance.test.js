import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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

    it('sets error when API returns non-ok status', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: () => Promise.resolve({}),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('API returned 404');
        expect(result.current.balance).toBeNull();
    });

    it('sets error when API returns unexpected balance format', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: null }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Unexpected balance format in API response');
        expect(result.current.balance).toBeNull();
    });

    it('sets error when API returns object balance', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ balance: { raw: '1000' } }),
        });

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Unexpected balance format in API response');
    });

    it('sets error when fetch throws a network error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

        const { result } = renderHook(() =>
            useBalance('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'),
        );

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Network offline');
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
});
