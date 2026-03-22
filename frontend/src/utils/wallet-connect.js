export async function loadWalletConnect() {
    const StacksConnect = await import('@stacks/connect');
    return StacksConnect;
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
