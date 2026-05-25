import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    savePublicKeyToRegistry,
    getPublicKeyFromRegistry,
    removePublicKeyFromRegistry,
    getAllPublicKeys,
    clearPublicKeyRegistry,
} from '../lib/publicKeyRegistry';

describe('publicKeyRegistry', () => {
    const testAddress1 = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const testAddress2 = 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE';
    const testPublicKey1 = 'public-key-data-1';
    const testPublicKey2 = 'public-key-data-2';

    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('savePublicKeyToRegistry', () => {
        it('should save public key to registry', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            
            const key = `tipstream_public_key_${testAddress1}`;
            const stored = localStorage.getItem(key);
            expect(stored).toBeDefined();
            
            const parsed = JSON.parse(stored);
            expect(parsed.publicKey).toBe(testPublicKey1);
            expect(parsed.address).toBe(testAddress1);
            expect(parsed.timestamp).toBeDefined();
        });

        it('should overwrite existing key', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            savePublicKeyToRegistry(testAddress1, testPublicKey2);
            
            const retrieved = getPublicKeyFromRegistry(testAddress1);
            expect(retrieved).toBe(testPublicKey2);
        });

        it('should save multiple addresses', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            savePublicKeyToRegistry(testAddress2, testPublicKey2);
            
            expect(getPublicKeyFromRegistry(testAddress1)).toBe(testPublicKey1);
            expect(getPublicKeyFromRegistry(testAddress2)).toBe(testPublicKey2);
        });
    });

    describe('getPublicKeyFromRegistry', () => {
        it('should retrieve saved public key', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            const retrieved = getPublicKeyFromRegistry(testAddress1);
            expect(retrieved).toBe(testPublicKey1);
        });

        it('should return null for non-existent address', () => {
            const retrieved = getPublicKeyFromRegistry(testAddress1);
            expect(retrieved).toBeNull();
        });

        it('should handle corrupted data', () => {
            const key = `tipstream_public_key_${testAddress1}`;
            localStorage.setItem(key, 'invalid-json');
            
            const retrieved = getPublicKeyFromRegistry(testAddress1);
            expect(retrieved).toBeNull();
        });
    });

    describe('removePublicKeyFromRegistry', () => {
        it('should remove public key from registry', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            removePublicKeyFromRegistry(testAddress1);
            
            const retrieved = getPublicKeyFromRegistry(testAddress1);
            expect(retrieved).toBeNull();
        });

        it('should not affect other keys', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            savePublicKeyToRegistry(testAddress2, testPublicKey2);
            
            removePublicKeyFromRegistry(testAddress1);
            
            expect(getPublicKeyFromRegistry(testAddress1)).toBeNull();
            expect(getPublicKeyFromRegistry(testAddress2)).toBe(testPublicKey2);
        });

        it('should handle removing non-existent key', () => {
            expect(() => {
                removePublicKeyFromRegistry(testAddress1);
            }).not.toThrow();
        });
    });

    describe('getAllPublicKeys', () => {
        it('should return empty array when no keys exist', () => {
            const keys = getAllPublicKeys();
            expect(keys).toEqual([]);
        });

        it('should return all saved public keys', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            savePublicKeyToRegistry(testAddress2, testPublicKey2);
            
            const keys = getAllPublicKeys();
            expect(keys.length).toBe(2);
            
            const addresses = keys.map(k => k.address);
            expect(addresses).toContain(testAddress1);
            expect(addresses).toContain(testAddress2);
        });

        it('should include all key data', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            
            const keys = getAllPublicKeys();
            expect(keys[0].publicKey).toBe(testPublicKey1);
            expect(keys[0].address).toBe(testAddress1);
            expect(keys[0].timestamp).toBeDefined();
        });

        it('should skip corrupted entries', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            localStorage.setItem('tipstream_public_key_corrupted', 'invalid-json');
            savePublicKeyToRegistry(testAddress2, testPublicKey2);
            
            const keys = getAllPublicKeys();
            expect(keys.length).toBe(2);
        });

        it('should not include non-registry items', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            localStorage.setItem('other_key', 'other_value');
            
            const keys = getAllPublicKeys();
            expect(keys.length).toBe(1);
        });
    });

    describe('clearPublicKeyRegistry', () => {
        it('should clear all public keys', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            savePublicKeyToRegistry(testAddress2, testPublicKey2);
            
            clearPublicKeyRegistry();
            
            expect(getPublicKeyFromRegistry(testAddress1)).toBeNull();
            expect(getPublicKeyFromRegistry(testAddress2)).toBeNull();
            expect(getAllPublicKeys()).toEqual([]);
        });

        it('should not affect other localStorage items', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            localStorage.setItem('other_key', 'other_value');
            
            clearPublicKeyRegistry();
            
            expect(localStorage.getItem('other_key')).toBe('other_value');
        });

        it('should handle empty registry', () => {
            expect(() => {
                clearPublicKeyRegistry();
            }).not.toThrow();
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete workflow', () => {
            savePublicKeyToRegistry(testAddress1, testPublicKey1);
            
            const retrieved = getPublicKeyFromRegistry(testAddress1);
            expect(retrieved).toBe(testPublicKey1);
            
            const allKeys = getAllPublicKeys();
            expect(allKeys.length).toBe(1);
            
            removePublicKeyFromRegistry(testAddress1);
            expect(getPublicKeyFromRegistry(testAddress1)).toBeNull();
        });

        it('should handle multiple users', () => {
            const addresses = [
                'SP1',
                'SP2',
                'SP3',
            ];
            
            addresses.forEach((addr, i) => {
                savePublicKeyToRegistry(addr, `key-${i}`);
            });
            
            const allKeys = getAllPublicKeys();
            expect(allKeys.length).toBe(3);
            
            addresses.forEach((addr, i) => {
                expect(getPublicKeyFromRegistry(addr)).toBe(`key-${i}`);
            });
        });
    });
});
