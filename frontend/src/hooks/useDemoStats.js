import { useDemoMode } from '../context/DemoContext';

export function useDemoStats() {
  const { demoEnabled, demoTips } = useDemoMode();

  const generateDemoStats = () => {
    const totalAmount = demoTips.reduce((sum, tip) => sum + tip.amount, 0);

    return {
      totalTips: demoTips.length,
      totalAmount: totalAmount,
      averageTipAmount: demoTips.length > 0 ? totalAmount / demoTips.length : 0,
      activeTippers: new Set(demoTips.map(t => t.sender)).size,
      activeRecipients: new Set(demoTips.map(t => t.recipient)).size,
      platformStats: {
        totalTipsOnPlatform: demoTips.length + 1498,
        totalUsersOnPlatform: new Set([
          ...demoTips.map((tip) => tip.sender),
          ...demoTips.map((tip) => tip.recipient),
        ]).size + 248,
        averageTipSize: demoTips.length > 0 ? Math.round(totalAmount / demoTips.length) : 0,
      },
    };
  };

  const getDemoStats = () => {
    if (!demoEnabled) return null;
    return generateDemoStats();
  };

  return {
    getDemoStats,
    isDemoMode: demoEnabled,
  };
}
