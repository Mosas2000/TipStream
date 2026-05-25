import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEncryption } from '../hooks/useEncryption';
import * as encryption from '../lib/encryption';
import * as publicKeyRegistry from '../lib/publicKeyRegistry';

vi.mock('../lib/encryption');
vi.mock('../lib/publicKeyRegistry');

describe('useEncryption', () => {
    const testAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const recipientAddress = 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE';
    const mockKeys = {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        
        encryption.ensureUserKeys.mockResolvedValue(mockKeys);
        encryption.loadKeysFromStorage.mockReturnValue(mockKeys);
        encryption.deleteKeysFromStorage.mockImplementation(() => {});
        encryption.encryptMessage.mockResolvedValue('ENC:encrypted');
        encryption.decryptMessage.mockResolvedValue('decrypted');
        encryption.isEncryptedMessage.mockImplementation(msg => msg?.startsWith('ENC:'));
        
        publicKeyRegistry.savePublicKeyToRegistry.mockImplementation(() => {});
        publicKeyRegistry.getPublicKeyFromRegistry.mockReturnValue('recipient-public-key');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('initialization', () => {
        it('should initialize with loading state', () => {
            const { result } = renderHook(() => useEncryption(testAddress));
            expect(result.current.loading).toBe(true);
        });

        it('should load keys for user address', async () => {
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            expect(encryption.ensureUserKeys).toHaveBeenCalledWith(testAddress);
            expect(result.current.keys).toEqual(mockKeys);
        });

        it('should save public key to registry', async () => {
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            expect(publicKeyRegistry.savePublicKeyToRegistry).toHaveBeenCalledWith(
                testAddress,
                mockKeys.publicKey
            );
        });

        it('should handle no user address', async () => {
            const { result } = renderHook(() => useEncryption(null));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            expect(result.current.keys).toBeNull();
            expect(encryption.ensureUserKeys).not.toHaveBeenCalled();
        });

        it('should handle initialization error', async () => {
            encryption.ensureUserKeys.mockRejectedValue(new Error('Init failed'));
            
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            expect(result.current.error).toBe('Init failed');
            expect(result.current.keys).toBeNull();
        });
    });

    describe('encrypt', () => {
        it('should encrypt message for recipient', async () => {
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            const encrypted = await result.current.encrypt('test message', recipientAddress);
            
            expect(encryption.encryptMessage).toHaveBeenCalledWith(
                'test message',
                'recipient-public-key'
            );
            expect(encrypted).toBe('ENC:encrypted');
        });

        it('should return message if empty', async () => {
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            const encrypted = await result.current.encrypt('', recipientAddress);
            expect(encrypted).toBe('');
            expect(encryption.encryptMessage).not.toHaveBeenCalled();
        });

        it('should throw error if recipient key not found', async () => {
            publicKeyRegistry.getPublicKeyFromRegistry.mockReturnValue(null);
            
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            await expect(
                result.current.encrypt('test', recipientAddress)
            ).rejects.toThrow('Recipient public key not found');
        });
    });

    describe('decrypt', () => {
        it('should decrypt encrypted message', async () => {
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            const decrypted = await result.current.decrypt('ENC:encrypted');
            
            expect(encryption.decryptMessage).toHaveBeenCalledWith(
                'ENC:encrypted',
                mockKeys.privateKey
            );
            expect(decrypted).toBe('decrypted');
        });

        it('should return unencrypted message as is', async () => {
            encryption.isEncryptedMessage.mockReturnValue(false);
            
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            const result2 = await result.current.decrypt('plain text');
            expect(result2).toBe('plain text');
            expect(encryption.decryptMessage).not.toHaveBeenCalled();
        });

        it('should throw error if private key not available', async () => {
            encryption.ensureUserKeys.mockResolvedValue({ publicKey: 'pub' });
            
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            await expect(
                result.current.decrypt('ENC:encrypted')
            ).rejects.toThrow('Private key not available');
        });
    });

    describe('regenerateKeys', () => {
        it('should regenerate keys', async () => {
            const newKeys = {
                publicKey: 'new-public-key',
                privateKey: 'new-private-key',
            };
            
            encryption.ensureUserKeys
                .mockResolvedValueOnce(mockKeys)
                .mockResolvedValueOnce(newKeys);
            
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            await result.current.regenerateKeys();
            
            await waitFor(() => {
                expect(result.current.keys).toEqual(newKeys);
            });
            
            expect(encryption.deleteKeysFromStorage).toHaveBeenCalledWith(testAddress);
            expect(publicKeyRegistry.savePublicKeyToRegistry).toHaveBeenCalledWith(
                testAddress,
                newKeys.publicKey
            );
        });

        it('should handle regeneration error', async () => {
            encryption.ensureUserKeys
                .mockResolvedValueOnce(mockKeys)
                .mockRejectedValueOnce(new Error('Regeneration failed'));
            
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            await result.current.regenerateKeys();
            
            await waitFor(() => {
                expect(result.current.error).toBe('Regeneration failed');
            });
        });

        it('should not regenerate if no address', async () => {
            const { result } = renderHook(() => useEncryption(null));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            await result.current.regenerateKeys();
            
            expect(encryption.deleteKeysFromStorage).not.toHaveBeenCalled();
        });
    });

    describe('canEncryptFor', () => {
        it('should return true if recipient key exists', async () => {
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            const canEncrypt = result.current.canEncryptFor(recipientAddress);
            expect(canEncrypt).toBe(true);
        });

        it('should return false if recipient key does not exist', async () => {
            publicKeyRegistry.getPublicKeyFromRegistry.mockReturnValue(null);
            
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            const canEncrypt = result.current.canEncryptFor(recipientAddress);
            expect(canEncrypt).toBe(false);
        });
    });

    describe('isEncrypted', () => {
        it('should check if message is encrypted', async () => {
            const { result } = renderHook(() => useEncryption(testAddress));
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            result.current.isEncrypted('ENC:test');
            expect(encryption.isEncryptedMessage).toHaveBeenCalledWith('ENC:test');
        });
    });

    describe('address changes', () => {
        it('should reload keys when address changes', async () => {
            const { result, rerender } = renderHook(
                ({ address }) => useEncryption(address),
                { initialProps: { address: testAddress } }
            );
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            expect(encryption.ensureUserKeys).toHaveBeenCalledTimes(1);
            
            const newAddress = 'SP_NEW_ADDRESS';
            rerender({ address: newAddress });
            
            await waitFor(() => {
                expect(encryption.ensureUserKeys).toHaveBeenCalledWith(newAddress);
            });
        });

        it('should clear keys when address becomes null', async () => {
            const { result, rerender } = renderHook(
                ({ address }) => useEncryption(address),
                { initialProps: { address: testAddress } }
            );
            
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
            
            rerender({ address: null });
            
            await waitFor(() => {
                expect(result.current.keys).toBeNull();
            });
        });
    });
});
