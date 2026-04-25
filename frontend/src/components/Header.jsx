import { lazy, Suspense } from 'react';
import CopyButton from './ui/copy-button';
import { BANNER_HEIGHT_CLASS } from './OfflineBanner';
import { useTheme } from '../context/ThemeContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { NETWORK_NAME } from '../config/contracts';
import { formatAddress } from '../lib/utils';
import { getMainnetAddress } from '../utils/stacks';
import { Sun, Moon } from 'lucide-react';

const NotificationBell = lazy(() => import('./NotificationBell'));

/**
 * Site header with wallet controls, theme toggle, and notification bell.
 *
 * The header uses sticky positioning and adjusts its top offset based on
 * the browser's connectivity state so that it does not overlap the
 * OfflineBanner when the user loses network connectivity.
 *
 * @param {Object} props
 * @param {Object|null} props.userData - Authenticated user session data.
 * @param {Function} props.onAuth - Callback for connect/disconnect action.
 * @param {boolean} props.authLoading - Whether authentication is in progress.
 * @param {boolean} props.demoEnabled - Whether demo mode is active.
 * @param {Array} props.notifications - List of notification objects.
 * @param {number} props.unreadCount - Number of unread notifications.
 * @param {Function} props.onMarkNotificationsRead - Callback to mark all read.
 * @param {boolean} props.notificationsLoading - Whether notifications are loading.
 */
export default function Header({ userData, onAuth, authLoading, demoEnabled, notifications, unreadCount, lastSeenTimestamp, onMarkNotificationsRead, notificationsLoading, apiReachable = null }) {
    const { theme, toggleTheme } = useTheme();
    const isOnline = useOnlineStatus();

    const networkLabel = NETWORK_NAME.charAt(0).toUpperCase() + NETWORK_NAME.slice(1);
    const apiStatusText = apiReachable === null ? 'Checking' : apiReachable ? 'Online' : 'Offline';

    // When the OfflineBanner is visible it occupies layout space above the
    // header.  Shift the header down by the banner's height so the two sticky
    // elements do not overlap.  When online, the header sits flush at the top.
    const stickyTop = isOnline ? 'top-0' : BANNER_HEIGHT_CLASS;

    return (
        <nav data-testid="site-header" className={`sticky ${stickyTop} z-50 bg-gray-900/95 backdrop-blur-md border-b border-white/5 transition-[top] duration-300 ease-in-out`} aria-label="Site header">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo.svg"
                            alt="TipStream"
                            width={36}
                            height={36}
                            className="h-9 w-9 object-contain"
                        />
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black text-white tracking-tight">TipStream</h1>
                            {demoEnabled && (
                                <span className="hidden sm:inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                                    Demo
                                </span>
                            )}
                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5" role="status" aria-label={`API status: ${apiReachable === null ? 'checking' : apiReachable ? 'connected' : 'disconnected'}`}>
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${apiReachable === null ? 'bg-yellow-400 animate-pulse' : apiReachable ? 'bg-green-400 pulse-live' : 'bg-red-400'}`}
                                    aria-hidden="true"
                                />
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{networkLabel}</span>
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{apiStatusText}</span>
                                <span className="sr-only">
                                    {apiReachable === null ? 'Checking connection' : apiReachable ? 'API connected' : 'API disconnected'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                            aria-pressed={theme === 'dark'}
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-4 h-4" aria-hidden="true" />
                            ) : (
                                <Moon className="w-4 h-4" aria-hidden="true" />
                            )}
                        </button>

                        {/* Notifications */}
                        {(userData || demoEnabled) && (
                            <Suspense fallback={<div className="w-8 h-8" />}>
                                <NotificationBell
                                    notifications={notifications}
                                    unreadCount={unreadCount}
                                    onMarkRead={onMarkNotificationsRead}
                                    loading={notificationsLoading}
                                    lastSeenTimestamp={lastSeenTimestamp}
                                />
                            </Suspense>
                        )}

                        {/* Wallet address / Demo address */}
                        {(userData || demoEnabled) && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                <p className="text-xs font-mono text-gray-300">
                                    {demoEnabled 
                                        ? formatAddress('SP2DEMOADDRESS0000000000000000000000', 6, 4)
                                        : formatAddress(getMainnetAddress(userData), 6, 4)}
                                </p>
                                <CopyButton 
                                    text={demoEnabled ? 'SP2DEMOADDRESS0000000000000000000000' : getMainnetAddress(userData)} 
                                    className="text-gray-500 hover:text-white" 
                                />
                            </div>
                        )}


                        {/* Connect / Disconnect */}
                        <button
                            onClick={onAuth}
                            disabled={authLoading}
                            className={`px-4 sm:px-6 py-2 rounded-lg font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
                                userData
                                    ? 'bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:shadow-lg hover:shadow-amber-500/20'
                            }`}
                        >
                            {authLoading ? 'Connecting...' : demoEnabled ? 'Exit Demo' : userData ? 'Disconnect' : 'Connect Wallet'}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
