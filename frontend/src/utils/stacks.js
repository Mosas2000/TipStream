/**
 * @module utils/stacks
 * @description Stacks wallet integration utilities.
 *
 * Provides session management (connect, disconnect, load user data)
 * and network configuration for the TipStream frontend. The canonical
 * user data shape returned by `authenticate()` and `getUserData()` is
 * `{ profile: { stxAddress: { mainnet, testnet } } }`.
 */

import { STACKS_MAINNET, STACKS_TESTNET, STACKS_DEVNET } from '@stacks/network';
import { showWalletConnect, disconnectWallet, createUserSession } from './wallet-connect';
import { getMainnetAddress } from './user-data';

let userSessionInstance = null;

async function ensureUserSession() {
    if (!userSessionInstance) {
        userSessionInstance = await createUserSession();
    }
    return userSessionInstance;
}

export const userSession = {
    isUserSignedIn: () => {
        if (!userSessionInstance) {
            const stored = localStorage.getItem('blockstack-session');
            return stored ? JSON.parse(stored).userData !== undefined : false;
        }
        return userSessionInstance.isUserSignedIn();
    },
    loadUserData: () => {
        if (!userSessionInstance) {
            const stored = localStorage.getItem('blockstack-session');
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.userData;
            }
            return null;
        }
        return userSessionInstance.loadUserData();
    },
};

const networks = {
    mainnet: STACKS_MAINNET,
    testnet: STACKS_TESTNET,
    devnet: STACKS_DEVNET,
};

const networkName = import.meta.env.VITE_NETWORK || 'mainnet';

/** Resolved Stacks network object based on VITE_NETWORK env variable. */
export const network = networks[networkName] || STACKS_MAINNET;

/** App metadata shown in the wallet connection prompt. */
export const appDetails = {
    name: 'TipStream',
    icon: window.location.origin + '/logo.svg',
};

/**
 * Check whether a compatible Stacks wallet extension is installed.
 * @returns {boolean} `true` if Leather or Xverse is detected.
 */
export function isWalletInstalled() {
    return !!(window.StacksProvider || window.LeatherProvider);
}

/**
 * Prompt the user to connect their Stacks wallet.
 *
 * Always resolves with the value of `userSession.loadUserData()`, which
 * has the shape:
 *
 * ```
 * {
 *   profile: {
 *     stxAddress: { mainnet: string, testnet: string }
 *   },
 *   ...
 * }
 * ```
 *
 * @returns {Promise<import('@stacks/connect').UserData>} Normalised user data.
 * @throws {Error} If no wallet extension is installed.
 * @throws {Error} If the user cancels the connection prompt.
 */
export async function authenticate() {
    if (!isWalletInstalled()) {
        throw new Error('No Stacks wallet found. Please install Leather or Xverse.');
    }

    const session = await ensureUserSession();
    
    return new Promise((resolve, reject) => {
        showWalletConnect({
            userSession: session,
            onFinish: () => {
                resolve(session.loadUserData());
            },
            onCancel: () => {
                reject(new Error('User cancelled wallet connection.'));
            },
        });
    });
}

/**
 * Return the currently stored user data from the session.
 *
 * Must only be called after the user has authenticated. Returns the same
 * normalised shape as `authenticate()`.
 *
 * @returns {import('@stacks/connect').UserData} Normalised user data.
 */
export function getUserData() {
    return userSession.loadUserData();
}

// Re-export pure helpers from user-data.js so existing imports still work.
export { getMainnetAddress, getTestnetAddress, isValidUserData, getNetworkAddress } from './user-data';

/**
 * Return the current user's mainnet STX address from the active session.
 *
 * Loads user data from `userSession`, extracts the mainnet address via
 * `getMainnetAddress`, and returns `null` if no session is active or
 * the stored data has an unexpected shape.
 *
 * @returns {string|null} The mainnet STX address, or null.
 */
export function getSenderAddress() {
    try {
        return getMainnetAddress(userSession.loadUserData());
    } catch {
        return null;
    }
}

/**
 * Disconnect the active wallet session and clear stored credentials.
 */
export async function disconnect() {
    await disconnectWallet();
}
