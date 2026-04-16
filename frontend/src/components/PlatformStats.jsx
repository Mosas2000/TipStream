import { useEffect, useState, useCallback } from 'react';
import { fetchCallReadOnlyFunction, cvToJSON } from '@stacks/transactions';
import { network } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_GET_PLATFORM_STATS } from '../config/contracts';
import { formatSTX } from '../lib/utils';
import { useTipContext } from '../context/TipContext';
import { useDemoMode } from '../context/DemoContext';
import { useDemoStats } from '../hooks/useDemoStats';

export default function PlatformStats() {
    const { refreshCounter } = useTipContext();
    const { demoEnabled } = useDemoMode();
    const { getDemoStats } = useDemoStats();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);

    const demoStats = demoEnabled ? getDemoStats() : null;

    const fetchPlatformStats = useCallback(async () => {
        if (demoEnabled) {
            setStats({
                'total-tips': { value: demoStats?.platformStats.totalTipsOnPlatform ?? 0 },
                'total-volume': { value: demoStats?.totalAmount ?? 0 },
                'platform-fees': { value: Math.round((demoStats?.totalAmount ?? 0) * 0.005) },
            });
            setLoading(false);
            setError(null);
            setLastRefresh(new Date());
            return;
        }

        try {
            const result = await fetchCallReadOnlyFunction({
                network,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: FN_GET_PLATFORM_STATS,
                functionArgs: [],
                senderAddress: CONTRACT_ADDRESS,
            });
            setStats(cvToJSON(result).value);
            setLoading(false);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Failed to fetch platform stats:', err.message || err);
            const isNet = err.message?.includes('fetch') || err.name === 'TypeError';
            setError(isNet ? 'Unable to reach the Stacks API. Check your connection.' : `Failed to load stats: ${err.message}`);
            setLoading(false);
        }
    }, [demoEnabled, demoStats]);

    useEffect(() => { 
        Promise.resolve().then(() => fetchPlatformStats()); 
    }, [fetchPlatformStats, refreshCounter]);
    useEffect(() => { 
        const i = setInterval(() => void fetchPlatformStats(), 60000); 
        return () => clearInterval(i); 
    }, [fetchPlatformStats]);

    const STAT_CARDS = [
        { key: 'total-tips', label: 'Total Tips', format: (v) => Number(v).toLocaleString(), color: 'text-gray-900 dark:text-white' },
        { key: 'total-volume', label: 'Total Volume', format: (v) => formatSTX(v, 2), suffix: 'STX', color: 'text-gray-900 dark:text-white' },
        { key: 'platform-fees', label: 'Platform Fees', format: (v) => formatSTX(v, 4), suffix: 'STX', color: 'text-amber-600 dark:text-amber-400' },
    ];

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 dark:bg-gray-800 h-28 rounded-2xl" />)}
        </div>
    );

    if (error) return (
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-red-100 dark:border-red-900/30 text-center">
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button onClick={() => { setError(null); setLoading(true); fetchPlatformStats(); }}
                className="px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                Retry
            </button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Global Impact</h2>
                    {demoEnabled && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                            Demo
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {lastRefresh && <span className="text-xs text-gray-400">{lastRefresh.toLocaleTimeString()}</span>}
                    <button onClick={fetchPlatformStats}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                        Refresh
                    </button>
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />Live
                        </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {STAT_CARDS.map(({ key, label, format, suffix, color }) => (
                    <div key={key} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-3xl font-black ${color}`}>{format(stats[key].value)}</p>
                            {suffix && <span className="text-sm font-semibold text-gray-400">{suffix}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
