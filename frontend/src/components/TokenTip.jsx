import { useState, useEffect, useCallback } from 'react';
import { openContractCall } from '@stacks/connect';
import {
    fetchCallReadOnlyFunction,
    cvToJSON,
    principalCV,
    uintCV,
    stringUtf8CV,
    contractPrincipalCV,
    PostConditionMode,
    Pc,
    FungibleConditionCode,
} from '@stacks/transactions';
import { network, appDetails } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_IS_TOKEN_WHITELISTED, FN_SEND_TOKEN_TIP } from '../config/contracts';
import { formatAddress } from '../lib/utils';
import { Coins, CheckCircle, XCircle, Loader2, Send, Zap } from 'lucide-react';
import ConfirmDialog from './ui/confirm-dialog';
import { useSenderAddress } from '../hooks/useSenderAddress';
import { useDemoMode } from '../context/DemoContext';

const isValidStacksAddress = (address) => {
    if (!address) return false;
    const trimmed = address.trim();
    if (trimmed.length < 38 || trimmed.length > 41) return false;
    return /^(SP|SM|ST)[0-9A-Z]{33,39}$/i.test(trimmed);
};

const isValidContractId = (id) => {
    if (!id) return false;
    const parts = id.trim().split('.');
    if (parts.length !== 2) return false;
    return isValidStacksAddress(parts[0]) && parts[1].length > 0;
};

const parseContractId = (id) => {
    const parts = id.trim().split('.');
    return { address: parts[0], name: parts[1] };
};

export default function TokenTip({ addToast }) {
    const { demoEnabled, addDemoTip } = useDemoMode();
    const [tokenContract, setTokenContract] = useState('');
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [whitelistStatus, setWhitelistStatus] = useState(null);
    const [checkingWhitelist, setCheckingWhitelist] = useState(false);
    const [sending, setSending] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [tokenError, setTokenError] = useState('');
    const [recipientError, setRecipientError] = useState('');
    const [amountError, setAmountError] = useState('');
    const [hasCheckedWhitelist, setHasCheckedWhitelist] = useState(false);

    const senderAddress = useSenderAddress();

    const validateRecipient = useCallback((value) => {
        if (!value) {
            setRecipientError('');
            return;
        }

        const trimmed = value.trim();
        if (!isValidStacksAddress(trimmed)) {
            setRecipientError('Enter a valid Stacks address (SP... or SM...)');
        } else if (trimmed === senderAddress) {
            setRecipientError('Cannot send a tip to yourself');
        } else {
            setRecipientError('');
        }
    }, [senderAddress]);

    const handleCheckWhitelist = useCallback(async () => {
        const tokenId = tokenContract.trim();
        if (!tokenId) return;

        if (!isValidContractId(tokenId)) {
            setTokenError('Enter a valid contract identifier (e.g. SP2...CONTRACT_NAME)');
            return;
        }

        setCheckingWhitelist(true);
        setWhitelistStatus(null);
        setTokenError('');
        setHasCheckedWhitelist(true);

        if (demoEnabled) {
            await new Promise(r => setTimeout(r, 700));
            // Simulate that any valid contract ID is whitelisted in demo
            setWhitelistStatus(true);
            setCheckingWhitelist(false);
            return;
        }

        try {
            const result = await fetchCallReadOnlyFunction({
                network,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: FN_IS_TOKEN_WHITELISTED,
                functionArgs: [principalCV(tokenId)],
                senderAddress: senderAddress || CONTRACT_ADDRESS,
            });

            const json = cvToJSON(result);
            const isWhitelisted = json.value?.value === true || json.value === true;
            setWhitelistStatus(isWhitelisted);

            if (!isWhitelisted) {
                setTokenError('This token is not whitelisted for tipping');
            }
        } catch (err) {
            console.error('Failed to check whitelist:', err.message || err);
            setTokenError('Failed to check token whitelist status');
        } finally {
            setCheckingWhitelist(false);
        }
    }, [demoEnabled, senderAddress, tokenContract]);

    useEffect(() => {
        validateRecipient(recipient);
    }, [recipient, validateRecipient]);

    useEffect(() => {
        if (!hasCheckedWhitelist) return;

        const tokenId = tokenContract.trim();
        if (!tokenId || !isValidContractId(tokenId)) {
            setWhitelistStatus(null);
            return;
        }

        void handleCheckWhitelist();
    }, [handleCheckWhitelist, hasCheckedWhitelist, tokenContract]);

    const handleRecipientChange = (value) => {
        setRecipient(value);
    };

    const handleAmountChange = (value) => {
        setAmount(value);
        if (!value) {
            setAmountError('');
            return;
        }
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed <= 0) {
            setAmountError('Amount must be a positive integer (token smallest unit)');
        } else {
            setAmountError('');
        }
    };

    const validateForm = () => {
        let valid = true;

        if (!tokenContract.trim() || !isValidContractId(tokenContract.trim())) {
            setTokenError('Valid token contract is required');
            valid = false;
        }
        if (whitelistStatus !== true) {
            setTokenError('Token must be whitelisted');
            valid = false;
        }
        if (!recipient.trim() || !isValidStacksAddress(recipient.trim())) {
            setRecipientError('Valid recipient address is required');
            valid = false;
        }
        if (recipient.trim() === senderAddress) {
            setRecipientError('Cannot send a tip to yourself');
            valid = false;
        }
        const parsedAmount = parseInt(amount, 10);
        if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            setAmountError('Enter a valid token amount');
            valid = false;
        }

        return valid;
    };

    const handleConfirmAndSend = () => {
        if (!validateForm()) return;
        setShowConfirm(true);
    };

    const handleSendTokenTip = async () => {
        setShowConfirm(false);
        setSending(true);

        if (demoEnabled) {
            await new Promise(r => setTimeout(r, 1500));
            
            const mockTxId = `0x${Math.random().toString(16).slice(2, 66)}`;
            
            addDemoTip({
                recipient: recipient.trim(),
                amount: 0, // Mock STX amount is 0 for token tips in history
                message: `${message || 'Token tip'} (Sent ${amount} tokens)`,
                category: 1 // Token tip category
            });

            setSending(false);
            setRecipient('');
            setAmount('');
            setMessage('');
            addToast?.(`Demo token tip sent! Mock Tx: ${mockTxId}`, 'success');
            return;
        }

        try {
            const { address: tokenAddr, name: tokenName } = parseContractId(tokenContract.trim());
            const parsedAmount = parseInt(amount, 10);

            await openContractCall({
                network,
                appDetails,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: FN_SEND_TOKEN_TIP,
                functionArgs: [
                    contractPrincipalCV(tokenAddr, tokenName),
                    principalCV(recipient.trim()),
                    uintCV(parsedAmount),
                    stringUtf8CV(message || 'Token tip via TipStream'),
                ],
                postConditions: [
                    Pc.principal(senderAddress)
                        .willSendLte(parsedAmount)
                        .ft(`${tokenAddr}.${tokenName}`, tokenName),
                ],
                postConditionMode: PostConditionMode.Deny,
                onFinish: (data) => {
                    setSending(false);
                    setRecipient('');
                    setAmount('');
                    setMessage('');
                    addToast?.(
                        `Token tip sent! Tx: ${data.txId}`,
                        'success'
                    );
                },
                onCancel: () => {
                    setSending(false);
                    addToast?.('Token tip cancelled', 'info');
                },
            });
        } catch (err) {
            console.error('Token tip failed:', err.message || err);
            addToast?.('Failed to send token tip. Please try again.', 'error');
            setSending(false);
        }
    };

    return (
        <div className="max-w-md mx-auto">
            {demoEnabled && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                    <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Sandbox Mode:</strong> Token tips are simulated and will not move real assets.
                    </p>
                </div>
            )}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                        <Coins className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Token Tip</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {demoEnabled ? 'Simulated token tipping' : 'Send tips using whitelisted SIP-010 tokens'}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Token contract */}
                    <div>
                        <label htmlFor="token-contract" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Token Contract
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="token-contract"
                                type="text"
                                value={tokenContract}
                                onChange={(e) => {
                                    setTokenContract(e.target.value);
                                    setWhitelistStatus(null);
                                    setTokenError('');
                                    setHasCheckedWhitelist(false);
                                }}
                                className={`flex-1 px-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all ${
                                    tokenError
                                        ? 'border-red-300 dark:border-red-600'
                                        : whitelistStatus === true
                                        ? 'border-green-300 dark:border-green-600'
                                        : 'border-gray-200 dark:border-gray-700'
                                }`}
                                placeholder="SP2...token-contract"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCheckWhitelist();
                                }}
                            />
                            <button
                                onClick={handleCheckWhitelist}
                                disabled={checkingWhitelist || !tokenContract.trim()}
                                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Check whitelist status"
                            >
                                {checkingWhitelist ? (
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    'Check'
                                )}
                            </button>
                        </div>
                        {tokenError && <p className="mt-1 text-xs text-red-500">{tokenError}</p>}
                        {whitelistStatus === true && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                Token is whitelisted
                            </div>
                        )}
                        {whitelistStatus === false && !tokenError && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-500">
                                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                Token is not whitelisted
                            </div>
                        )}
                    </div>

                    {/* Recipient */}
                    <div>
                        <label htmlFor="token-recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Recipient Address
                        </label>
                        <input
                            id="token-recipient"
                            type="text"
                            value={recipient}
                            onChange={(e) => handleRecipientChange(e.target.value)}
                            className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all ${
                                recipientError ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'
                            }`}
                            placeholder="SP2..."
                        />
                        {recipientError && <p className="mt-1 text-xs text-red-500">{recipientError}</p>}
                    </div>

                    {/* Amount */}
                    <div>
                        <label htmlFor="token-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Amount (smallest token unit)
                        </label>
                        <input
                            id="token-amount"
                            type="number"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all ${
                                amountError ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'
                            }`}
                            placeholder="1000000"
                            step="1"
                            min="1"
                        />
                        {amountError && <p className="mt-1 text-xs text-red-500">{amountError}</p>}
                    </div>

                    {/* Message */}
                    <div>
                        <label htmlFor="token-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Message (optional)
                        </label>
                        <textarea
                            id="token-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all resize-none"
                            placeholder="Thanks!"
                            maxLength={280}
                            rows={2}
                        />
                        <p className={`text-xs mt-1 text-right ${message.length >= 280 ? 'text-red-500' : 'text-gray-400'}`}>
                            {message.length}/280
                        </p>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleConfirmAndSend}
                        disabled={sending || whitelistStatus !== true}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" aria-hidden="true" />
                                Send Token Tip
                            </>
                        )}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                open={showConfirm}
                title="Confirm Token Tip"
                onConfirm={handleSendTokenTip}
                onCancel={() => setShowConfirm(false)}
                confirmLabel="Send Token Tip"
            >
                <p>
                    Send <strong>{amount}</strong> tokens from{' '}
                    <strong className="font-mono text-xs">{formatAddress(tokenContract.trim(), 8, 6)}</strong>{' '}
                    to <strong className="font-mono text-xs">{formatAddress(recipient.trim(), 8, 6)}</strong>.
                </p>
            </ConfirmDialog>
        </div>
    );
}

