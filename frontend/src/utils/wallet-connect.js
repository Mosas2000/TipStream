/**
 * Dynamic import wrapper for @stacks/connect to prevent heavy wallet
 * dependencies from being included in the initial app shell.
 */
export async function loadWalletConnect() {
    const StacksConnect = await import('@stacks/connect');
    return StacksConnect;
}

export async function createUserSession() {
    const { AppConfig, UserSession } = await loadWalletConnect();
    const appConfig = new AppConfig(['store_write', 'publish_data']);
    return new UserSession({ appConfig });
}

export async function showWalletConnect(options) {
    const StacksConnect = await loadWalletConnect();
    const showConnect = StacksConnect.showConnect || StacksConnect.authenticate;
    return showConnect(options);
}

export async function disconnectWallet() {
    const StacksConnect = await loadWalletConnect();
    return StacksConnect.disconnect();
}
