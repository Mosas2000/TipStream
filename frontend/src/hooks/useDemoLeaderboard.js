import { useDemoMode } from '../context/DemoContext';
import { getDemo } from '../config/demo';

function generateDemoLeaderboard() {
  const demo = getDemo();
  const mockUsers = [
    { address: 'SP1RVJEX1ZZJN3D6JXVCP3N2S4N4S4S4S4S', name: 'Alice', tips: 1500 },
    { address: 'SP2TJVJEX1ZZJN3D6JXVCP3N2S4N4S4S4S4', name: 'Bob', tips: 1200 },
    { address: 'SP3TJVJEX1ZZJN3D6JXVCP3N2S4N4S4S4S4', name: 'Charlie', tips: 950 },
    { address: 'SP4TJVJEX1ZZJN3D6JXVCP3N2S4N4S4S4S4', name: 'Diana', tips: 850 },
    { address: 'SP5TJVJEX1ZZJN3D6JXVCP3N2S4N4S4S4S4', name: 'Eve', tips: 750 },
  ];

  return mockUsers.map((user, index) => ({
    rank: index + 1,
    address: user.address,
    name: user.name,
    totalTipsReceived: user.tips,
    tipCount: Math.floor(user.tips / 200),
  }));
}

export function useDemoLeaderboard() {
  const { demoEnabled } = useDemoMode();

  const getLeaderboard = () => {
    if (!demoEnabled) return null;
    return generateDemoLeaderboard();
  };

  const getRank = (address) => {
    if (!demoEnabled) return null;
    const demo = getDemo();
    const index = demo.mockTips.findIndex(t => t.recipient === address);
    return index !== -1 ? index + 1 : null;
  };

  return {
    getDemoLeaderboard: getLeaderboard,
    getDemoRank: getRank,
    isDemoMode: demoEnabled,
  };
}
