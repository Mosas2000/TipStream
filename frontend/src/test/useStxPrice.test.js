import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStxPrice } from '../hooks/useStxPrice';

describe('useStxPrice', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('starts in loading state', () => {
        global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useStxPrice());
        expect(result.current.loading).toBe(true);
        expect(result.current.price).toBeNull();
    });

    it('fetches and sets price on mount', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ stacks: { usd: 1.25 } }),
        });

        const { result } = renderHook(() => useStxPrice());

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(result.current.price).toBe(1.25);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('sets error on non-ok response', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
        });

        const { result } = renderHook(() => useStxPrice());

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(result.current.error).toBe('HTTP 500');
        expect(result.current.price).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('sets error when price data is missing', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ stacks: {} }),
        });

        const { result } = renderHook(() => useStxPrice());

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(result.current.error).toBe('Invalid price data');
    });

    it('sets error when fetch rejects', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useStxPrice());

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(result.current.error).toBe('Network error');
        expect(result.current.loading).toBe(false);
    });

    it('toUsd converts STX amount to USD string', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ stacks: { usd: 2.0 } }),
        });

        const { result } = renderHook(() => useStxPrice());

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(result.current.toUsd(5)).toBe('10.00');
    });

    it('toUsd returns null when price is not loaded', () => {
        global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useStxPrice());
        expect(result.current.toUsd(5)).toBeNull();
    });

    it('toUsd returns null for null input', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ stacks: { usd: 2.0 } }),
        });

        const { result } = renderHook(() => useStxPrice());

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(result.current.toUsd(null)).toBeNull();
    });

    it('toUsd returns null for undefined input', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ stacks: { usd: 2.0 } }),
        });

        const { result } = renderHook(() => useStxPrice());

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(result.current.toUsd(undefined)).toBeNull();
    });

    it('toUsd handles string amounts', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ stacks: { usd: 0.5 } }),
        });

        const { result } = renderHook(() => useStxPrice());

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(result.current.toUsd('10')).toBe('5.00');
    });

    it('refetch triggers a new fetch', async () => {
        const goodResponse = {
            ok: true,
            json: () => Promise.resolve({ stacks: { usd: 1.0 } }),
        };
        global.fetch = vi.fn().mockResolvedValue(goodResponse);

        const { result } = renderHook(() => useStxPrice());

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(result.current.price).toBe(1.0);

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ stacks: { usd: 2.0 } }),
        });

        await act(async () => {
            await result.current.refetch();
        });

        expect(result.current.price).toBe(2.0);
    });

    it('clears error on successful refetch', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

        const { result } = renderHook(() => useStxPrice());

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(result.current.error).toBe('HTTP 500');

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ stacks: { usd: 1.5 } }),
        });

        await act(async () => {
            await result.current.refetch();
        });

        expect(result.current.error).toBeNull();
        expect(result.current.price).toBe(1.5);
    });
});
