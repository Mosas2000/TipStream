import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useFeedConnectionStatus } from '../hooks/useFeedConnectionStatus';

function setNavigatorOnline(value) {
    Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
}

describe('useFeedConnectionStatus', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        global.fetch = vi.fn();
        setNavigatorOnline(true);
    });

    afterEach(() => {
        cleanup();
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('starts in checking state when online and probe is pending', () => {
        global.fetch.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useFeedConnectionStatus());

        expect(result.current.browserStatus).toBe('online');
        expect(result.current.apiStatus).toBe('unknown');
        expect(result.current.status).toBe('checking');
        expect(result.current.apiProbing).toBe(true);
    });

    it('does not probe when navigator is offline', () => {
        setNavigatorOnline(false);
        const { result } = renderHook(() => useFeedConnectionStatus());

        expect(result.current.browserStatus).toBe('offline');
        expect(result.current.status).toBe('offline');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not probe when probeNow is called while offline', async () => {
        setNavigatorOnline(false);
        const { result } = renderHook(() => useFeedConnectionStatus());

        await act(async () => {
            await result.current.probeNow();
            await flushMicrotasks();
        });

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('marks API healthy when probe succeeds', async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
        const { result } = renderHook(() => useFeedConnectionStatus());

        await act(async () => {
            await flushMicrotasks();
        });

        expect(result.current.apiStatus).toBe('healthy');
        expect(result.current.status).toBe('healthy');
        expect(result.current.apiReachable).toBe(true);
        expect(typeof result.current.apiLatencyMs).toBe('number');
        expect(result.current.apiProbing).toBe(false);
        expect(result.current.lastProbeError).toBeNull();
    });

    it('marks API unreachable when probe fails', async () => {
        global.fetch.mockRejectedValue(new Error('Network error'));
        const { result } = renderHook(() => useFeedConnectionStatus());

        await act(async () => {
            await flushMicrotasks();
        });

        expect(result.current.apiStatus).toBe('unreachable');
        expect(result.current.status).toBe('api-down');
        expect(result.current.apiReachable).toBe(false);
        expect(result.current.lastProbeError).toBe('Network error');
    });

    it('marks API degraded when probe latency is high', async () => {
        let t = 0;
        vi.spyOn(Date, 'now').mockImplementation(() => {
            t += 3000;
            return t;
        });

        global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
        const { result } = renderHook(() => useFeedConnectionStatus());

        await act(async () => {
            await flushMicrotasks();
        });

        expect(result.current.apiStatus).toBe('degraded');
        expect(result.current.status).toBe('degraded');
        expect(result.current.apiReachable).toBe(true);
        expect(result.current.apiLatencyMs).toBeGreaterThanOrEqual(2500);
    });

    it('runs the probe again on the polling interval while online', async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
        const { result } = renderHook(() => useFeedConnectionStatus());

        await act(async () => {
            await flushMicrotasks();
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(30_000);
            await flushMicrotasks();
        });

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(result.current.apiStatus).toBe('healthy');
    });

    it('resets probe state to unknown on offline transition', async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
        const { result } = renderHook(() => useFeedConnectionStatus());

        await act(async () => {
            await flushMicrotasks();
        });

        act(() => {
            window.dispatchEvent(new Event('offline'));
        });

        expect(result.current.browserStatus).toBe('offline');
        expect(result.current.apiStatus).toBe('unknown');
        expect(result.current.status).toBe('offline');
        expect(result.current.apiReachable).toBeNull();
    });

    it('reports degraded status when failures reach threshold and API is reachable', async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
        const { result } = renderHook(() => useFeedConnectionStatus());

        await act(async () => {
            await flushMicrotasks();
        });

        act(() => {
            result.current.recordFailure();
            result.current.recordFailure();
            result.current.recordFailure();
        });

        expect(result.current.apiStatus).toBe('degraded');
        expect(result.current.status).toBe('degraded');
        expect(result.current.apiHealthy).toBe(false);
    });
});
