import { useDemoMode } from '../context/DemoContext';
import { getDemo } from '../config/demo';

export function useDemoStats() {
  const { demoEnabled } = useDemoMode();

  const generateDemoStats = () => {
    const demo = getDemo();
    const totalAmount = demo.mockTips.reduce((sum, tip) => sum + tip.amount, 0);

    return {
      totalTips: demo.mockTips.length,
      totalAmount: totalAmount,
      averageTipAmount: demo.mockTips.length > 0 ? totalAmount / demo.mockTips.length : 0,
      activeTippers: new Set(demo.mockTips.map(t => t.sender)).size,
      activeRecipients: new Set(demo.mockTips.map(t => t.recipient)).size,
      platformStats: {
        totalTipsOnPlatform: 1500,
        totalUsersOnPlatform: 250,
        averageTipSize: 100,
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
