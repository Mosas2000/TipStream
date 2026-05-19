// Central contract configuration
// All components should import from here instead of hardcoding addresses.

import { 
  validateNetwork
} from './validation.js';

export const CONTRACT_ADDRESS = 'SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60';
export const CONTRACT_NAME = 'tipstream';
export const CONTRACT_VERSION = 'v2.0.0';
export const CONTRACT_DEPLOYMENT_BLOCK = 7940053;

// Traits contract (required for token tipping)
export const TRAITS_CONTRACT_ADDRESS = 'SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60';
export const TRAITS_CONTRACT_NAME = 'tipstream-traits';

// Full contract identifiers
export const FULL_CONTRACT_ID = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
export const FULL_TRAITS_CONTRACT_ID = `${TRAITS_CONTRACT_ADDRESS}.${TRAITS_CONTRACT_NAME}`;

// Explorer links
export const CONTRACT_EXPLORER_URL = `https://explorer.hiro.so/txid/SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60.tipstream?chain=mainnet`;
export const DEPLOYMENT_TX_URL = 'https://explorer.hiro.so/txid/0x8ebb6a0469a0a29592e75bd09149147eecd4765f9eccb748c15194c2939a31a6?chain=mainnet';

const NETWORK = import.meta.env.VITE_NETWORK || 'mainnet';
export const NETWORK_NAME = validateNetwork(NETWORK);
export const STACKS_API_BASE = NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : NETWORK === 'testnet'
        ? 'https://api.testnet.hiro.so'
        : 'http://localhost:3999';

export const APP_URL = import.meta.env.VITE_APP_URL || 'https://tipstream-silk.vercel.app';

// WebSocket endpoint for real-time tip notifications (chainhook backend).
// When undefined the frontend falls back to polling.
export const WS_URL = import.meta.env.VITE_WS_URL || null;

// ----- Contract function names -----
// Tipping
export const FN_SEND_CATEGORIZED_TIP = 'send-categorized-tip';
export const FN_TIP_A_TIP = 'tip-a-tip';
export const FN_SEND_BATCH_TIPS = 'send-batch-tips';
export const FN_SEND_BATCH_TIPS_STRICT = 'send-batch-tips-strict';
export const FN_SEND_TOKEN_TIP = 'send-token-tip';

// Profile
export const FN_GET_PROFILE = 'get-profile';
export const FN_UPDATE_PROFILE = 'update-profile';

// Blocking
export const FN_IS_USER_BLOCKED = 'is-user-blocked';
export const FN_TOGGLE_BLOCK_USER = 'toggle-block-user';

// Token whitelist
export const FN_IS_TOKEN_WHITELISTED = 'is-token-whitelisted';
export const FN_WHITELIST_TOKEN = 'whitelist-token';

// Stats / read-only
export const FN_GET_USER_STATS = 'get-user-stats';
export const FN_GET_PLATFORM_STATS = 'get-platform-stats';
export const FN_GET_CURRENT_FEE_BASIS_POINTS = 'get-current-fee-basis-points';
export const FN_GET_FEE_FOR_AMOUNT = 'get-fee-for-amount';
export const FN_GET_FEE_SUMMARY = 'get-fee-summary';

// Refund
export const FN_REQUEST_REFUND = 'request-refund';
export const FN_APPROVE_REFUND = 'approve-refund';
export const FN_REJECT_REFUND = 'reject-refund';
export const FN_GET_REFUND_REQUEST = 'get-refund-request';
export const FN_IS_TIP_REFUNDED = 'is-tip-refunded';
export const FN_IS_REFUND_ELIGIBLE = 'is-refund-eligible';
export const FN_GET_REFUND_WINDOW_BLOCKS = 'get-refund-window-blocks';

// Contract validation helper
export function validateContractDeployment() {
  return {
    address: CONTRACT_ADDRESS,
    name: CONTRACT_NAME,
    version: CONTRACT_VERSION,
    deploymentBlock: CONTRACT_DEPLOYMENT_BLOCK,
    fullId: FULL_CONTRACT_ID,
    explorerUrl: CONTRACT_EXPLORER_URL
  };
}
