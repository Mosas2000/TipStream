import { useEffect, useState, useCallback } from 'react';
import { fetchCallReadOnlyFunction, cvToJSON, principalCV } from '@stacks/transactions';
import { network } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_GET_USER_STATS, STACKS_API_BASE } from '../config/contracts';
import { formatSTX, formatAddress } from '../lib/utils';
import CopyButton from './ui/copy-button';
import ShareTip from './ShareTip';
import { useDemoMode } from '../context/DemoContext';

const CATEGORY_LABELS = {
    0: 'General', 1: 'Content Creation', 2: 'Open Source',
    3: 'Community Help', 4: 'Appreciation', 5: 'Education', 6: 'Bug Bounty',
};
const TRANSACTIONS_PAGE_SIZE = 50;
const TRANSACTIONS_REFRESH_MS = 30_000;

function parsePrincipal(repr) {
    if (!repr || typeof repr !== 'string') return null;
    return repr.startsWith("'") ? repr.slice(1) : repr;
}

function parseUint(repr) {
    if (!repr || typeof repr !== 'string' || !repr.startsWith('u')) return null;
    return repr.slice(1);
}

function parseUtf8(repr) {
    if (!repr || typeof repr !== 'string') return null;
    if (!repr.startsWith('u"') || !repr.endsWith('"')) return null;
    return repr.slice(2, -1);
}

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
    const { demoEnabled, getDemoData } = useDemoMode();
    const [tips, setTips] = useState([]);
    const [tipsLoading, setTipsLoading] = useState(true);
    const [tipsError, setTipsError] = useState(null);
    const [tipsMeta, setTipsMeta] = useState({ offset: 0, total: 0, hasMore: false });
    const [lastTipsRefresh, setLastTipsRefresh] = useState(null);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [tab, setTab] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [loadingMore, setLoadingMore] = useState(false);

    const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
    const demoWalletAddress = demoEnabled ? getDemoData().mockWalletAddress : null;

    const buildDemoTips = useCallback(() => {
        const walletAddress = demoWalletAddress;
        return getDemoData().mockTips
            .filter((tip) => tip.sender === walletAddress || tip.recipient === walletAddress)
            .map((tip) => ({
                tipId: tip.id,
                txId: tip.id,
                sender: tip.sender,
                recipient: tip.recipient,
                amount: String(tip.amount),
                message: tip.memo || '',
                category: tip.category ?? null,
                direction: tip.sender === walletAddress ? 'sent' : 'received',
                timestamp: tip.timestamp || null,
            }));
    }, [demoWalletAddress, getDemoData]);

    const fetchTips = useCallback(async (reset = true) => {
        if (demoEnabled) {
            const parsed = buildDemoTips();
            setTips(parsed);
            setTipsLoading(false);
            setTipsError(null);
            setTipsMeta({ offset: parsed.length, total: parsed.length, hasMore: false });
            setLastTipsRefresh(new Date());
            return;
        }

        if (!userAddress) {
            setTips([]);
            setTipsLoading(false);
            setTipsError(null);
            setTipsMeta({ offset: 0, total: 0, hasMore: false });
            return;
        }

        const offset = reset ? 0 : tipsMeta.offset;
        if (reset) {
            setTipsLoading(true);
        }

        try {
            setTipsError(null);
            const response = await fetch(
                `${STACKS_API_BASE}/extended/v1/address/${userAddress}/transactions?limit=${TRANSACTIONS_PAGE_SIZE}&offset=${offset}`
            );
            if (!response.ok) throw new Error(`Stacks API returned ${response.status}`);

            const data = await response.json();
            const rows = Array.isArray(data?.results) ? data.results : [];

            const parsed = rows
                .filter((tx) => tx?.tx_type === 'contract_call' && tx?.contract_call?.contract_id === contractId)
                .map((tx) => {
                    const args = tx?.contract_call?.function_args || [];
                    const recipient = parsePrincipal(args[0]?.repr) || '';
                    const amount = parseUint(args[1]?.repr) || '0';
                    const message = parseUtf8(args[2]?.repr);
                    const category = parseUint(args[3]?.repr);
                    const sender = tx?.sender_address || '';

                    let direction = null;
                    if (sender === userAddress) direction = 'sent';
                    else if (recipient === userAddress) direction = 'received';
                    if (!direction) return null;

                    return {
                        tipId: tx.tx_id,
                        txId: tx.tx_id,
                        sender,
                        recipient,
                        amount,
                        message,
                        category: category !== null ? Number(category) : null,
                        direction,
                        timestamp: tx?.burn_block_time || tx?.block_time || null,
                    };
                })
                .filter(Boolean);

            const nextOffset = offset + rows.length;
            setTips(prev => reset ? parsed : [...prev, ...parsed]);
            setTipsMeta({
                offset: nextOffset,
                total: data?.total || 0,
                hasMore: nextOffset < (data?.total || 0),
            });
            setLastTipsRefresh(new Date());
        } catch (err) {
            setTipsError(err.message || 'Failed to load activity');
        } finally {
            setTipsLoading(false);
        }
    }, [userAddress, tipsMeta.offset, contractId, demoEnabled, buildDemoTips]);

    const handleRefresh = useCallback(() => {
        fetchTips(true);
    }, [fetchTips]);

    useEffect(() => {
        fetchTips(true);
    }, [fetchTips]);

    useEffect(() => {
        const id = setInterval(() => fetchTips(true), TRANSACTIONS_REFRESH_MS);
        return () => clearInterval(id);
    }, [fetchTips]);

    // Fetch on-chain user stats (tips sent/received counts and volume).
    // This is user-specific data not available from the shared event cache.
    const fetchUserStats = useCallback(async () => {
        if (demoEnabled) {
            const demoTips = buildDemoTips();
            const sent = demoTips.filter((tip) => tip.direction === 'sent');
            const received = demoTips.filter((tip) => tip.direction === 'received');
            setStats({
                'tips-sent': { value: sent.length },
                'tips-received': { value: received.length },
                'total-sent': { value: sent.reduce((sum, tip) => sum + Number(tip.amount || 0), 0) },
                'total-received': { value: received.reduce((sum, tip) => sum + Number(tip.amount || 0), 0) },
            });
            setStatsLoading(false);
            return;
        }

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
    }, [userAddress, demoEnabled, buildDemoTips]);

    useEffect(() => { fetchUserStats(); }, [fetchUserStats]);

    const handleLoadMore = async () => {
        setLoadingMore(true);
        try { await fetchTips(false); } finally { setLoadingMore(false); }
    };

    const filteredTips = tips.filter(t => {
        if (tab === 'sent' && t.direction !== 'sent') return false;
        if (tab === 'received' && t.direction !== 'received') return false;
        if (categoryFilter !== 'all' && t.category !== Number(categoryFilter)) return false;
        return true;
    });

    if (tipsLoading || statsLoading) return (
        <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading activity...</p>
        </div>
    );

    if (tipsError) return (
        <div className="max-w-md mx-auto text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/30 p-8">
            <p className="text-red-500 text-sm mb-4">{tipsError}</p>
            <button onClick={handleRefresh}
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
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Activity</h2>
                    {demoEnabled && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                            Demo
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {lastTipsRefresh && <span className="text-xs text-gray-400">{lastTipsRefresh.toLocaleTimeString()}</span>}
                    <button onClick={handleRefresh} aria-label="Refresh activity" className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">Refresh</button>
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
            {tipsMeta.hasMore && (
                <div className="flex flex-col items-center gap-2 mt-4">
                    <button onClick={handleLoadMore} disabled={loadingMore}
                        aria-label="Load more activity from the blockchain"
                        className="px-6 py-2.5 text-sm font-semibold bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                        {loadingMore ? 'Loading...' : 'Load More Activity'}
                    </button>
                    {tipsMeta.total > 0 && (
                        <span className="text-xs text-gray-400">Showing {tips.length} of {tipsMeta.total} address transactions</span>
                    )}
                </div>
            )}
        </div>
    );
}
