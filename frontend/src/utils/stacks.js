import * as StacksConnect from '@stacks/connect';
import { STACKS_MAINNET, STACKS_TESTNET, STACKS_DEVNET } from '@stacks/network';

const { AppConfig, UserSession } = StacksConnect;
const showConnect = StacksConnect.showConnect || StacksConnect.authenticate;

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

const networks = {
    mainnet: STACKS_MAINNET,
    testnet: STACKS_TESTNET,
    devnet: STACKS_DEVNET,
};

const networkName = import.meta.env.VITE_NETWORK || 'mainnet';
export const network = networks[networkName] || STACKS_MAINNET;

export const appDetails = {
    name: 'TipStream',
    icon: window.location.origin + '/logo.svg',
};

export function isWalletInstalled() {
    return !!(window.StacksProvider || window.LeatherProvider);
}

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

export function getUserData() {
    return userSession.loadUserData();
}

export function disconnect() {
    StacksConnect.disconnect();
}
