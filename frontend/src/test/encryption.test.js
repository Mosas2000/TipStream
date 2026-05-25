import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    generateKeyPair,
    exportPublicKey,
    exportPrivateKey,
    importPublicKey,
    importPrivateKey,
    encryptMessage,
    decryptMessage,
    isEncryptedMessage,
    stripEncryptionPrefix,
    saveKeysToStorage,
    loadKeysFromStorage,
    deleteKeysFromStorage,
    ensureUserKeys,
} from '../lib/encryption';

describe('encryption', () => {
    const testAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('key generation', () => {
        it('should generate a key pair', async () => {
            const keyPair = await generateKeyPair();
            expect(keyPair).toBeDefined();
            expect(keyPair.publicKey).toBeDefined();
            expect(keyPair.privateKey).toBeDefined();
        });

        it('should export public key as base64', async () => {
            const keyPair = await generateKeyPair();
            const exported = await exportPublicKey(keyPair.publicKey);
            expect(typeof exported).toBe('string');
            expect(exported.length).toBeGreaterThan(0);
        });

        it('should export private key as base64', async () => {
            const keyPair = await generateKeyPair();
            const exported = await exportPrivateKey(keyPair.privateKey);
            expect(typeof exported).toBe('string');
            expect(exported.length).toBeGreaterThan(0);
        });

        it('should import public key from base64', async () => {
            const keyPair = await generateKeyPair();
            const exported = await exportPublicKey(keyPair.publicKey);
            const imported = await importPublicKey(exported);
            expect(imported).toBeDefined();
        });

        it('should import private key from base64', async () => {
            const keyPair = await generateKeyPair();
            const exported = await exportPrivateKey(keyPair.privateKey);
            const imported = await importPrivateKey(exported);
            expect(imported).toBeDefined();
        });
    });

    describe('encryption and decryption', () => {
        it('should encrypt a message', async () => {
            const keyPair = await generateKeyPair();
            const publicKey = await exportPublicKey(keyPair.publicKey);
            const message = 'Hello, World!';
            
            const encrypted = await encryptMessage(message, publicKey);
            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(message);
            expect(encrypted.startsWith('ENC:')).toBe(true);
        });

        it('should decrypt an encrypted message', async () => {
            const keyPair = await generateKeyPair();
            const publicKey = await exportPublicKey(keyPair.publicKey);
            const privateKey = await exportPrivateKey(keyPair.privateKey);
            const message = 'Hello, World!';
            
            const encrypted = await encryptMessage(message, publicKey);
            const decrypted = await decryptMessage(encrypted, privateKey);
            
            expect(decrypted).toBe(message);
        }, 10000);

        it('should handle special characters', async () => {
            const keyPair = await generateKeyPair();
            const publicKey = await exportPublicKey(keyPair.publicKey);
            const privateKey = await exportPrivateKey(keyPair.privateKey);
            const message = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
            
            const encrypted = await encryptMessage(message, publicKey);
            const decrypted = await decryptMessage(encrypted, privateKey);
            
            expect(decrypted).toBe(message);
        });

        it('should handle unicode characters', async () => {
            const keyPair = await generateKeyPair();
            const publicKey = await exportPublicKey(keyPair.publicKey);
            const privateKey = await exportPrivateKey(keyPair.privateKey);
            const message = 'Unicode: 你好世界 🌍 مرحبا';
            
            const encrypted = await encryptMessage(message, publicKey);
            const decrypted = await decryptMessage(encrypted, privateKey);
            
            expect(decrypted).toBe(message);
        });

        it('should handle long messages', async () => {
            const keyPair = await generateKeyPair();
            const publicKey = await exportPublicKey(keyPair.publicKey);
            const privateKey = await exportPrivateKey(keyPair.privateKey);
            const message = 'A'.repeat(100);
            
            const encrypted = await encryptMessage(message, publicKey);
            const decrypted = await decryptMessage(encrypted, privateKey);
            
            expect(decrypted).toBe(message);
        });

        it('should throw error when encrypting without public key', async () => {
            await expect(encryptMessage('test', '')).rejects.toThrow();
        });

        it('should throw error when decrypting without private key', async () => {
            await expect(decryptMessage('ENC:test', '')).rejects.toThrow();
        });

        it('should return unencrypted message if not encrypted', async () => {
            const keyPair = await generateKeyPair();
            const privateKey = await exportPrivateKey(keyPair.privateKey);
            const message = 'Plain text';
            
            const result = await decryptMessage(message, privateKey);
            expect(result).toBe(message);
        });
    });

    describe('encryption detection', () => {
        it('should detect encrypted messages', () => {
            expect(isEncryptedMessage('ENC:abc123')).toBe(true);
        });

        it('should not detect unencrypted messages', () => {
            expect(isEncryptedMessage('Hello')).toBe(false);
            expect(isEncryptedMessage('')).toBe(false);
            expect(isEncryptedMessage(null)).toBe(false);
        });

        it('should strip encryption prefix', () => {
            expect(stripEncryptionPrefix('ENC:abc123')).toBe('abc123');
            expect(stripEncryptionPrefix('Hello')).toBe('Hello');
        });
    });

    describe('key storage', () => {
        it('should save keys to localStorage', () => {
            const publicKey = 'public-key-data';
            const privateKey = 'private-key-data';
            
            saveKeysToStorage(testAddress, publicKey, privateKey);
            
            const stored = localStorage.getItem(`tipstream_keys_${testAddress}`);
            expect(stored).toBeDefined();
            
            const parsed = JSON.parse(stored);
            expect(parsed.publicKey).toBe(publicKey);
            expect(parsed.privateKey).toBe(privateKey);
            expect(parsed.createdAt).toBeDefined();
        });

        it('should load keys from localStorage', () => {
            const publicKey = 'public-key-data';
            const privateKey = 'private-key-data';
            
            saveKeysToStorage(testAddress, publicKey, privateKey);
            const loaded = loadKeysFromStorage(testAddress);
            
            expect(loaded).toBeDefined();
            expect(loaded.publicKey).toBe(publicKey);
            expect(loaded.privateKey).toBe(privateKey);
        });

        it('should return null when no keys exist', () => {
            const loaded = loadKeysFromStorage(testAddress);
            expect(loaded).toBeNull();
        });

        it('should delete keys from localStorage', () => {
            const publicKey = 'public-key-data';
            const privateKey = 'private-key-data';
            
            saveKeysToStorage(testAddress, publicKey, privateKey);
            deleteKeysFromStorage(testAddress);
            
            const loaded = loadKeysFromStorage(testAddress);
            expect(loaded).toBeNull();
        });

        it('should handle corrupted storage data', () => {
            localStorage.setItem(`tipstream_keys_${testAddress}`, 'invalid-json');
            const loaded = loadKeysFromStorage(testAddress);
            expect(loaded).toBeNull();
        });
    });

    describe('ensureUserKeys', () => {
        it('should generate keys if none exist', async () => {
            const keys = await ensureUserKeys(testAddress);
            
            expect(keys).toBeDefined();
            expect(keys.publicKey).toBeDefined();
            expect(keys.privateKey).toBeDefined();
            
            const stored = loadKeysFromStorage(testAddress);
            expect(stored).toBeDefined();
            expect(stored.publicKey).toBe(keys.publicKey);
        });

        it('should return existing keys if they exist', async () => {
            const firstKeys = await ensureUserKeys(testAddress);
            const secondKeys = await ensureUserKeys(testAddress);
            
            expect(secondKeys.publicKey).toBe(firstKeys.publicKey);
            expect(secondKeys.privateKey).toBe(firstKeys.privateKey);
        });

        it('should save keys to storage when generating', async () => {
            await ensureUserKeys(testAddress);
            
            const stored = loadKeysFromStorage(testAddress);
            expect(stored).toBeDefined();
            expect(stored.publicKey).toBeDefined();
            expect(stored.privateKey).toBeDefined();
        });
    });

    describe('end-to-end encryption flow', () => {
        it('should complete full encryption flow', async () => {
            const senderKeys = await ensureUserKeys('sender-address');
            const recipientKeys = await ensureUserKeys('recipient-address');
            
            const message = 'Secret message';
            const encrypted = await encryptMessage(message, recipientKeys.publicKey);
            const decrypted = await decryptMessage(encrypted, recipientKeys.privateKey);
            
            expect(decrypted).toBe(message);
        }, 15000);

        it('should fail to decrypt with wrong key', async () => {
            const senderKeys = await ensureUserKeys('sender-address');
            const recipientKeys = await ensureUserKeys('recipient-address');
            const wrongKeys = await ensureUserKeys('wrong-address');
            
            const message = 'Secret message';
            const encrypted = await encryptMessage(message, recipientKeys.publicKey);
            
            await expect(
                decryptMessage(encrypted, wrongKeys.privateKey)
            ).rejects.toThrow();
        }, 20000);
    });
});
