export const DEMO_CONFIG = {
  enabled: false,
  mockWalletAddress: 'SP3FBR2AGJ5H7QXKP528NBRWQDYKE1E7XB8FJXQXG',
  mockBalance: 5000,
  mockTransactionDelay: 800,
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
  ],
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
}

export function loadDemoPreference() {
  const saved = localStorage.getItem('tipstream_demo_mode');
  if (saved !== null) {
    DEMO_CONFIG.enabled = saved === 'true';
  }
}
