import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { STACKS_MAINNET } from '@stacks/network';

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

export const network = STACKS_MAINNET;

export const appDetails = {
    name: 'TipStream',
    icon: window.location.origin + '/logo.png',
};

export function authenticate() {
    showConnect({
        appDetails,
        redirectTo: '/',
        onFinish: () => {
            window.location.reload();
        },
        userSession,
    });
}

export function getUserData() {
    return userSession.loadUserData();
}

export function disconnect() {
    userSession.signUserOut('/');
}
