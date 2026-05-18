/**
 * @module tipstreak-sdk/hooks/useOnlineStatus
 *
 * React hook for tracking browser network connectivity state.
 *
 * Subscribes to the native `online` and `offline` window events.
 * Initial value is derived from `navigator.onLine` at mount time.
 *
 * Note: `navigator.onLine` can report `true` even when the connection is
 * limited or intermittent. Treat offline as definitive; online as best-effort.
 *
 * @requires react
 */

import { useState, useEffect } from 'react';

/**
 * Track the browser's online/offline connectivity state.
 *
 * @returns {boolean} `true` when online, `false` when offline
 *
 * @example
 * const isOnline = useOnlineStatus();
 * if (!isOnline) return <OfflineBanner />;
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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
