const REGISTRY_KEY_PREFIX = 'tipstream_public_key_';

export function getPublicKeyStorageKey(address) {
    return `${REGISTRY_KEY_PREFIX}${address}`;
}

export function savePublicKeyToRegistry(address, publicKey) {
    const key = getPublicKeyStorageKey(address);
    const data = {
        publicKey,
        address,
        timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
}

export function getPublicKeyFromRegistry(address) {
    const key = getPublicKeyStorageKey(address);
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    try {
        const data = JSON.parse(stored);
        return data.publicKey;
    } catch {
        return null;
    }
}

export function removePublicKeyFromRegistry(address) {
    const key = getPublicKeyStorageKey(address);
    localStorage.removeItem(key);
}

export function getAllPublicKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(REGISTRY_KEY_PREFIX)) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                keys.push(data);
            } catch {
                continue;
            }
        }
    }
    return keys;
}

export function clearPublicKeyRegistry() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(REGISTRY_KEY_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
}
