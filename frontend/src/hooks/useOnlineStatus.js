/**
 * @module hooks/useOnlineStatus
 *
 * Hook for tracking browser network connectivity state.
 *
 * Subscribes to the native `online` and `offline` window events
 * and exposes the current value as a boolean. The initial value
 * is derived from `navigator.onLine` at mount time.
 */

import { useState, useEffect } from 'react';

/**
 * React hook that tracks the browser's online/offline connectivity state.
 *
 * Listens to the `online` and `offline` window events and returns a boolean
 * indicating whether the browser currently has network connectivity.
 *
 * Note: `navigator.onLine` can report `true` even when the connection is
 * limited or intermittent. Treat offline state as definitive; treat online
 * state as a best-effort indicator only.
 *
 * @returns {boolean} `true` when online, `false` when offline.
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}
