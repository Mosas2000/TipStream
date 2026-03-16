import { useState, useRef, useEffect } from 'react';
import { formatSTX, formatAddress } from '../lib/utils';
import { Bell } from 'lucide-react';

export default function NotificationBell({ notifications, unreadCount, onMarkRead, loading, lastSeenTimestamp }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        setOpen((prev) => !prev);
        if (!open && unreadCount > 0) {
            onMarkRead();
        }
    };

    const truncateAddr = (addr) => formatAddress(addr, 6, 4);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="relative p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <Bell className="w-5 h-5" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-gray-900"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                    role="region"
                    aria-label="Notifications"
                >
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Notifications</h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={onMarkRead}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {loading && notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                No tips received yet
                            </div>
                        ) : (
                            notifications.slice(0, 20).map((tip, i) => (
                                <div
                                    key={tip.txId || i}
                                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-0"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                <span className="text-green-600 dark:text-green-400 font-bold">
                                                    +{formatSTX(tip.amount, 2)} STX
                                                </span>
                                                {' '}from{' '}
                                                <span className="font-mono text-xs text-gray-500">
                                                    {truncateAddr(tip.sender)}
                                                </span>
                                            </p>
                                            {tip.message && (
                                                <p className="text-xs text-gray-400 mt-0.5 italic truncate">
                                                    &quot;{tip.message}&quot;
                                                </p>
                                            )}
                                        </div>
                                        <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 mt-1.5" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
