import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { userSession, authenticate, disconnect } from './utils/stacks';
import Header from './components/Header';
import SendTip from './components/SendTip';
import OfflineBanner from './components/OfflineBanner';
import MaintenancePage from './components/MaintenancePage';
import { AnimatedHero } from './components/ui/animated-hero';
import { ToastContainer, useToast } from './components/ui/toast';
import { analytics } from './lib/analytics';
import { useNotifications } from './hooks/useNotifications';
import { useContractHealth } from './hooks/useContractHealth';
import { Zap, Radio, Trophy, User, BarChart3 } from 'lucide-react';

const TipHistory = lazy(() => import('./components/TipHistory'));
const PlatformStats = lazy(() => import('./components/PlatformStats'));
const RecentTips = lazy(() => import('./components/RecentTips'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));

function App() {
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const location = useLocation();
  const { healthy, error: healthError, checking: healthChecking, retry: retryHealth } = useContractHealth();

  const userAddress = userData?.profile?.stxAddress?.mainnet || null;
  const { notifications, unreadCount, markAllRead, loading: notificationsLoading } = useNotifications(userAddress);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
    analytics.trackSession();
  }, []);

  useEffect(() => {
    analytics.trackPageView(location.pathname);
  }, [location.pathname]);

  const handleAuth = async () => {
    if (userData) {
      disconnect();
      setUserData(null);
      analytics.trackWalletDisconnect();
      return;
    }
    setAuthLoading(true);
    try {
      const data = await authenticate();
      setUserData(data);
      analytics.trackWalletConnect();
    } catch (error) {
      // User cancelled is not a real error
      if (error.message?.includes('cancelled')) {
        console.log('Wallet connection cancelled by user');
      } else {
        console.error('Authentication failed:', error.message || error);
        addToast(error.message || 'Failed to connect wallet. Please try again.', 'error');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const navItems = [
    { path: '/send', label: 'Send Tip', icon: Zap },
    { path: '/feed', label: 'Live Feed', icon: Radio },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/activity', label: 'My Activity', icon: User },
    { path: '/stats', label: 'Stats', icon: BarChart3 },
  ];

  if (healthy === false) {
    return (
      <MaintenancePage
        error={healthError}
        onRetry={retryHealth}
        checking={healthChecking}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors">
      <OfflineBanner />
      <Header
        userData={userData}
        onAuth={handleAuth}
        authLoading={authLoading}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkNotificationsRead={markAllRead}
        notificationsLoading={notificationsLoading}
      />

      <main className="flex-1">
        {userData ? (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
            {/* Navigation */}
            <nav className="mb-10 -mx-4 sm:mx-0">
              <div className="overflow-x-auto scrollbar-hide px-4 sm:px-0">
                <div className="flex justify-start sm:justify-center min-w-max sm:min-w-0">
                  <div
                    className="inline-flex p-1 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800"
                    role="navigation"
                    aria-label="Main navigation"
                  >
                    {navItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all min-h-[40px] ${
                            isActive
                              ? 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black shadow-sm'
                              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`
                        }
                      >
                        <item.icon className="w-4 h-4" aria-hidden="true" />
                        <span className={location.pathname === item.path ? 'block' : 'hidden sm:block'}>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            {/* Page content */}
            <Suspense
              fallback={
                <div className="flex justify-center items-center py-20">
                  <div className="space-y-4 w-full max-w-md animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
                    <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-full mt-4"></div>
                  </div>
                </div>
              }
            >
              <Routes>
                <Route path="/send" element={<SendTip addToast={addToast} />} />
                <Route path="/feed" element={<RecentTips addToast={addToast} />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/activity" element={<TipHistory userAddress={userData.profile.stxAddress.mainnet} />} />
                <Route path="/stats" element={<PlatformStats />} />
                <Route path="*" element={<Navigate to="/send" replace />} />
              </Routes>
            </Suspense>
          </div>
        ) : (
          <AnimatedHero onGetStarted={handleAuth} loading={authLoading} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row justify-between items-center text-gray-400 dark:text-gray-500 text-sm gap-3">
          <p>&copy; {new Date().getFullYear()} TipStream</p>
          <nav aria-label="Footer links" className="flex gap-6">
            <a href="https://github.com/Mosas2000/TipStream" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">GitHub</a>
            <a href="https://explorer.hiro.so/txid/SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream?chain=mainnet" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">Contract</a>
            <a href="https://x.com/search?q=%23TipStream" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">X / Twitter</a>
          </nav>
        </div>
      </footer>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
