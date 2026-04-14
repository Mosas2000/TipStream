import { useDemoMode } from '../context/DemoContext';

export function useDemoHistory() {
  const { demoEnabled, demoTips, addDemoTip, clearDemoHistory } = useDemoMode();
  const getDemoHistory = () => demoTips;

  return {
    demoTips,
    addDemoTip,
    getDemoHistory,
    clearDemoHistory,
    isDemoMode: demoEnabled,
  };
}
