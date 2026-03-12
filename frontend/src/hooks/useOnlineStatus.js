import { useState, useEffect } from 'react';

/**
 * React hook that tracks the browser's online/offline connectivity state.
 *
 * Listens to the `online` and `offline` window events and returns a boolean
 * indicating whether the browser currently has network connectivity.
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
