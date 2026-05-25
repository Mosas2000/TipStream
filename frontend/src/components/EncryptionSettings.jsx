import { useState } from 'react';
import { useEncryption } from '../hooks/useEncryption';
import { useSenderAddress } from '../hooks/useSenderAddress';
import { Lock, RefreshCw, Copy, Check } from 'lucide-react';

export default function EncryptionSettings({ addToast }) {
    const senderAddress = useSenderAddress();
    const { keys, loading, error, regenerateKeys } = useEncryption(senderAddress);
    const [copied, setCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    const handleCopyPublicKey = async () => {
        if (!keys?.publicKey) return;
        
        try {
            await navigator.clipboard.writeText(keys.publicKey);
            setCopied(true);
            addToast('Public key copied to clipboard', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            addToast('Failed to copy public key', 'error');
        }
    };

    const handleRegenerateKeys = async () => {
        if (!confirm('Are you sure you want to regenerate your encryption keys? You will not be able to decrypt old messages.')) {
            return;
        }

        setRegenerating(true);
        try {
            await regenerateKeys();
            addToast('Encryption keys regenerated successfully', 'success');
        } catch (err) {
            addToast('Failed to regenerate keys', 'error');
        } finally {
            setRegenerating(false);
        }
    };

    if (!senderAddress) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <p className="text-gray-500 dark:text-gray-400 text-center">
                        Connect your wallet to manage encryption settings
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-800 p-6">
                    <p className="text-red-500 text-center">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Encryption Settings</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your message encryption keys</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            Your encryption keys are stored locally in your browser. They are used to encrypt and decrypt private tip messages.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Your Public Key
                        </label>
                        <div className="flex gap-2">
                            <div className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 font-mono text-xs break-all text-gray-700 dark:text-gray-300">
                                {keys?.publicKey ? keys.publicKey.slice(0, 100) + '...' : 'No key available'}
                            </div>
                            <button
                                onClick={handleCopyPublicKey}
                                disabled={!keys?.publicKey}
                                className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Copy public key"
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Share this key with others so they can send you encrypted messages
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Private Key Status
                        </label>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${keys?.privateKey ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {keys?.privateKey ? 'Private key is stored securely' : 'No private key available'}
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Your private key never leaves your browser and is used to decrypt messages sent to you
                        </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleRegenerateKeys}
                            disabled={regenerating}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                            {regenerating ? 'Regenerating...' : 'Regenerate Keys'}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Warning: Regenerating keys will prevent you from decrypting old messages
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
