import { useState, useCallback } from 'react';
import { useDemoMode } from '../context/DemoContext';
import { getDemo } from '../config/demo';

export function useDemoBalance(realBalance) {
  const { demoEnabled } = useDemoMode();
  const [demoBalance, setDemoBalance] = useState(() => {
    return getDemo().mockBalance;
  });

  const deductBalance = useCallback((amount) => {
    setDemoBalance(prev => Math.max(0, prev - amount));
  }, []);

  const addBalance = useCallback((amount) => {
    setDemoBalance(prev => prev + amount);
  }, []);

  const resetBalance = useCallback(() => {
    setDemoBalance(getDemo().mockBalance);
  }, []);

  return {
    balance: demoEnabled ? demoBalance : realBalance,
    deductBalance: demoEnabled ? deductBalance : () => {},
    addBalance: demoEnabled ? addBalance : () => {},
    resetBalance: demoEnabled ? resetBalance : () => {},
    isDemoBalance: demoEnabled,
  };
}
