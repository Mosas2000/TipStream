import { useState, useEffect } from 'react';
import CopyButton from './ui/copy-button';
import NotificationBell from './NotificationBell';
import { useTheme } from '../context/ThemeContext';
import { NETWORK_NAME, STACKS_API_BASE } from '../config/contracts';
import { formatAddress } from '../lib/utils';
import { Sun, Moon } from 'lucide-react';

export default function Header({ userData, onAuth, authLoading, notifications, unreadCount, onMarkNotificationsRead, notificationsLoading }) {
    const { theme, toggleTheme } = useTheme();
    const [apiReachable, setApiReachable] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const checkApi = async () => {
            try {
                const res = await fetch(`${STACKS_API_BASE}/v2/info`, { signal: AbortSignal.timeout(5000) });
                if (!cancelled) setApiReachable(res.ok);
            } catch {
                if (!cancelled) setApiReachable(false);
            }
        };
        checkApi();
        const interval = setInterval(checkApi, 30000);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    const networkLabel = NETWORK_NAME.charAt(0).toUpperCase() + NETWORK_NAME.slice(1);

    return (
        <nav className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-white/5">
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
                            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
                                <span className={`h-1.5 w-1.5 rounded-full ${apiReachable === null ? 'bg-yellow-400 animate-pulse' : apiReachable ? 'bg-green-400 pulse-live' : 'bg-red-400'}`} />
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{networkLabel}</span>
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
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-4 h-4" aria-hidden="true" />
                            ) : (
                                <Moon className="w-4 h-4" aria-hidden="true" />
                            )}
                        </button>

                        {/* Notifications */}
                        {userData && (
                            <NotificationBell
                                notifications={notifications}
                                unreadCount={unreadCount}
                                onMarkRead={onMarkNotificationsRead}
                                loading={notificationsLoading}
                            />
                        )}

                        {/* Wallet address */}
                        {userData && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                                <p className="text-xs font-mono text-gray-300">
                                    {formatAddress(userData.profile.stxAddress.mainnet, 6, 4)}
                                </p>
                                <CopyButton text={userData.profile.stxAddress.mainnet} className="text-gray-500 hover:text-white" />
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
                            {authLoading ? 'Connecting...' : userData ? 'Disconnect' : 'Connect Wallet'}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
