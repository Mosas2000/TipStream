import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { userSession, authenticate, disconnect, getMainnetAddress, isValidUserData } from './utils/stacks';
import Header from './components/Header';
import SendTip from './components/SendTip';
import SkipNav from './components/SkipNav';
import RouteSkeleton from './components/RouteSkeleton';
import RequireAdmin from './components/RequireAdmin';
import LazyErrorBoundary from './components/LazyErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import MaintenancePage from './components/MaintenancePage';
import { AnimatedHero } from './components/ui/animated-hero';
import { ToastContainer, useToast } from './components/ui/toast';
import { analytics } from './lib/analytics';
import { useNotifications } from './hooks/useNotifications';
import { useContractHealth } from './hooks/useContractHealth';
import { useAdmin } from './hooks/useAdmin';
import { usePageTitle } from './hooks/usePageTitle';
import {
  ROUTE_SEND, ROUTE_BATCH, ROUTE_TOKEN_TIP, ROUTE_FEED,
  ROUTE_LEADERBOARD, ROUTE_ACTIVITY, ROUTE_PROFILE,
  ROUTE_BLOCK, ROUTE_STATS, ROUTE_ADMIN,
  DEFAULT_AUTHENTICATED_ROUTE,
} from './config/routes';
import { Zap, Radio, Trophy, User, BarChart3, Users, ShieldBan, Coins, UserCircle, Shield } from 'lucide-react';

const TipHistory = lazy(() => import('./components/TipHistory'));
const PlatformStats = lazy(() => import('./components/PlatformStats'));
const RecentTips = lazy(() => import('./components/RecentTips'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const ProfileManager = lazy(() => import('./components/ProfileManager'));
const BlockManager = lazy(() => import('./components/BlockManager'));
const BatchTip = lazy(() => import('./components/BatchTip'));
const TokenTip = lazy(() => import('./components/TokenTip'));
const NotFound = lazy(() => import('./components/NotFound'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

function App() {
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const location = useLocation();
  const { healthy, error: healthError, checking: healthChecking, retry: retryHealth } = useContractHealth();

  const userAddress = getMainnetAddress(userData);
  const { notifications, unreadCount, markAllRead, loading: notificationsLoading } = useNotifications(userAddress);
  const { isOwner } = useAdmin(userAddress);

  usePageTitle();

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const data = userSession.loadUserData();
      if (isValidUserData(data)) {
        setUserData(data);
      } else {
        console.warn('Session present but user data has unexpected shape:', data);
        analytics.trackAuthError('session_restore_invalid_shape');
      }
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
      if (!isValidUserData(data)) {
        console.error('authenticate() returned unexpected data shape:', data);
        addToast('Wallet connected but returned unexpected data. Please try again.', 'error');
        analytics.trackAuthError('invalid_data_shape');
        return;
      }
      setUserData(data);
      analytics.trackWalletConnect();
    } catch (error) {
      // User cancelled is not a real error
      if (error.message?.includes('cancelled')) {
        console.log('Wallet connection cancelled by user');
      } else {
        console.error('Authentication failed:', error.message || error);
        addToast(error.message || 'Failed to connect wallet. Please try again.', 'error');
        analytics.trackAuthError(error.message || 'unknown');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const navItems = useMemo(() => {
    const items = [
      { path: ROUTE_SEND, label: 'Send Tip', icon: Zap },
      { path: ROUTE_BATCH, label: 'Batch', icon: Users },
      { path: ROUTE_TOKEN_TIP, label: 'Token Tip', icon: Coins },
      { path: ROUTE_FEED, label: 'Live Feed', icon: Radio },
      { path: ROUTE_LEADERBOARD, label: 'Leaderboard', icon: Trophy },
      { path: ROUTE_ACTIVITY, label: 'My Activity', icon: User },
      { path: ROUTE_PROFILE, label: 'Profile', icon: UserCircle },
      { path: ROUTE_BLOCK, label: 'Block', icon: ShieldBan },
      { path: ROUTE_STATS, label: 'Stats', icon: BarChart3 },
    ];
    if (isOwner) {
      items.push({ path: ROUTE_ADMIN, label: 'Admin', icon: Shield });
    }
    return items;
  }, [isOwner]);

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
      <SkipNav />
      {/* OfflineBanner must render before Header in the DOM so it pushes
          the sticky Header down when visible, preventing overlap. */}
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

      <main id="main-content" className="flex-1">
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
            <LazyErrorBoundary>
              <Suspense fallback={<RouteSkeleton />}>
                <Routes>
                  <Route path={ROUTE_SEND} element={<SendTip addToast={addToast} />} />
                  <Route path={ROUTE_BATCH} element={<BatchTip addToast={addToast} />} />
                  <Route path={ROUTE_TOKEN_TIP} element={<TokenTip addToast={addToast} />} />
                  <Route path={ROUTE_FEED} element={<RecentTips addToast={addToast} />} />
                  <Route path={ROUTE_LEADERBOARD} element={<Leaderboard />} />
                  <Route path={ROUTE_ACTIVITY} element={<TipHistory userAddress={userAddress} />} />
                  <Route path={ROUTE_PROFILE} element={<ProfileManager addToast={addToast} />} />
                  <Route path={ROUTE_BLOCK} element={<BlockManager addToast={addToast} />} />
                  <Route path={ROUTE_STATS} element={<PlatformStats />} />
                  <Route path={ROUTE_ADMIN} element={<RequireAdmin><AdminDashboard userAddress={userAddress} addToast={addToast} /></RequireAdmin>} />
                  <Route path="/" element={<Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </LazyErrorBoundary>
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
