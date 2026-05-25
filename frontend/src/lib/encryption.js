const ENCRYPTION_PREFIX = 'ENC:';
const ALGORITHM = 'RSA-OAEP';
const HASH = 'SHA-256';
const KEY_SIZE = 2048;

export function isEncryptedMessage(message) {
    return typeof message === 'string' && message.startsWith(ENCRYPTION_PREFIX);
}

export function stripEncryptionPrefix(message) {
    if (isEncryptedMessage(message)) {
        return message.slice(ENCRYPTION_PREFIX.length);
    }
    return message;
}

export async function generateKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: ALGORITHM,
            modulusLength: KEY_SIZE,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: HASH,
        },
        true,
        ['encrypt', 'decrypt']
    );
    return keyPair;
}

export async function exportPublicKey(publicKey) {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    return exportedAsBase64;
}

export async function exportPrivateKey(privateKey) {
    const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
    const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    return exportedAsBase64;
}

export async function importPublicKey(base64Key) {
    const binaryString = atob(base64Key);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const publicKey = await crypto.subtle.importKey(
        'spki',
        bytes,
        {
            name: ALGORITHM,
            hash: HASH,
        },
        true,
        ['encrypt']
    );
    return publicKey;
}

export async function importPrivateKey(base64Key) {
    const binaryString = atob(base64Key);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        bytes,
        {
            name: ALGORITHM,
            hash: HASH,
        },
        true,
        ['decrypt']
    );
    return privateKey;
}

export async function encryptMessage(message, publicKeyBase64) {
    if (!message || !publicKeyBase64) {
        throw new Error('Message and public key are required');
    }

    const publicKey = await importPublicKey(publicKeyBase64);
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    const encrypted = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
        },
        publicKey,
        data
    );
    
    const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    return ENCRYPTION_PREFIX + encryptedBase64;
}

export async function decryptMessage(encryptedMessage, privateKeyBase64) {
    if (!encryptedMessage || !privateKeyBase64) {
        throw new Error('Encrypted message and private key are required');
    }

    if (!isEncryptedMessage(encryptedMessage)) {
        return encryptedMessage;
    }

    const encryptedData = stripEncryptionPrefix(encryptedMessage);
    const privateKey = await importPrivateKey(privateKeyBase64);
    
    const binaryString = atob(encryptedData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const decrypted = await crypto.subtle.decrypt(
        {
            name: ALGORITHM,
        },
        privateKey,
        bytes
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

export function getStorageKey(address) {
    return `tipstream_keys_${address}`;
}

export function saveKeysToStorage(address, publicKey, privateKey) {
    const storageKey = getStorageKey(address);
    const keys = {
        publicKey,
        privateKey,
        createdAt: Date.now(),
    };
    localStorage.setItem(storageKey, JSON.stringify(keys));
}

export function loadKeysFromStorage(address) {
    const storageKey = getStorageKey(address);
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    
    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

export function deleteKeysFromStorage(address) {
    const storageKey = getStorageKey(address);
    localStorage.removeItem(storageKey);
}

export async function ensureUserKeys(address) {
    let keys = loadKeysFromStorage(address);
    
    if (!keys) {
        const keyPair = await generateKeyPair();
        const publicKey = await exportPublicKey(keyPair.publicKey);
        const privateKey = await exportPrivateKey(keyPair.privateKey);
        saveKeysToStorage(address, publicKey, privateKey);
        keys = { publicKey, privateKey };
    }
    
    return keys;
}
