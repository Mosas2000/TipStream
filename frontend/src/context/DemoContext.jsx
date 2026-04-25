import { createContext, useContext, useState } from 'react';
import { isDemo, getDemo, setDemoMode, loadDemoPreference } from '../config/demo';

/**
 * Context for managing the isolated sandbox state.
 * All demo activity (tips, balances, notifications) lives here
 * to prevent pollution of actual local storage or chain state.
 */
const DemoContext = createContext({
  demoEnabled: false,
  toggleDemo: () => {},
  getDemoData: () => getDemo(),
  demoBalance: getDemo().mockBalance,
  setDemoBalance: () => {},
  demoTips: [],
  demoNotifications: [],
  demoStats: getDemo().mockStats,
  addDemoTip: () => {},
  markNotificationRead: () => {},
  clearDemoHistory: () => {},
  resetDemoState: () => {},
});

/**
 * Hook to access the current sandbox demo state and mutators.
 * Safely falls back to default values if used outside the provider.
 */
export function useDemoMode() {
  const context = useContext(DemoContext);
  return context;
}

/**
 * Provider component that maintains the ephemeral sandbox state during a demo session.
 */
export function DemoProvider({ children }) {

  const [demoEnabled, setDemoEnabled] = useState(() => {
    loadDemoPreference();
    return isDemo();
  });
  const [demoBalance, setDemoBalance] = useState(() => getDemo().mockBalance);
  const [demoTips, setDemoTips] = useState(() => [...getDemo().mockTips]);
  const [demoNotifications, setDemoNotifications] = useState(() => [...getDemo().mockNotifications]);
  const [demoStats, setDemoStats] = useState(() => ({ ...getDemo().mockStats }));

  const toggleDemo = (enabled) => {
    setDemoMode(enabled);
    setDemoEnabled(enabled);
    // Always reset to initial config state on toggle to ensure freshness
    resetDemoState();
  };


  const getDemoData = () => {
    return getDemo();
  };

  const resetDemoState = () => {
    setDemoBalance(getDemo().mockBalance);
    setDemoTips([...getDemo().mockTips]);
    setDemoNotifications([...getDemo().mockNotifications]);
    setDemoStats({ ...getDemo().mockStats });
  };

  const addDemoTip = (tipData) => {
    if (!demoEnabled) {
      return;
    }

    const newTip = {
      id: `demo-${Date.now()}`,
      sender: getDemo().mockWalletAddress,
      recipient: tipData.recipient,
      amount: tipData.amount,
      memo: tipData.memo || tipData.message || '',
      timestamp: Date.now(),
      category: tipData.category ?? null,
      txId: `0x${Math.random().toString(16).slice(2, 66)}`, // Simulate txId
    };

    setDemoTips((currentTips) => [newTip, ...currentTips]);
    
    // Deduct from mock balance
    setDemoBalance(prev => prev - tipData.amount);

    // Update mock stats
    setDemoStats(prev => ({
      ...prev,
      totalVolume: prev.totalVolume + tipData.amount,
      totalTips: prev.totalTips + 1
    }));
  };

  const markNotificationRead = (id) => {
    setDemoNotifications(current => 
      current.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const clearDemoHistory = () => {
    setDemoTips([]);
    setDemoNotifications([]);
  };

  const value = {
    demoEnabled,
    toggleDemo,
    getDemoData,
    demoBalance,
    setDemoBalance,
    demoTips,
    demoNotifications,
    demoStats,
    addDemoTip,
    markNotificationRead,
    clearDemoHistory,
    resetDemoState,
  };


  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}
