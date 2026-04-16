import { useDemoMode } from '../context/DemoContext';

export function useDemoBalance(realBalance) {
  const { demoEnabled, demoBalance, setDemoBalance, resetDemoState } = useDemoMode();
  const deductBalance = (amount) => {
    setDemoBalance((prev) => Math.max(0, prev - amount));
  };
  const addBalance = (amount) => {
    setDemoBalance((prev) => prev + amount);
  };
  const resetBalance = () => {
    resetDemoState();
  };

  return {
    balance: demoEnabled ? demoBalance : realBalance,
    deductBalance: demoEnabled ? deductBalance : () => {},
    addBalance: demoEnabled ? addBalance : () => {},
    resetBalance: demoEnabled ? resetBalance : () => {},
    isDemoBalance: demoEnabled,
  };
}
