export interface DemoConfig {
  enabled: boolean;
  mockWalletAddress: string;
  mockBalance: number;
  mockTransactionDelay: number;
  mockTips: MockTip[];
}

export interface MockTip {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  memo: string;
  timestamp: number;
}

export interface MockTransaction {
  id: string;
  status: 'pending' | 'completed';
  timestamp: number;
}

export interface MockTransactionResult {
  txId: string;
  success: boolean;
  timestamp: number;
}

export interface DemoLeaderboardEntry {
  rank: number;
  address: string;
  name: string;
  totalTipsReceived: number;
  tipCount: number;
}

export interface DemoStats {
  totalTips: number;
  totalAmount: number;
  averageTipAmount: number;
  activeTippers: number;
  activeRecipients: number;
  platformStats: {
    totalTipsOnPlatform: number;
    totalUsersOnPlatform: number;
    averageTipSize: number;
  };
}

export interface DemoBalance {
  balance: number;
  deductBalance: (amount: number) => void;
  addBalance: (amount: number) => void;
  resetBalance: () => void;
  isDemoBalance: boolean;
}

export interface DemoContextType {
  demoEnabled: boolean;
  toggleDemo: (enabled: boolean) => void;
  getDemoData: () => DemoConfig;
}
