import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
    afterEach(() => {
        cleanup();
    });

    it('returns true when navigator.onLine is true', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        const { result } = renderHook(() => useOnlineStatus());
        expect(result.current).toBe(true);
    });

    it('returns false when navigator.onLine is false', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        const { result } = renderHook(() => useOnlineStatus());
        expect(result.current).toBe(false);
        // Reset for other tests
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    });

    it('updates to false when an offline event fires', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        const { result } = renderHook(() => useOnlineStatus());
        expect(result.current).toBe(true);

        act(() => {
            window.dispatchEvent(new Event('offline'));
        });

        expect(result.current).toBe(false);
    });

    it('updates to true when an online event fires', () => {
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        const { result } = renderHook(() => useOnlineStatus());
        expect(result.current).toBe(false);

        act(() => {
            window.dispatchEvent(new Event('online'));
        });

        expect(result.current).toBe(true);
    });

    it('handles rapid online/offline toggling', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        const { result } = renderHook(() => useOnlineStatus());

        act(() => {
            window.dispatchEvent(new Event('offline'));
        });
        expect(result.current).toBe(false);

        act(() => {
            window.dispatchEvent(new Event('online'));
        });
        expect(result.current).toBe(true);

        act(() => {
            window.dispatchEvent(new Event('offline'));
        });
        expect(result.current).toBe(false);
    });

    it('cleans up event listeners on unmount', () => {
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        const { result, unmount } = renderHook(() => useOnlineStatus());

        unmount();

        // After unmount, firing events should not cause errors
        act(() => {
            window.dispatchEvent(new Event('offline'));
        });

        // The last known value before unmount was true
        expect(result.current).toBe(true);
    });
});
