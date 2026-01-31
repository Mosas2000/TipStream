import { useEffect, useState } from 'react';
import { callReadOnlyFunction, cvToJSON, uintCV } from '@stacks/transactions';
import { network } from '../utils/stacks';

const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const CONTRACT_NAME = 'tipstream';

export default function RecentTips() {
    const [tips, setTips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentTips();
    }, []);

    const fetchRecentTips = async () => {
        try {
            const platformStats = await callReadOnlyFunction({
                network,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: 'get-platform-stats',
                functionArgs: [],
                senderAddress: CONTRACT_ADDRESS,
            });

            const statsJson = cvToJSON(platformStats);
            const totalTips = statsJson.value['total-tips'].value;

            const recentTipPromises = [];
            // Fetch up to 10 most recent tips
            const startId = Math.max(0, totalTips - 10);

            for (let i = totalTips - 1; i >= startId && i >= 0; i--) {
                recentTipPromises.push(
                    callReadOnlyFunction({
                        network,
                        contractAddress: CONTRACT_ADDRESS,
                        contractName: CONTRACT_NAME,
                        functionName: 'get-tip',
                        functionArgs: [uintCV(i)],
                        senderAddress: CONTRACT_ADDRESS,
                    })
                );
            }

            const results = await Promise.all(recentTipPromises);
            const tipsData = results
                .map(r => cvToJSON(r))
                .filter(t => t.value !== null)
                .map(t => t.value);

            setTips(tipsData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching recent tips:', error);
            setLoading(false);
        }
    };

    const truncateAddress = (address) => {
        const addrStr = typeof address === 'string' ? address : address.value;
        return `${addrStr.slice(0, 8)}...${addrStr.slice(-6)}`;
    };

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-100 rounded-2xl"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-8">Live Feed</h2>

            {tips.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">No tips in the stream yet. Be the first!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {tips.map((tip, index) => (
                        <div key={index} className="group p-6 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 rounded-3xl border border-transparent hover:border-blue-100 transition-all duration-300">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center space-x-4">
                                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2 text-sm text-slate-400 font-bold uppercase tracking-tighter">
                                            <span>{truncateAddress(tip.sender)}</span>
                                            <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                            <span>{truncateAddress(tip.recipient)}</span>
                                        </div>
                                        <p className="text-2xl font-black text-slate-900 mt-1">
                                            {(tip.amount.value / 1000000).toFixed(4)} <span className="text-blue-600 text-lg">STX</span>
                                        </p>
                                    </div>
                                </div>
                                {tip.message.value && (
                                    <div className="flex-1 md:max-w-md bg-white p-4 rounded-2xl border border-slate-100 shadow-inner">
                                        <p className="text-slate-600 italic text-sm leading-relaxed">
                                            "{tip.message.value}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
