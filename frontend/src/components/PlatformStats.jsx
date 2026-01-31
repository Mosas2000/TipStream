import { useEffect, useState } from 'react';
import { callReadOnlyFunction, cvToJSON } from '@stacks/transactions';
import { network } from '../utils/stacks';

const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const CONTRACT_NAME = 'tipstream';

export default function PlatformStats() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlatformStats();
    }, []);

    const fetchPlatformStats = async () => {
        try {
            const result = await callReadOnlyFunction({
                network,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-platform-stats',
                functionArgs: [],
                senderAddress: CONTRACT_ADDRESS,
            });

            const jsonResult = cvToJSON(result);
            setStats(jsonResult.value);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching platform stats:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-100 h-32 rounded-2xl"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Global Impact</h2>
                <div className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center">
                    <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Live Network
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100/50 group hover:scale-[1.02] transition-all">
                    <p className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-tighter">Total Tips</p>
                    <p className="text-5xl font-black text-blue-900">
                        {stats['total-tips'].value.toLocaleString()}
                    </p>
                </div>

                <div className="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100/50 group hover:scale-[1.02] transition-all">
                    <p className="text-sm font-bold text-indigo-600 mb-2 uppercase tracking-tighter">Total Volume</p>
                    <div className="flex items-baseline space-x-2">
                        <p className="text-5xl font-black text-indigo-900">
                            {(stats['total-volume'].value / 1000000).toFixed(2)}
                        </p>
                        <span className="text-xl font-bold text-indigo-400">STX</span>
                    </div>
                </div>

                <div className="bg-purple-50/50 p-8 rounded-3xl border border-purple-100/50 group hover:scale-[1.02] transition-all">
                    <p className="text-sm font-bold text-purple-600 mb-2 uppercase tracking-tighter">Platform Fees</p>
                    <div className="flex items-baseline space-x-2">
                        <p className="text-5xl font-black text-purple-900">
                            {(stats['platform-fees'].value / 1000000).toFixed(4)}
                        </p>
                        <span className="text-xl font-bold text-purple-400">STX</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
