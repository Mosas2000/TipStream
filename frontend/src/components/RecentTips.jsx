import { useEffect, useState, useCallback, useRef } from 'react';
import { openContractCall } from '@stacks/connect';
import { uintCV, stringUtf8CV } from '@stacks/transactions';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_TIP_A_TIP } from '../config/contracts';
import { formatSTX, formatAddress, toMicroSTX } from '../lib/utils';
import { tipPostCondition, SAFE_POST_CONDITION_MODE } from '../lib/post-conditions';
import { network, appDetails, userSession, getSenderAddress } from '../utils/stacks';
import { clearTipCache } from '../lib/fetchTipDetails';
import { validateTipBackAmount, MIN_TIP_STX, MAX_TIP_STX } from '../lib/tipBackValidation';
import { useTipContext } from '../context/TipContext';
import { useDemoMode } from '../context/DemoContext';
import { useFilteredAndPaginatedEvents } from '../hooks/useFilteredAndPaginatedEvents';
import { Zap, Search } from 'lucide-react';
import CopyButton from './ui/copy-button';

const PAGE_SIZE = 10;

export default function RecentTips({ addToast }) {
    const {
        events,
        eventsLoading,
        eventsError,
        eventsMeta,
        lastEventRefresh,
        refreshEvents,
        loadMoreEvents: contextLoadMore,
        addDemoTip,
    } = useTipContext();
    const { demoEnabled, setDemoBalance } = useDemoMode();

    const {
        enrichedTips: allEnrichedTips,
        messagesLoading,
        currentPage,
        totalPages,
        searchQuery,
        minAmount,
        maxAmount,
        sortBy,
        hasActiveFilters,
        setSearchQuery,
        setMinAmount,
        setMaxAmount,
        setSortBy,
        prevPage,
        nextPage,
        clearFilters,
        paginatedTips,
        filteredTips,
    } = useFilteredAndPaginatedEvents(events);

    const [tipBackTarget, setTipBackTarget] = useState(null);
    const [tipBackAmount, setTipBackAmount] = useState('0.5');
    const [tipBackMessage, setTipBackMessage] = useState('');
    const [tipBackError, setTipBackError] = useState('');
    const [sending, setSending] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const tipBackModalRef = useRef(null);
    const previousFocusRef = useRef(null);

    const handleRefresh = useCallback(() => {
        clearTipCache();
        refreshEvents();
    }, [refreshEvents]);

    const handleLoadMore = async () => {
        setLoadingMore(true);
        try { await contextLoadMore(); } finally { setLoadingMore(false); }
    };

    const closeTipBackModal = useCallback(() => {
        setTipBackTarget(null);
    }, []);

    const getFocusableElements = useCallback(() => {
        const modal = tipBackModalRef.current;
        if (!modal) return [];

        return Array.from(
            modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
    }, []);

    const handleTipBackModalKeyDown = useCallback((event) => {
        if (!tipBackTarget) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            closeTipBackModal();
            return;
        }

        if (event.key !== 'Tab') return;

        const focusable = getFocusableElements();
        if (focusable.length === 0) {
            event.preventDefault();
            tipBackModalRef.current?.focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey) {
            if (active === first || active === tipBackModalRef.current) {
                event.preventDefault();
                last.focus();
            }
            return;
        }

        if (active === last) {
            event.preventDefault();
            first.focus();
        }
    }, [closeTipBackModal, getFocusableElements, tipBackTarget]);

    useEffect(() => {
        if (!tipBackTarget) {
            if (previousFocusRef.current && previousFocusRef.current.focus) {
                previousFocusRef.current.focus();
            }
            previousFocusRef.current = null;
            return undefined;
        }

        previousFocusRef.current = document.activeElement;

        const timer = window.setTimeout(() => {
            const focusable = getFocusableElements();
            if (focusable.length > 0) {
                focusable[0].focus();
                return;
            }
            tipBackModalRef.current?.focus();
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, [getFocusableElements, tipBackTarget]);

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
        if (demoEnabled) {
            const microSTX = toMicroSTX(tipBackAmount);
            setDemoBalance((prev) => Math.max(0, prev - microSTX));
            addDemoTip({
                recipient: tip.sender,
                amount: microSTX,
                message: tipBackMessage || 'Tipping back!',
                category: tip.category,
            });
            setSending(false);
            closeTipBackModal();
            setTipBackMessage('');
            addToast?.('Demo tip-a-tip sent!', 'success');
            return;
        }

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
                onFinish: (data) => { setSending(false); closeTipBackModal(); setTipBackMessage(''); addToast?.('Tip-a-tip sent! Tx: ' + data.txId, 'success'); },
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
                <button onClick={handleRefresh} className="px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">Retry</button>
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
                    <button onClick={handleRefresh} aria-label="Refresh tip feed" className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">Refresh</button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="mb-5 space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
                        <label htmlFor="feed-search" className="sr-only">Search tips</label>
                        <input id="feed-search" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
                            placeholder="Search by address or message..." />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        aria-expanded={showFilters}
                        aria-controls="feed-filters"
                        className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${showFilters ? 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black border-gray-900 dark:border-amber-500' : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                        Filters
                    </button>
                    {hasActiveFilters && <button type="button" onClick={clearFilters} className="px-2 py-2 text-xs text-red-500 hover:text-red-600 font-semibold">Clear</button>}
                </div>
                {showFilters && (
                    <div id="feed-filters" className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <label htmlFor="feed-filter-min" className="text-xs font-medium text-gray-500 dark:text-gray-400">Min STX</label>
                            <input id="feed-filter-min" type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)}
                                className="w-24 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" placeholder="0" step="0.001" min="0" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="feed-filter-max" className="text-xs font-medium text-gray-500 dark:text-gray-400">Max STX</label>
                            <input id="feed-filter-max" type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)}
                                className="w-24 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" placeholder="any" step="0.001" min="0" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="feed-sort" className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort</label>
                            <select id="feed-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500">
                                <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
                                <option value="amount-high">Highest amount</option><option value="amount-low">Lowest amount</option>
                            </select>
                        </div>
                    </div>
                )}
                {hasActiveFilters && <p className="text-xs text-gray-500 dark:text-gray-400">Showing {filteredTips.length} of {allEnrichedTips.length} tips{eventsMeta.total > allEnrichedTips.length ? ` (${eventsMeta.total} total on-chain)` : ''}</p>}
                {!hasActiveFilters && eventsMeta.total > 0 && <p className="text-xs text-gray-500 dark:text-gray-400">Loaded {allEnrichedTips.length} of {eventsMeta.total} on-chain events</p>}
            </div>

            {/* Tip cards */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                {paginatedTips.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400">{hasActiveFilters ? 'No tips match your filters' : 'No tips in the stream yet. Be the first!'}</p>
                    </div>
                ) : (
                    <div className="space-y-2" aria-live="polite" aria-relevant="additions text">
                        {allEnrichedTips.map((tip, i) => (
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
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4">
                    <button onClick={prevPage} disabled={currentPage === 1}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-40">Previous</button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Page {currentPage} of {totalPages}</span>
                    <button onClick={nextPage} disabled={currentPage >= totalPages}
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
                    onClick={closeTipBackModal}
                    role="dialog" aria-modal="true" aria-labelledby="tipback-modal-title"
                    data-testid="tipback-modal">
                    <div ref={tipBackModalRef}
                        tabIndex={-1}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={handleTipBackModalKeyDown}
                        className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700">
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
                            <button onClick={closeTipBackModal}
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
