import { createContext, useContext, useState } from 'react';
import { isDemo, getDemo, setDemoMode, loadDemoPreference } from '../config/demo';

const DemoContext = createContext({
  demoEnabled: false,
  toggleDemo: () => {},
  getDemoData: () => getDemo(),
  demoBalance: getDemo().mockBalance,
  setDemoBalance: () => {},
  demoTips: [],
  addDemoTip: () => {},
  clearDemoHistory: () => {},
  resetDemoState: () => {},
});

export function useDemoMode() {
  const context = useContext(DemoContext);
  return context;
}

export function DemoProvider({ children }) {
  const [demoEnabled, setDemoEnabled] = useState(() => {
    loadDemoPreference();
    return isDemo();
  });
  const [demoBalance, setDemoBalance] = useState(() => getDemo().mockBalance);
  const [demoTips, setDemoTips] = useState(() => [...getDemo().mockTips]);

  const toggleDemo = (enabled) => {
    setDemoMode(enabled);
    setDemoEnabled(enabled);
    if (enabled) {
      setDemoBalance(getDemo().mockBalance);
      setDemoTips([...getDemo().mockTips]);
      return;
    }

    setDemoBalance(getDemo().mockBalance);
    setDemoTips([]);
  };

  const getDemoData = () => {
    return getDemo();
  };

  const resetDemoState = () => {
    setDemoBalance(getDemo().mockBalance);
    setDemoTips([...getDemo().mockTips]);
  };

  const addDemoTip = (tipData) => {
    if (!demoEnabled) {
      return;
    }

    setDemoTips((currentTips) => [
      {
        id: `demo-${Date.now()}`,
        sender: getDemo().mockWalletAddress,
        recipient: tipData.recipient,
        amount: tipData.amount,
        memo: tipData.memo || tipData.message || '',
        timestamp: Date.now(),
        category: tipData.category ?? null,
      },
      ...currentTips,
    ]);
  };

  const clearDemoHistory = () => {
    setDemoTips([]);
  };

  const value = {
    demoEnabled,
    toggleDemo,
    getDemoData,
    demoBalance,
    setDemoBalance,
    demoTips,
    addDemoTip,
    clearDemoHistory,
    resetDemoState,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}
