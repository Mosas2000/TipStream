import { useState, useEffect } from 'react';
import { userSession, authenticate, disconnect } from './utils/stacks';
import Header from './components/Header';
import SendTip from './components/SendTip';
import TipHistory from './components/TipHistory';
import PlatformStats from './components/PlatformStats';
import RecentTips from './components/RecentTips';
import Leaderboard from './components/Leaderboard';

function App() {
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('send');

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  const handleAuth = () => {
    if (userData) {
      disconnect();
      setUserData(null);
    } else {
      authenticate();
    }
  };

  const tabs = [
    { id: 'send', label: 'Send Tip', icon: '⚡' },
    { id: 'history', label: 'My Activity', icon: '👤' },
    { id: 'recent', label: 'Recent Tips', icon: '📡' },
    { id: 'stats', label: 'Platform Stats', icon: '📊' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header userData={userData} onAuth={handleAuth} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {userData ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-wrap justify-center gap-3 mb-16">
              <div className="inline-flex p-1.5 bg-white/80 backdrop-blur-md rounded-[2rem] shadow-xl shadow-blue-500/5 border border-gray-100">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-[1.5rem] text-sm font-bold transition-all duration-300 ${activeTab === tab.id
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    <span>{tab.icon}</span>
                    <span className={activeTab === tab.id ? 'block' : 'hidden sm:block'}>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="transition-all duration-500 transform">
              {activeTab === 'send' && <SendTip />}
              {activeTab === 'history' && (
                <TipHistory userAddress={userData.profile.stxAddress.mainnet} />
              )}
              {activeTab === 'stats' && <PlatformStats />}
              {activeTab === 'recent' && <RecentTips />}
              {activeTab === 'leaderboard' && <Leaderboard />}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto text-center py-20 animate-in zoom-in-95 duration-1000">
            <div className="mb-12 relative flex justify-center">
              <div className="absolute inset-0 bg-blue-400 blur-[120px] opacity-20 rounded-full animate-pulse"></div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl relative z-10 border border-gray-100">
                <svg className="h-24 w-24 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            <h2 className="text-6xl font-black mb-6 text-slate-900 tracking-tight leading-tight">
              Support Creators with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Micro-Tips</span>
            </h2>
            <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
              TipStream is the fastest way to send STX tips to your favorite creators on the Stacks blockchain. Secured by Bitcoin.
            </p>

            <button
              onClick={handleAuth}
              className="bg-slate-900 hover:bg-slate-800 text-white px-12 py-5 rounded-2xl text-xl font-bold shadow-2xl hover:shadow-slate-200 transition-all transform hover:-translate-y-1 active:scale-95"
            >
              Get Started Now
            </button>

            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Ultra Fast", icon: "⚡", desc: "Transactions complete on Stacks speed" },
                { title: "Low Fees", icon: "💎", desc: "0.5% platform fee for creators" },
                { title: "Secure", icon: "🛡️", desc: "Settled on the Bitcoin network" }
              ].map((feature, i) => (
                <div key={i} className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-100">
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h3 className="font-bold text-slate-800 mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm font-medium">
          <p>© 2026 TipStream - Built with Transparency</p>
          <div className="flex space-x-8 mt-4 md:mt-0">
            <a href="#" className="hover:text-blue-600 transition-colors">Twitter</a>
            <a href="#" className="hover:text-blue-600 transition-colors">GitHub</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
