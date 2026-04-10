import { DEMO_CONFIG, setDemoMode } from '../config/demo';

export function activateDemo() {
  setDemoMode(true);
  console.log('Demo mode activated. Wallet address: ' + DEMO_CONFIG.mockWalletAddress);
}

export function deactivateDemo() {
  setDemoMode(false);
  console.log('Demo mode deactivated');
}

export function getDemoWalletAddress() {
  return DEMO_CONFIG.mockWalletAddress;
}

export function isDemoModeActive() {
  return DEMO_CONFIG.enabled;
}

export function getMockBalance() {
  return DEMO_CONFIG.mockBalance;
}

export function getMockTransactionDelay() {
  return DEMO_CONFIG.mockTransactionDelay;
}
