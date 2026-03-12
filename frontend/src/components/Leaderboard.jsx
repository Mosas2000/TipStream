import { useMemo, useState } from 'react';
import { formatSTX, formatAddress } from '../lib/utils';
import { buildLeaderboardStats } from '../lib/buildLeaderboardStats';
import { useTipContext } from '../context/TipContext';
import CopyButton from './ui/copy-button';

/** Tailwind classes for the top-3 medal positions on the leaderboard. */
const MEDALS = [
    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
];
const DEFAULT_MEDAL = 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';

const API_LIMIT = 50;
const MAX_AUTO_PAGES = 10; // Auto-fetch up to 500 events on initial load

/**
 * Leaderboard component that ranks users by total STX sent or received.
 *
 * Fetches contract events via the Stacks API, delegates parsing to the
 * shared `parseTipEvent` utility, and aggregates per-address stats using
 * `buildLeaderboardStats`.  Supports toggling between "Top Senders" and
 * "Top Receivers" tabs, auto-refreshes every 60 seconds, and reacts to
 * the global `refreshCounter` from TipContext.
 */
export default function Leaderboard() {
    const { refreshCounter } = useTipContext();
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('sent');
    const [lastRefresh, setLastRefresh] = useState(null);
    const [allTipEvents, setAllTipEvents] = useState([]);
    const [apiOffset, setApiOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [totalApiEvents, setTotalApiEvents] = useState(null);

    const fetchLeaderboard = useCallback(async () => {
        if (loading && leaders.length > 0) return;
        try {
            setLoading(true);
            setError(null);
            const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;

            // Auto-paginate through multiple pages for accurate rankings
            let accumulated = [];
            let currentOffset = 0;
            let totalEvents = null;

            for (let page = 0; page < MAX_AUTO_PAGES; page++) {
                const response = await fetch(`${STACKS_API_BASE}/extended/v1/contract/${contractId}/events?limit=${API_LIMIT}&offset=${currentOffset}`);
                if (!response.ok) throw new Error(`API returned ${response.status}`);

                const data = await response.json();
                totalEvents = data.total;
                accumulated = accumulated.concat(data.results);
                currentOffset += data.results.length;

                // Stop if we've fetched all events
                if (currentOffset >= data.total || data.results.length < API_LIMIT) break;
            }

            const tipEvents = accumulated
                .filter(e => e.contract_log?.value?.repr)
                .map(e => parseTipEvent(e.contract_log.value.repr))
                .filter(t => t !== null && t.event === 'tip-sent' && t.sender && t.recipient && t.amount !== '0');

            setAllTipEvents(tipEvents);
            setLeaders(buildLeaderboardStats(tipEvents));
            setApiOffset(currentOffset);
            setHasMore(currentOffset < totalEvents);
            setTotalApiEvents(totalEvents);
            setLoading(false);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err.message || err);
            const isNet = err.message?.includes('fetch') || err.name === 'TypeError';
            setError(isNet ? 'Unable to reach the Stacks API. Check your connection.' : `Failed to load leaderboard: ${err.message}`);
            setLoading(false);
        }
    }, []);

    const loadMoreEvents = useCallback(async () => {
        try {
            setLoadingMore(true);
            const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;

            let accumulated = [];
            let currentOffset = apiOffset;

            for (let page = 0; page < MAX_AUTO_PAGES; page++) {
                const response = await fetch(`${STACKS_API_BASE}/extended/v1/contract/${contractId}/events?limit=${API_LIMIT}&offset=${currentOffset}`);
                if (!response.ok) throw new Error(`API returned ${response.status}`);

                const data = await response.json();
                accumulated = accumulated.concat(data.results);
                currentOffset += data.results.length;

                if (currentOffset >= data.total || data.results.length < API_LIMIT) break;
            }

            const newTipEvents = accumulated
                .filter(e => e.contract_log?.value?.repr)
                .map(e => parseTipEvent(e.contract_log.value.repr))
                .filter(t => t !== null && t.event === 'tip-sent' && t.sender && t.recipient && t.amount !== '0');

            const combinedEvents = [...allTipEvents, ...newTipEvents];
            setAllTipEvents(combinedEvents);
            setLeaders(buildLeaderboardStats(combinedEvents));
            setApiOffset(currentOffset);
            setHasMore(currentOffset < (totalApiEvents || Infinity));
        } catch (err) {
            console.error('Failed to load more leaderboard data:', err.message || err);
        } finally {
            setLoadingMore(false);
        }
    }, [apiOffset, allTipEvents, totalApiEvents]);

    useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard, refreshCounter]);
    useEffect(() => { const i = setInterval(fetchLeaderboard, 60000); return () => clearInterval(i); }, [fetchLeaderboard]);

    const sorted = useMemo(() => {
        return [...leaders]
            .sort((a, b) => tab === 'sent' ? b.totalSent - a.totalSent : b.totalReceived - a.totalReceived)
            .slice(0, 20);
    }, [leaders, tab]);

    if (loading) return (
        <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
        </div>
    );

    if (error) return (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button onClick={fetchLeaderboard} className="px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">Retry</button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Leaderboard</h2>

            <div className="flex items-center justify-between mb-5">
                <div className="flex gap-2">
                    {['sent', 'received'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            Top {t === 'sent' ? 'Senders' : 'Receivers'}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    {lastRefresh && <span className="text-xs text-gray-400">{lastRefresh.toLocaleTimeString()}</span>}
                    <button onClick={fetchLeaderboard} className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">Refresh</button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                {sorted.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400">No activity yet. Be the first to tip!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sorted.map((user, i) => (
                            <div key={user.address} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${MEDALS[i] || DEFAULT_MEDAL}`}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{formatAddress(user.address, 8, 6)}</span>
                                            <CopyButton text={user.address} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {tab === 'sent' ? `${user.tipsSent} tips sent` : `${user.tipsReceived} tips received`}
                                        </span>
                                    </div>
                                </div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">
                                    {formatSTX(tab === 'sent' ? user.totalSent : user.totalReceived, 2)} STX
                                </p>
                            </div>
                        ))}
                    </div>
                )}
                {sorted.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center px-3">
                        <span className="text-xs text-gray-400">Showing top {sorted.length} users{totalApiEvents !== null ? ` (from ${allTipEvents.length} events of ${totalApiEvents} total)` : ''}</span>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            Total: {formatSTX(sorted.reduce((sum, u) => sum + (tab === 'sent' ? u.totalSent : u.totalReceived), 0), 2)} STX
                        </span>
                    </div>
                )}

                {hasMore && (
                    <div className="mt-3 text-center">
                        <button 
                            onClick={loadMoreEvents} 
                            disabled={loadingMore}
                            className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                            {loadingMore ? 'Loading more events…' : 'Load More Events for Accurate Rankings'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
