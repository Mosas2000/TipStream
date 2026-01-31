export default function Leaderboard() {
    return (
        <div className="bg-white p-12 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
            <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-yellow-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <span className="text-5xl">🏆</span>
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Leaderboards</h2>
                <p className="text-slate-500 font-medium mb-10 leading-relaxed">
                    Compete with other tippers and earners. Leaderboards update every 24 hours based on total volume.
                </p>

                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 mb-8">
                    <h3 className="text-blue-600 font-black uppercase tracking-widest text-xs mb-4">Coming Next</h3>
                    <div className="space-y-3">
                        {['On-chain ranking engine', 'Verified creator badges', 'Exclusive reward tiers'].map((item, i) => (
                            <div key={i} className="flex items-center text-slate-700 font-bold bg-white/80 p-3 rounded-xl border border-white">
                                <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                <span className="inline-block px-6 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] rounded-full shadow-xl">
                    Phase 3 Development
                </span>
            </div>
        </div>
    );
}
