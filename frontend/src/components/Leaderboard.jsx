import { useEffect, useState, useCallback } from 'react';
import { CONTRACT_ADDRESS, CONTRACT_NAME, STACKS_API_BASE } from '../config/contracts';
import { formatSTX, formatAddress } from '../lib/utils';
import { parseTipEvent } from '../lib/parseTipEvent';
import { buildLeaderboardStats } from '../lib/buildLeaderboardStats';
import { useTipContext } from '../context/TipContext';
import CopyButton from './ui/copy-button';

export default function Leaderboard() {
    const { refreshCounter } = useTipContext();
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('sent');
    const [lastRefresh, setLastRefresh] = useState(null);

    const fetchLeaderboard = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
            const response = await fetch(`${STACKS_API_BASE}/extended/v1/contract/${contractId}/events?limit=50&offset=0`);
            if (!response.ok) throw new Error(`API returned ${response.status}`);

            const data = await response.json();

            const tipEvents = data.results
                .filter(e => e.contract_log?.value?.repr)
                .map(e => parseTipEvent(e.contract_log.value.repr))
                .filter(t => t !== null && t.event === 'tip-sent' && t.sender && t.recipient && t.amount !== '0');

            setLeaders(buildLeaderboardStats(tipEvents));
            setLoading(false);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err.message || err);
            setError(err.message || 'Failed to load leaderboard');
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard, refreshCounter]);
    useEffect(() => { const i = setInterval(fetchLeaderboard, 60000); return () => clearInterval(i); }, [fetchLeaderboard]);

    const sorted = [...leaders].sort((a, b) => tab === 'sent' ? b.totalSent - a.totalSent : b.totalReceived - a.totalReceived).slice(0, 20);
    const MEDALS = ['bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300', 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'];

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

            <div className="flex gap-2 mb-5">
                {['sent', 'received'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                        Top {t === 'sent' ? 'Senders' : 'Receivers'}
                    </button>
                ))}
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
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${MEDALS[i] || 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
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
            </div>
        </div>
    );
}
