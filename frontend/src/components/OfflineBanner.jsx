import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

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
        <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-center py-2 px-4 text-sm font-medium shadow-lg" role="alert">
            <div className="flex items-center justify-center gap-2">
                <WifiOff className="w-4 h-4" aria-hidden="true" />
                <span>You are offline. Some features may not work until your connection is restored.</span>
            </div>
        </div>
    );
}
