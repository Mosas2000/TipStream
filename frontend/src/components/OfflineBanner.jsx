import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

/**
 * Approximate height of the offline banner in Tailwind spacing units.
 * Used by sibling components to adjust their own offsets when the banner
 * is visible. The value corresponds to py-2 (0.5rem * 2) + line-height
 * which gives roughly 2rem / 32px.
 */
export const BANNER_HEIGHT_CLASS = 'top-8';

/**
 * OfflineBanner -- renders a notification bar when the user loses connectivity.
 *
 * The component participates in normal document flow so that sibling elements
 * (such as the sticky Header) are pushed down rather than overlapped.
 */
export default function OfflineBanner() {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    return (
        <div
            data-testid="offline-banner"
            className="sticky top-0 inset-x-0 z-[60] bg-red-600 text-white text-center py-2 px-4 text-sm font-medium shadow-lg animate-slide-down"
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-center justify-center gap-2">
                <WifiOff className="w-4 h-4" aria-hidden="true" />
                <span>You are offline. Some features may not work until your connection is restored.</span>
            </div>
        </div>
    );
}
