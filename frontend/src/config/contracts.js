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
export const FN_GET_CURRENT_FEE_BASIS_POINTS = 'get-current-fee-basis-points';
