export const DEMO_CONFIG = {
  enabled: false,
  mockWalletAddress: 'SP3FBR2AGJ5H7QXKP528NBRWQDYKE1E7XB8FJXQXG',
  mockBalance: 5000,
  mockTransactionDelay: 1200,
  mockTips: [
    {
      id: 'demo-1',
      sender: 'SP3FBR2AGJ5H7QXKP528NBRWQDYKE1E7XB8FJXQXG',
      recipient: 'SPMWDB630R3200TJ3XSDPDWYCZ96THWSM6DK4D0',
      amount: 150,
      memo: 'Great work on the demo!',
      timestamp: Date.now() - 3600000,
    },
    {
      id: 'demo-2',
      sender: 'SP2J6ZY48GV6YJSR8TLCGY4TMMQ73WY5VHEWLJQF',
      recipient: 'SP3FBR2AGJ5H7QXKP528NBRWQDYKE1E7XB8FJXQXG',
      amount: 100,
      memo: 'Thanks for the platform',
      timestamp: Date.now() - 7200000,
    },
    {
      id: 'demo-3',
      sender: 'SP3FBR2AGJ5H7QXKP528NBRWQDYKE1E7XB8FJXQXG',
      recipient: 'SP1P72Z3704VMT3DMHPP2CB8TGQWGDBHD3R0XG9K',
      amount: 250,
      memo: 'Keep it up!',
      timestamp: Date.now() - 10800000,
    },
  ],
  mockNotifications: [
    {
      id: 'notif-1',
      type: 'tip_received',
      amount: 100,
      sender: 'SP2J6ZY48GV6YJSR8TLCGY4TMMQ73WY5VHEWLJQF',
      timestamp: Date.now() - 7200000,
      read: false,
    },
    {
      id: 'notif-2',
      type: 'tip_confirmed',
      amount: 150,
      recipient: 'SPMWDB630R3200TJ3XSDPDWYCZ96THWSM6DK4D0',
      timestamp: Date.now() - 3500000,
      read: true,
    }
  ],
  mockStats: {
    totalVolume: 125400,
    totalTips: 842,
    uniqueUsers: 156,
    avgTip: 148,
  }
};

export function isDemo() {
  return DEMO_CONFIG.enabled;
}

export function getDemo() {
  return DEMO_CONFIG;
}

export function setDemoMode(enabled) {
  DEMO_CONFIG.enabled = enabled;
  localStorage.setItem('tipstream_demo_mode', enabled ? 'true' : 'false');
  if (!enabled) {
    // Optional: Clear demo-specific session data
  }
}

export function loadDemoPreference() {
  const saved = localStorage.getItem('tipstream_demo_mode');
  if (saved !== null) {
    DEMO_CONFIG.enabled = saved === 'true';
  }
}

