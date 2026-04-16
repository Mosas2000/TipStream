import { useDemoMode } from '../context/DemoContext';

export function useDemoLeaderboard() {
  const { demoEnabled, demoTips } = useDemoMode();

  const getLeaderboard = () => {
    if (!demoEnabled) return null;

    const totals = new Map();
    for (const tip of demoTips) {
      const amount = Number(tip.amount || 0);
      const recipient = tip.recipient;
      const sender = tip.sender;

      const recipientEntry = totals.get(recipient) || {
        address: recipient,
        name: recipient.slice(0, 8),
        totalTipsReceived: 0,
        tipCount: 0,
      };
      recipientEntry.totalTipsReceived += amount;
      recipientEntry.tipCount += 1;
      totals.set(recipient, recipientEntry);

      if (!totals.has(sender)) {
        totals.set(sender, {
          address: sender,
          name: sender.slice(0, 8),
          totalTipsReceived: 0,
          tipCount: 0,
        });
      }
    }

    return [...totals.values()]
      .filter((entry) => entry.totalTipsReceived > 0)
      .sort((a, b) => b.totalTipsReceived - a.totalTipsReceived)
      .map((entry, index) => ({ rank: index + 1, ...entry }));
  };

  const getRank = (address) => {
    if (!demoEnabled) return null;
    const leaderboard = getLeaderboard();
    return leaderboard?.find((entry) => entry.address === address)?.rank || null;
  };

  return {
    getDemoLeaderboard: getLeaderboard,
    getDemoRank: getRank,
    isDemoMode: demoEnabled,
  };
}
