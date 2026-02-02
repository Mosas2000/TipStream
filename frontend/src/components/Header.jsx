export default function Header({ userData, onAuth }) {
    return (
        <nav className="bg-gradient-to-r from-gray-900 to-black shadow-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white p-2 rounded-xl shadow-inner">
                            <img
                                src="/logo.png"
                                alt="TipStream Logo"
                                className="h-16 w-16 object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">TipStream</h1>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300 bg-gray-800/50 px-2 py-0.5 rounded-full">v1.0.0</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        {userData && (
                            <div className="hidden lg:flex flex-col items-end">
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Connected Wallet</span>
                                <p className="text-sm font-mono text-white/90 bg-white/10 px-3 py-1 rounded-lg border border-white/5">
                                    {userData.profile.stxAddress.mainnet.slice(0, 6)}...
                                    {userData.profile.stxAddress.mainnet.slice(-4)}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={onAuth}
                            className={`px-8 py-2.5 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg ${userData
                                ? 'bg-red-500/10 text-red-100 border border-red-500/50 hover:bg-red-500 hover:text-white'
                                : 'bg-white text-gray-900 hover:bg-gray-50 hover:shadow-white/10'
                                }`}
                        >
                            {userData ? 'Disconnect' : 'Connect Wallet'}
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
