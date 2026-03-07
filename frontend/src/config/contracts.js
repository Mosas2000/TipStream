// Central contract configuration
// All components should import from here instead of hardcoding addresses.

export const CONTRACT_ADDRESS = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
export const CONTRACT_NAME = 'tipstream';

const NETWORK = import.meta.env.VITE_NETWORK || 'mainnet';
export const NETWORK_NAME = NETWORK;
export const STACKS_API_BASE = NETWORK === 'mainnet'
    ? 'https://api.hiro.so'
    : NETWORK === 'testnet'
        ? 'https://api.testnet.hiro.so'
        : 'http://localhost:3999';

export const APP_URL = import.meta.env.VITE_APP_URL || 'https://tipstream-silk.vercel.app';
