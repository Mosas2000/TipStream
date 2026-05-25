import { useState, useEffect, useCallback } from 'react';
import {
    ensureUserKeys,
    loadKeysFromStorage,
    deleteKeysFromStorage,
    encryptMessage,
    decryptMessage,
    isEncryptedMessage,
} from '../lib/encryption';
import {
    getPublicKeyFromRegistry,
    savePublicKeyToRegistry,
} from '../lib/publicKeyRegistry';

export function useEncryption(userAddress) {
    const [keys, setKeys] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userAddress) {
            setKeys(null);
            setLoading(false);
            return;
        }

        const initKeys = async () => {
            try {
                setLoading(true);
                setError(null);
                const userKeys = await ensureUserKeys(userAddress);
                setKeys(userKeys);
                
                savePublicKeyToRegistry(userAddress, userKeys.publicKey);
            } catch (err) {
                setError(err.message);
                setKeys(null);
            } finally {
                setLoading(false);
            }
        };

        initKeys();
    }, [userAddress]);

    const encrypt = useCallback(async (message, recipientAddress) => {
        if (!message) return message;
        
        const recipientPublicKey = getPublicKeyFromRegistry(recipientAddress);
        if (!recipientPublicKey) {
            throw new Error('Recipient public key not found');
        }

        return await encryptMessage(message, recipientPublicKey);
    }, []);

    const decrypt = useCallback(async (encryptedMessage) => {
        if (!encryptedMessage || !isEncryptedMessage(encryptedMessage)) {
            return encryptedMessage;
        }

        if (!keys?.privateKey) {
            throw new Error('Private key not available');
        }

        return await decryptMessage(encryptedMessage, keys.privateKey);
    }, [keys]);

    const regenerateKeys = useCallback(async () => {
        if (!userAddress) return;

        try {
            setLoading(true);
            setError(null);
            deleteKeysFromStorage(userAddress);
            const newKeys = await ensureUserKeys(userAddress);
            setKeys(newKeys);
            savePublicKeyToRegistry(userAddress, newKeys.publicKey);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userAddress]);

    const canEncryptFor = useCallback((recipientAddress) => {
        return !!getPublicKeyFromRegistry(recipientAddress);
    }, []);

    return {
        keys,
        loading,
        error,
        encrypt,
        decrypt,
        regenerateKeys,
        canEncryptFor,
        isEncrypted: isEncryptedMessage,
    };
}
