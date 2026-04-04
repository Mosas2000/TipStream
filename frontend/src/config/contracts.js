// Central contract configuration
// All components should import from here instead of hardcoding addresses.

import { 
  validateNetwork
} from './validation.js';

export const CONTRACT_ADDRESS = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
export const CONTRACT_NAME = 'tipstream';

const NETWORK = import.meta.env.VITE_NETWORK || 'mainnet';
export const NETWORK_NAME = validateNetwork(NETWORK);
export const STACKS_API_BASE = NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : NETWORK === 'testnet'
        ? 'https://api.testnet.hiro.so'
        : 'http://localhost:3999';

export const APP_URL = import.meta.env.VITE_APP_URL || 'https://tipstream-silk.vercel.app';

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
