import { useState, useCallback, useEffect } from 'react';
import { useDemoMode } from '../context/DemoContext';
import { getDemo } from '../config/demo';

export function useDemoHistory() {
  const { demoEnabled } = useDemoMode();
  const [demoTips, setDemoTips] = useState(() => {
    return demoEnabled ? [...getDemo().mockTips] : [];
  });

  useEffect(() => {
    if (demoEnabled) {
      setDemoTips([...getDemo().mockTips]);
    }
  }, [demoEnabled]);

  const addDemoTip = useCallback((tipData) => {
    if (!demoEnabled) return;

    const newTip = {
      id: 'demo-' + Date.now(),
      sender: getDemo().mockWalletAddress,
      ...tipData,
      timestamp: Date.now(),
    };

    setDemoTips(prev => [newTip, ...prev]);
  }, [demoEnabled]);

  const getDemoHistory = useCallback(() => {
    if (!demoEnabled) return [];
    return demoTips;
  }, [demoEnabled, demoTips]);

  const clearDemoHistory = useCallback(() => {
    setDemoTips([]);
  }, []);

  return {
    demoTips,
    addDemoTip,
    getDemoHistory,
    clearDemoHistory,
    isDemoMode: demoEnabled,
  };
}
