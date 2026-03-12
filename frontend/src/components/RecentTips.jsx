import { useEffect, useState, useMemo } from 'react';
import { openContractCall } from '@stacks/connect';
import { uintCV, stringUtf8CV } from '@stacks/transactions';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_TIP_A_TIP } from '../config/contracts';
import { formatSTX, toMicroSTX, formatAddress } from '../lib/utils';
import { tipPostCondition, SAFE_POST_CONDITION_MODE } from '../lib/post-conditions';
import { network, appDetails, userSession, getSenderAddress } from '../utils/stacks';
import { fetchTipMessages, clearTipCache } from '../lib/fetchTipDetails';
import { validateTipBackAmount, MIN_TIP_STX, MAX_TIP_STX } from '../lib/tipBackValidation';
import { useTipContext } from '../context/TipContext';
import { Zap, Search } from 'lucide-react';
import CopyButton from './ui/copy-button';

const PAGE_SIZE = 10;

/**
 * RecentTips -- displays a live feed of on-chain tip events with search,
 * filtering, pagination, and a tip-back modal for reciprocating tips.
 *
 * Reads parsed contract events from the shared TipContext event cache
 * instead of polling the Stacks API independently.  Message enrichment
 * (fetching on-chain tip messages) is still performed locally because
 * it is specific to this component's display needs.
 *
 * @param {Object}   props
 * @param {Function} props.addToast - Callback to display a toast notification.
 */
export default function RecentTips({ addToast }) {
    const {
        events,
        eventsLoading,
        eventsError,
        eventsMeta,
        lastEventRefresh,
        refreshEvents,
        loadMoreEvents: contextLoadMore,
    } = useTipContext();
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [tipBackTarget, setTipBackTarget] = useState(null);
    const [tipBackAmount, setTipBackAmount] = useState('0.5');
    const [tipBackMessage, setTipBackMessage] = useState('');
    const [tipBackError, setTipBackError] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [showFilters, setShowFilters] = useState(false);
    const [offset, setOffset] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);

    // Derive tip-sent events from the shared cache.
    const tips = useMemo(
        () => events.filter(t => t.event === 'tip-sent' && t.sender && t.recipient),
        [events],
    );

    // Enrich tips with on-chain messages whenever the tip list changes.
    const [tipMessages, setTipMessages] = useState({});
    useEffect(() => {
        const tipIds = tips.map(t => t.tipId).filter(id => id && id !== '0');
        if (tipIds.length === 0) return;
        let cancelled = false;
        setMessagesLoading(true);
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

    const handleLoadMore = async () => {
        setLoadingMore(true);
        try { await contextLoadMore(); } finally { setLoadingMore(false); }
    };

    /** Handle changes to the tip-back amount input with real-time validation. */
    const handleTipBackAmountChange = (value) => {
        setTipBackAmount(value);
        setTipBackError(validateTipBackAmount(value));
    };

    /**
     * Handle the tip-back submission. Validates the amount, constructs the
     * contract call arguments and post-conditions, then opens the wallet prompt.
     *
     * @param {Object} tip - The tip event to reciprocate.
     */
    const handleTipBack = async (tip) => {
        if (!userSession.isUserSignedIn()) return;

        // Validate the amount before opening the wallet prompt (Issue #233).
        const error = validateTipBackAmount(tipBackAmount);
        if (error) {
            setTipBackError(error);
            addToast?.(error, 'warning');
            return;
        }

        const microSTX = toMicroSTX(tipBackAmount);
        const senderAddress = getSenderAddress();
        setSending(true);
        try {
            await openContractCall({
                network, appDetails,
                contractAddress: CONTRACT_ADDRESS, contractName: CONTRACT_NAME,
                functionName: FN_TIP_A_TIP,
                functionArgs: [uintCV(parseInt(tip.tipId)), uintCV(microSTX), stringUtf8CV(tipBackMessage || 'Tipping back!')],
                postConditions: [tipPostCondition(senderAddress, microSTX)],
                postConditionMode: SAFE_POST_CONDITION_MODE,
                onFinish: (data) => { setSending(false); setTipBackTarget(null); setTipBackMessage(''); addToast?.('Tip-a-tip sent! Tx: ' + data.txId, 'success'); },
                onCancel: () => { setSending(false); addToast?.('Tip-a-tip cancelled', 'info'); },
            });
        } catch (err) {
            const msg = err.message || String(err);
            console.error('Tip-a-tip failed:', msg);
            if (msg.toLowerCase().includes('post-condition') || msg.toLowerCase().includes('postcondition')) {
                addToast?.('Transaction rejected by post-condition check. Your funds are safe.', 'error');
            } else {
                addToast?.('Failed to send tip-a-tip', 'error');
            }
            setSending(false);
        }
    };

    const filteredTips = useMemo(() => {
        let result = [...enrichedTips];
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            result = result.filter(t => [t.sender, t.recipient, t.message || ''].some(s => s.toLowerCase().includes(q)));
        }
        if (minAmount) { const m = toMicroSTX(minAmount); result = result.filter(t => parseInt(t.amount) >= m); }
        if (maxAmount) { const m = toMicroSTX(maxAmount); result = result.filter(t => parseInt(t.amount) <= m); }
        if (sortBy === 'oldest') result.reverse();
        else if (sortBy === 'amount-high') result.sort((a, b) => parseInt(b.amount) - parseInt(a.amount));
        else if (sortBy === 'amount-low') result.sort((a, b) => parseInt(a.amount) - parseInt(b.amount));
        return result;
    }, [enrichedTips, searchQuery, minAmount, maxAmount, sortBy]);

    const paginatedTips = useMemo(() => filteredTips.slice(offset, offset + PAGE_SIZE), [filteredTips, offset]);
    const totalPages = Math.max(1, Math.ceil(filteredTips.length / PAGE_SIZE));
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
    const hasActiveFilters = searchQuery || minAmount || maxAmount || sortBy !== 'newest';
    const clearFilters = () => { setSearchQuery(''); setMinAmount(''); setMaxAmount(''); setSortBy('newest'); setOffset(0); };

    if (eventsLoading) return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
        </div>
    );

    if (eventsError) return (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Live Feed</h2>
            <div className="text-center py-12 bg-red-50 dark:bg-red-900/10 rounded-xl border-2 border-dashed border-red-200 dark:border-red-900/30">
                <p className="text-red-500 text-sm mb-4">{eventsError}</p>
                <button onClick={refreshEvents} className="px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">Retry</button>
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Live Feed</h2>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />Live
                    </span>
                    {messagesLoading && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Loading messages...</span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {lastEventRefresh && <span className="text-xs text-gray-400">{lastEventRefresh.toLocaleTimeString()}</span>}
                    <button onClick={refreshEvents} aria-label="Refresh tip feed" className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">Refresh</button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="mb-5 space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                        <label htmlFor="feed-search" className="sr-only">Search tips</label>
                        <input id="feed-search" type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setOffset(0); }}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
                            placeholder="Search by address or message..." />
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${showFilters ? 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black border-gray-900 dark:border-amber-500' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        Filters
                    </button>
                    {hasActiveFilters && <button onClick={clearFilters} className="px-2 py-2 text-xs text-red-500 hover:text-red-600 font-semibold">Clear</button>}
                </div>
                {showFilters && (
                    <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <label htmlFor="feed-filter-min" className="text-xs font-medium text-gray-500 dark:text-gray-400">Min STX</label>
                            <input id="feed-filter-min" type="number" value={minAmount} onChange={(e) => { setMinAmount(e.target.value); setOffset(0); }}
                                className="w-24 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" placeholder="0" step="0.001" min="0" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="feed-filter-max" className="text-xs font-medium text-gray-500 dark:text-gray-400">Max STX</label>
                            <input id="feed-filter-max" type="number" value={maxAmount} onChange={(e) => { setMaxAmount(e.target.value); setOffset(0); }}
                                className="w-24 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" placeholder="any" step="0.001" min="0" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="feed-sort" className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort</label>
                            <select id="feed-sort" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setOffset(0); }}
                                className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500">
                                <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
                                <option value="amount-high">Highest amount</option><option value="amount-low">Lowest amount</option>
                            </select>
                        </div>
                    </div>
                )}
                {hasActiveFilters && <p className="text-xs text-gray-500 dark:text-gray-400">Showing {filteredTips.length} of {enrichedTips.length} tips{eventsMeta.total > enrichedTips.length ? ` (${eventsMeta.total} total on-chain)` : ''}</p>}
                {!hasActiveFilters && eventsMeta.total > 0 && <p className="text-xs text-gray-500 dark:text-gray-400">Loaded {enrichedTips.length} of {eventsMeta.total} on-chain events</p>}
            </div>

            {/* Tip cards */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                {paginatedTips.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400">{hasActiveFilters ? 'No tips match your filters' : 'No tips in the stream yet. Be the first!'}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {paginatedTips.map((tip, i) => (
                            <div key={tip.tipId || i} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0">
                                        <Zap className="w-4 h-4" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                                            <span>{formatAddress(tip.sender, 8, 6)}</span>
                                            <CopyButton text={tip.sender} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                            <span className="text-gray-300 dark:text-gray-600">→</span>
                                            <span>{formatAddress(tip.recipient, 8, 6)}</span>
                                            <CopyButton text={tip.recipient} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                                        </div>
                                        <p className="text-lg font-black text-gray-900 dark:text-white">{formatSTX(tip.amount, 4)} <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">STX</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {tip.message ? (
                                        <span className="text-xs text-gray-400 italic max-w-[200px] truncate">&ldquo;{tip.message}&rdquo;</span>
                                    ) : messagesLoading ? (
                                        <span className="inline-block h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                    ) : null}
                                    {userSession.isUserSignedIn() && (
                                        <button onClick={() => { setTipBackError(''); setTipBackAmount('0.5'); setTipBackMessage(''); setTipBackTarget(tip); }}
                                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100">
                                            Tip Back
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {filteredTips.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 pt-4">
                    <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-40">Previous</button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setOffset(Math.min((totalPages - 1) * PAGE_SIZE, offset + PAGE_SIZE))} disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-40">Next</button>
                </div>
            )}

            {/* Load More from API */}
            {eventsMeta.hasMore && (
                <div className="flex justify-center mt-4">
                    <button onClick={handleLoadMore} disabled={loadingMore}
                        aria-label="Load more tips from the blockchain"
                        className="px-6 py-2.5 text-sm font-semibold bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                        {loadingMore ? 'Loading...' : 'Load More Tips'}
                    </button>
                </div>
            )}

            {/* Tip-back modal */}
            {tipBackTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    role="dialog" aria-modal="true" aria-labelledby="tipback-modal-title"
                    data-testid="tipback-modal">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700">
                        <h3 id="tipback-modal-title" className="text-lg font-bold text-gray-900 dark:text-white mb-2">Tip Back</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Send a tip to the original sender of tip #{tipBackTarget.tipId}</p>
                        <div className="space-y-3 mb-4">
                            <div>
                                <label htmlFor="tipback-amount" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (STX)</label>
                                <input id="tipback-amount" type="number" value={tipBackAmount} onChange={(e) => handleTipBackAmountChange(e.target.value)}
                                data-testid="tipback-amount-input"
                                className={`w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none ${tipBackError ? 'border-red-400 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'}`}
                                aria-invalid={!!tipBackError}
                                aria-describedby={tipBackError ? 'tipback-amount-error' : undefined}
                                placeholder="Amount (STX)" step="0.001" min="0.001" />
                            {tipBackError && (
                                <p id="tipback-amount-error" data-testid="tipback-amount-error" className="text-xs text-red-500 mt-1">{tipBackError}</p>
                            )}
                            </div>
                            <div>
                                <label htmlFor="tipback-message" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Message (optional)</label>
                                <input id="tipback-message" type="text" value={tipBackMessage} onChange={(e) => setTipBackMessage(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                                placeholder="Message (optional)" maxLength={280} />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setTipBackTarget(null)}
                                data-testid="tipback-cancel-btn"
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                            <button onClick={() => handleTipBack(tipBackTarget)} disabled={sending || !!tipBackError}
                                data-testid="tipback-send-btn"
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                                {sending ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
