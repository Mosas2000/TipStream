/**
 * @module utils/stacks
 * @description Stacks wallet integration utilities.
 *
 * Provides session management (connect, disconnect, load user data)
 * and network configuration for the TipStream frontend. The canonical
 * user data shape returned by `authenticate()` and `getUserData()` is
 * `{ profile: { stxAddress: { mainnet, testnet } } }`.
 */

import * as StacksConnect from '@stacks/connect';
import { STACKS_MAINNET, STACKS_TESTNET, STACKS_DEVNET } from '@stacks/network';

const { AppConfig, UserSession } = StacksConnect;
const showConnect = StacksConnect.showConnect || StacksConnect.authenticate;

const appConfig = new AppConfig(['store_write', 'publish_data']);

/** Active user session instance shared across the application. */
export const userSession = new UserSession({ appConfig });

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

    return new Promise((resolve, reject) => {
        showConnect({
            userSession,
            onFinish: () => {
                resolve(userSession.loadUserData());
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

/**
 * Disconnect the active wallet session and clear stored credentials.
 */
export function disconnect() {
    StacksConnect.disconnect();
}
