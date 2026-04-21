import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { userSession, authenticate, disconnect, getMainnetAddress, isValidUserData } from './utils/stacks';
import Header from './components/Header';
import SkipNav from './components/SkipNav';
import RouteSkeleton from './components/RouteSkeleton';
import RequireAdmin from './components/RequireAdmin';
import RequireAuth from './components/RequireAuth';
import LazyErrorBoundary from './components/LazyErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { DemoIndicator } from './components/DemoIndicator';
import { ToastContainer, useToast } from './components/ui/toast';
import { analytics } from './lib/analytics';
import { useNotifications } from './hooks/useNotifications';
import { useContractHealth } from './hooks/useContractHealth';
import { useAdmin } from './hooks/useAdmin';
import { usePageTitle } from './hooks/usePageTitle';
import { useSessionSync } from './hooks/useSessionSync';
import { useDemoMode } from './context/DemoContext';
import {
  ROUTE_SEND, ROUTE_TOKEN_TIP, ROUTE_FEED,
  ROUTE_LEADERBOARD, ROUTE_ACTIVITY, ROUTE_PROFILE,
  ROUTE_BLOCK, ROUTE_STATS, ROUTE_ADMIN, ROUTE_TELEMETRY,
  DEFAULT_AUTHENTICATED_ROUTE, ROUTE_META,
} from './config/routes';
import { Zap, Radio, Trophy, User, BarChart3, ShieldBan, Coins, UserCircle, Shield, Gauge } from 'lucide-react';
import { activateDemo, deactivateDemo } from './lib/demo-utils';

const AnimatedHero = lazy(() => import('./components/ui/animated-hero').then(m => ({ default: m.AnimatedHero })));
const MaintenancePage = lazy(() => import('./components/MaintenancePage'));
const SendTip = lazy(() => import('./components/SendTip'));
const TipHistory = lazy(() => import('./components/TipHistory'));
const PlatformStats = lazy(() => import('./components/PlatformStats'));
const RecentTips = lazy(() => import('./components/RecentTips'));
const Leaderboard = lazy(() => import('./components/Leaderboard'));
const ProfileManager = lazy(() => import('./components/ProfileManager'));
const BlockManager = lazy(() => import('./components/BlockManager'));
const TokenTip = lazy(() => import('./components/TokenTip'));
const NotFound = lazy(() => import('./components/NotFound'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const TelemetryDashboard = lazy(() => import('./components/TelemetryDashboard'));

function App() {
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { healthy, error: healthError, checking: healthChecking, retry: retryHealth } = useContractHealth();
  const { demoEnabled, toggleDemo } = useDemoMode();

  const userAddress = getMainnetAddress(userData);
  const { notifications, unreadCount, lastSeenTimestamp, markAllRead, loading: notificationsLoading } = useNotifications(userAddress);
  const { isOwner } = useAdmin(userAddress);

  usePageTitle();

  // Restore initial session on mount
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

  // Synchronize session state across tabs and provider account changes
  useSessionSync((sessionState) => {
    const { isSignedIn, userData } = sessionState;
    if (isSignedIn && isValidUserData(userData)) {
      setUserData(userData);
      // Reset auth loading state in case this was triggered by async operation
      setAuthLoading(false);
    } else if (!isSignedIn) {
      setUserData(null);
      setAuthLoading(false);
    }
  });

  useEffect(() => {
    analytics.trackPageView(location.pathname);
  }, [location.pathname]);

  const handleAuth = async () => {
    if (demoEnabled) {
      deactivateDemo();
      toggleDemo(false);
      setDemoLoading(false);
      navigate(ROUTE_FEED, { replace: true });
      addToast('Demo mode exited.', 'info');
      return;
    }

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

  const handleTryDemo = () => {
    setDemoLoading(true);
    activateDemo();
    toggleDemo(true);
    setUserData(null);
    setAuthLoading(false);
    navigate(ROUTE_SEND, { replace: true });
    addToast('Demo mode started. No wallet required.', 'success');
    setDemoLoading(false);
  };

  const navItems = useMemo(() => {
    const allItems = [
      { path: ROUTE_SEND, label: 'Send Tip', icon: Zap },
      { path: ROUTE_TOKEN_TIP, label: 'Token Tip', icon: Coins },
      { path: ROUTE_FEED, label: 'Live Feed', icon: Radio },
      { path: ROUTE_LEADERBOARD, label: 'Leaderboard', icon: Trophy },
      { path: ROUTE_ACTIVITY, label: 'My Activity', icon: User },
      { path: ROUTE_PROFILE, label: 'Profile', icon: UserCircle },
      { path: ROUTE_BLOCK, label: 'Block', icon: ShieldBan },
      { path: ROUTE_STATS, label: 'Stats', icon: BarChart3 },
    ];
    
    // Filter items based on auth and admin status
    const items = allItems.filter((item) => {
      const meta = ROUTE_META[item.path];
      // Show authenticated routes only if user is authenticated
      if (meta.requiresAuth && !userData && !demoEnabled) return false;
      // Show admin routes only if user is owner
      if (meta.adminOnly && !isOwner) return false;
      return true;
    });
    
    if (isOwner) {
      items.push({ path: ROUTE_ADMIN, label: 'Admin', icon: Shield });
      items.push({ path: ROUTE_TELEMETRY, label: 'Telemetry', icon: Gauge });
    }
    return items;
  }, [userData, isOwner, demoEnabled]);

  if (healthy === false) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-950" />}>
        <MaintenancePage
          error={healthError}
          onRetry={retryHealth}
          checking={healthChecking}
        />
      </Suspense>
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
        demoEnabled={demoEnabled}
        notifications={notifications}
        unreadCount={unreadCount}
        lastSeenTimestamp={lastSeenTimestamp}
        onMarkNotificationsRead={markAllRead}
        notificationsLoading={notificationsLoading}
        apiReachable={healthy}
      />

      <main id="main-content" tabIndex={-1} className="flex-1">
        {/* Show landing hero only if user has not connected AND is on home route */}
        {!userData && !demoEnabled && location.pathname === '/' ? (
          <Suspense fallback={<div className="min-h-[85vh] bg-black" />}>
            <AnimatedHero onGetStarted={handleAuth} onTryDemo={handleTryDemo} loading={authLoading} demoLoading={demoLoading} />
          </Suspense>
        ) : (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
            {/* Navigation - only show if there are navigable items */}
            {navItems.length > 0 && (
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
            )}

            {/* Page content */}
            <LazyErrorBoundary>
              <Suspense fallback={<RouteSkeleton />}>
                <Routes>
                  {/* Authenticated-only routes */}
                  <Route 
                    path={ROUTE_SEND} 
                    element={
                      userData || demoEnabled ? (
                        <SendTip addToast={addToast} />
                      ) : (
                        <RequireAuth onAuth={handleAuth} authLoading={authLoading} route={ROUTE_SEND}>
                          <SendTip addToast={addToast} />
                        </RequireAuth>
                      )
                    } 
                  />
                  <Route 
                    path={ROUTE_TOKEN_TIP} 
                    element={
                      userData || demoEnabled ? (
                        <TokenTip addToast={addToast} />
                      ) : (
                        <RequireAuth onAuth={handleAuth} authLoading={authLoading} route={ROUTE_TOKEN_TIP}>
                          <TokenTip addToast={addToast} />
                        </RequireAuth>
                      )
                    } 
                  />
                  
                  {/* Public routes - accessible to all */}
                  <Route path={ROUTE_FEED} element={<RecentTips addToast={addToast} />} />
                  <Route path={ROUTE_LEADERBOARD} element={<Leaderboard />} />
                  <Route path={ROUTE_STATS} element={<PlatformStats />} />
                  
                  {/* User-specific routes */}
                  <Route 
                    path={ROUTE_ACTIVITY} 
                    element={
                      userData || demoEnabled ? (
                        <TipHistory userAddress={userAddress} />
                      ) : (
                        <RequireAuth onAuth={handleAuth} authLoading={authLoading} route={ROUTE_ACTIVITY}>
                          <TipHistory userAddress={userAddress} />
                        </RequireAuth>
                      )
                    } 
                  />
                  <Route 
                    path={ROUTE_PROFILE} 
                    element={
                      userData || demoEnabled ? (
                        <ProfileManager addToast={addToast} />
                      ) : (
                        <RequireAuth onAuth={handleAuth} authLoading={authLoading} route={ROUTE_PROFILE}>
                          <ProfileManager addToast={addToast} />
                        </RequireAuth>
                      )
                    } 
                  />
                  <Route 
                    path={ROUTE_BLOCK} 
                    element={
                      userData || demoEnabled ? (
                        <BlockManager addToast={addToast} />
                      ) : (
                        <RequireAuth onAuth={handleAuth} authLoading={authLoading} route={ROUTE_BLOCK}>
                          <BlockManager addToast={addToast} />
                        </RequireAuth>
                      )
                    } 
                  />
                  
                  {/* Admin-only routes */}
                  <Route path={ROUTE_ADMIN} element={<RequireAdmin><AdminDashboard userAddress={userAddress} addToast={addToast} /></RequireAdmin>} />
                  <Route path={ROUTE_TELEMETRY} element={<RequireAdmin><TelemetryDashboard addToast={addToast} /></RequireAdmin>} />
                  
                  {/* Root and fallback */}
                  <Route path="/" element={<Navigate to={userData || demoEnabled ? DEFAULT_AUTHENTICATED_ROUTE : ROUTE_FEED} replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </LazyErrorBoundary>
          </div>
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
      <DemoIndicator />
    </div>
  );
}

export default App;
