import { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchCallReadOnlyFunction, cvToJSON, principalCV } from '@stacks/transactions';
import { network } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_GET_USER_STATS } from '../config/contracts';
import { formatSTX, formatAddress } from '../lib/utils';
import { fetchTipMessages, clearTipCache } from '../lib/fetchTipDetails';
import { useTipContext } from '../context/TipContext';
import CopyButton from './ui/copy-button';
import ShareTip from './ShareTip';

const CATEGORY_LABELS = {
    0: 'General', 1: 'Content Creation', 2: 'Open Source',
    3: 'Community Help', 4: 'Appreciation', 5: 'Education', 6: 'Bug Bounty',
};

const API_LIMIT = 50;

/**
 * TipHistory -- displays a user's personal tip activity with stats,
 * direction/category filtering, and on-chain message enrichment.
 *
 * Reads parsed contract events from the shared TipContext event cache
 * instead of polling the Stacks API independently.  The read-only
 * get-user-stats contract call is still performed locally because it
 * returns user-specific aggregate data not present in the event stream.
 *
 * @param {Object} props
 * @param {string} props.userAddress - The STX address of the logged-in user.
 */
export default function TipHistory({ userAddress }) {
    const {
        events,
        eventsLoading,
        eventsError,
        eventsMeta,
        lastEventRefresh,
        refreshEvents,
        loadMoreEvents: contextLoadMore,
    } = useTipContext();
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [tab, setTab] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [loadingMore, setLoadingMore] = useState(false);

    // Build a category lookup from tip-categorized events in the cache.
    const categoryMap = useMemo(() => {
        const map = {};
        events.filter(e => e.event === 'tip-categorized').forEach(e => {
            map[e.tipId] = Number(e.category || 0);
        });
        return map;
    }, [events]);

    // Derive this user's tips from the shared event cache.
    const tips = useMemo(
        () => events
            .filter(t => t.event === 'tip-sent')
            .filter(t => t.sender === userAddress || t.recipient === userAddress)
            .map(t => ({
                ...t,
                direction: t.sender === userAddress ? 'sent' : 'received',
                category: categoryMap[t.tipId] ?? null,
            })),
        [events, userAddress, categoryMap],
    );

    // Enrich tips with on-chain messages whenever the tip list changes.
    const [tipMessages, setTipMessages] = useState({});
    useEffect(() => {
        const tipIds = tips.map(t => t.tipId).filter(id => id && id !== '0');
        if (tipIds.length === 0) return;
        let cancelled = false;
        setMessagesLoading(true);
        clearTipCache();
        fetchTipMessages(tipIds)
            .then(messageMap => {
                if (cancelled) return;
                const obj = {};
                messageMap.forEach((v, k) => { obj[k] = v; });
                setTipMessages(obj);
            })
            .catch(err => { if (!cancelled) console.warn('Failed to fetch tip messages:', err.message || err); })
            .finally(() => { if (!cancelled) setMessagesLoading(false); });
        return () => { cancelled = true; };
    }, [tips]);

    // Merge messages into the tip objects for display.
    const enrichedTips = useMemo(
        () => tips.map(t => {
            const msg = tipMessages[String(t.tipId)];
            return msg ? { ...t, message: msg } : t;
        }),
        [tips, tipMessages],
    );

    // Fetch on-chain user stats (tips sent/received counts and volume).
    // This is user-specific data not available from the shared event cache.
    const fetchUserStats = useCallback(async () => {
        if (!userAddress) return;
        try {
            const result = await fetchCallReadOnlyFunction({
                network, contractAddress: CONTRACT_ADDRESS, contractName: CONTRACT_NAME,
                functionName: FN_GET_USER_STATS, functionArgs: [principalCV(userAddress)], senderAddress: userAddress,
            });
            setStats(cvToJSON(result).value);
        } catch (err) {
            console.error('Failed to fetch user stats:', err.message || err);
        } finally {
            setStatsLoading(false);
        }
    }, [userAddress]);

    useEffect(() => { fetchUserStats(); }, [fetchUserStats]);

    const handleLoadMore = async () => {
        setLoadingMore(true);
        try { await contextLoadMore(); } finally { setLoadingMore(false); }
    };

    const filteredTips = enrichedTips.filter(t => {
        if (tab === 'sent' && t.direction !== 'sent') return false;
        if (tab === 'received' && t.direction !== 'received') return false;
        if (categoryFilter !== 'all' && t.category !== Number(categoryFilter)) return false;
        return true;
    });

    if (eventsLoading || statsLoading) return (
        <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading activity...</p>
        </div>
    );

    if (eventsError) return (
        <div className="max-w-md mx-auto text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/30 p-8">
            <p className="text-red-500 text-sm mb-4">{eventsError}</p>
            <button onClick={refreshEvents}
                className="px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                Retry
            </button>
        </div>
    );

    if (!stats) return (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-400">No activity data available</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Activity</h2>
                <div className="flex items-center gap-3">
                    {lastEventRefresh && <span className="text-xs text-gray-400">{lastEventRefresh.toLocaleTimeString()}</span>}
                    <button onClick={refreshEvents} className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">Refresh</button>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tips Sent</p>
                    <p className="text-3xl font-black text-gray-900 dark:text-white">{stats['tips-sent'].value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Volume: <span className="font-semibold text-gray-700 dark:text-gray-200">{formatSTX(stats['total-sent'].value, 2)} STX</span></p>
                </div>
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tips Received</p>
                    <p className="text-3xl font-black text-green-600 dark:text-green-400">{stats['tips-received'].value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Earned: <span className="font-semibold text-gray-700 dark:text-gray-200">{formatSTX(stats['total-received'].value, 2)} STX</span></p>
                </div>
            </div>

            {/* Tip list */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex flex-wrap items-center gap-2 mb-5">
                    <div role="tablist" aria-label="Filter by direction" className="flex items-center gap-2">
                        {['all', 'sent', 'received'].map((t) => (
                            <button key={t} onClick={() => setTab(t)}
                                role="tab"
                                aria-selected={tab === t}
                                aria-controls="tip-history-panel"
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <label htmlFor="category-filter" className="sr-only">Filter by category</label>
                    <select id="category-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-none outline-none">
                        <option value="all">All Categories</option>
                        {Object.entries(CATEGORY_LABELS).map(([id, label]) => (<option key={id} value={id}>{label}</option>))}
                    </select>
                </div>

                {filteredTips.length === 0 ? (
                    <div id="tip-history-panel" role="tabpanel" className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400">No tips found</p>
                    </div>
                ) : (
                    <div id="tip-history-panel" role="tabpanel" className="space-y-2">
                        {filteredTips.map((tip, i) => (
                            <div key={tip.tipId || i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${tip.direction === 'sent' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                        {tip.direction === 'sent' ? '-' : '+'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1 text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">{tip.direction === 'sent' ? 'To' : 'From'}</span>
                                            <span className="font-semibold text-gray-700 dark:text-gray-200">{formatAddress(tip.direction === 'sent' ? tip.recipient : tip.sender, 8, 6)}</span>
                                            <CopyButton text={tip.direction === 'sent' ? tip.recipient : tip.sender} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                        </div>
                                        {tip.message ? (
                                            <span className="text-xs text-gray-400 italic">&ldquo;{tip.message}&rdquo;</span>
                                        ) : messagesLoading ? (
                                            <span className="inline-block h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-0.5" />
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className={`font-bold text-sm ${tip.direction === 'sent' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {tip.direction === 'sent' ? '-' : '+'}{formatSTX(tip.amount, 2)} STX
                                    </p>
                                    <ShareTip tip={{ type: tip.direction, amount: formatSTX(tip.amount, 6) }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Load More from API */}
            {eventsMeta.hasMore && (
                <div className="flex flex-col items-center gap-2 mt-4">
                    <button onClick={handleLoadMore} disabled={loadingMore}
                        className="px-6 py-2.5 text-sm font-semibold bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                        {loadingMore ? 'Loading...' : 'Load More Activity'}
                    </button>
                    {eventsMeta.total > 0 && (
                        <span className="text-xs text-gray-400">Showing {enrichedTips.length} of {eventsMeta.total} on-chain events</span>
                    )}
                </div>
            )}
        </div>
    );
}
