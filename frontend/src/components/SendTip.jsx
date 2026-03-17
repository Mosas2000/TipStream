import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { openContractCall } from '@stacks/connect';
import {
    stringUtf8CV,
    uintCV,
    principalCV,
} from '@stacks/transactions';
import { network, appDetails, getSenderAddress } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_SEND_CATEGORIZED_TIP } from '../config/contracts';
import { toMicroSTX, formatSTX } from '../lib/utils';
import { microToStx, formatBalance, hasSufficientMicroStx } from '../lib/balance-utils';
import { isContractPrincipal, isValidStacksPrincipal } from '../lib/stacks-principal';
import { tipPostCondition, maxTransferForTip, feeForTip, totalDeduction, recipientReceives, SAFE_POST_CONDITION_MODE, FEE_PERCENT } from '../lib/post-conditions';
import { useTipContext } from '../context/TipContext';
import { useBalance } from '../hooks/useBalance';
import { useBlockCheck } from '../hooks/useBlockCheck';
import { useStxPrice } from '../hooks/useStxPrice';
import { analytics } from '../lib/analytics';
import ConfirmDialog from './ui/confirm-dialog';
import TxStatus from './ui/tx-status';

const MIN_TIP_STX = 0.001; // minimum tip in STX
const MAX_TIP_STX = 10000; // maximum tip in STX
const COOLDOWN_SECONDS = 10; // seconds between allowed tips

const TIP_CATEGORIES = [
    { id: 0, label: 'General' },
    { id: 1, label: 'Content Creation' },
    { id: 2, label: 'Open Source' },
    { id: 3, label: 'Community Help' },
    { id: 4, label: 'Appreciation' },
    { id: 5, label: 'Education' },
    { id: 6, label: 'Bug Bounty' },
];

/**
 * SendTip -- form for sending an STX micro-tip to a Stacks address.
 *
 * Handles validation, fee preview, post-condition construction, and
 * wallet interaction via @stacks/connect.  Once a transaction is
 * broadcast the component renders a TxStatus poller to track the
 * on-chain result.
 *
 * @param {Object}   props
 * @param {Function} props.addToast - Callback to display a toast notification.
 */
export default function SendTip({ addToast }) {
    const { notifyTipSent } = useTipContext();
    const { toUsd } = useStxPrice();
    const { blocked: blockedWarning, checkBlocked, reset: resetBlockCheck } = useBlockCheck();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingTx, setPendingTx] = useState(null);
    const [recipientError, setRecipientError] = useState('');
    const [recipientWarning, setRecipientWarning] = useState('');
    const [amountError, setAmountError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const cooldownRef = useRef(null);

    const senderAddress = useMemo(() => getSenderAddress(), []);

    const { balance, balanceStx: balanceSTX, loading: balanceLoading, refetch: refetchBalance } = useBalance(senderAddress);

    useEffect(() => {
        return () => {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        };
    }, []);

    const startCooldown = useCallback(() => {
        setCooldown(COOLDOWN_SECONDS);
        cooldownRef.current = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(cooldownRef.current);
                    cooldownRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const handleRecipientChange = (value) => {
        setRecipient(value);
        resetBlockCheck();
        setRecipientWarning('');

        if (value && !isValidStacksPrincipal(value)) {
            setRecipientError('Enter a valid Stacks principal (SP... or SP....contract-name)');
        } else {
            setRecipientError('');
            if (value && isContractPrincipal(value)) {
                setRecipientWarning('Warning: This appears to be a contract address. Tips to contracts may be unrecoverable.');
                return;
            }
            if (value) {
                checkBlocked(value);
            }
        }
    };

    const handleAmountChange = (value) => {
        setAmount(value);
        if (!value) { setAmountError(''); return; }
        const parsed = parseFloat(value);
        if (isNaN(parsed) || parsed <= 0) {
            setAmountError('Amount must be a positive number');
        } else if (parsed < MIN_TIP_STX) {
            setAmountError(`Minimum tip is ${MIN_TIP_STX} STX`);
        } else if (parsed > MAX_TIP_STX) {
            setAmountError(`Maximum tip is ${MAX_TIP_STX.toLocaleString()} STX`);
        } else if (balanceSTX !== null) {
            // Account for the platform fee when checking balance
            const microSTX = toMicroSTX(parsed.toString());
            if (!hasSufficientMicroStx(balance, totalDeduction(microSTX))) {
                setAmountError('Insufficient balance (tip + 0.5% fee exceeds balance)');
            } else {
                setAmountError('');
            }
        } else {
            setAmountError('');
        }
    };

    const validateAndConfirm = () => {
        if (cooldown > 0) { addToast(`Please wait ${cooldown}s before sending another tip`, 'warning'); return; }
        if (!recipient || !amount) { addToast('Please fill in all required fields', 'warning'); return; }
        if (!isValidStacksPrincipal(recipient)) { addToast('Invalid Stacks principal format', 'warning'); return; }
        if (recipient.trim() === senderAddress) { addToast('You cannot send a tip to yourself', 'warning'); return; }
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) { addToast('Please enter a valid amount', 'warning'); return; }
        if (parsedAmount < MIN_TIP_STX) { addToast(`Minimum tip is ${MIN_TIP_STX} STX`, 'warning'); return; }
        if (parsedAmount > MAX_TIP_STX) { addToast(`Maximum tip is ${MAX_TIP_STX.toLocaleString()} STX`, 'warning'); return; }
        if (balanceSTX !== null) {
            const microSTX = toMicroSTX(amount);
            if (microToStx(totalDeduction(microSTX)) > balanceSTX) {
                addToast('Insufficient balance to cover tip plus platform fee', 'warning');
                return;
            }
        }
        setShowConfirm(true);
        analytics.trackTipStarted();
    };

    const handleSendTip = async () => {
        setShowConfirm(false);
        analytics.trackTipSubmitted();
        setLoading(true);

        try {
            const microSTX = toMicroSTX(amount);
            const postConditions = [
                tipPostCondition(senderAddress, microSTX)
            ];

            const functionArgs = [
                principalCV(recipient.trim()),
                uintCV(microSTX),
                stringUtf8CV(message || 'Thanks!'),
                uintCV(category)
            ];

            await openContractCall({
                network,
                appDetails,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: FN_SEND_CATEGORIZED_TIP,
                functionArgs,
                postConditions,
                postConditionMode: SAFE_POST_CONDITION_MODE,
                onFinish: (data) => {
                    setLoading(false);
                    setPendingTx({ txId: data.txId, recipient, amount: parseFloat(amount) });
                    setRecipient('');
                    setAmount('');
                    setMessage('');
                    setCategory(0);
                    notifyTipSent();
                    startCooldown();
                    analytics.trackTipConfirmed();
                    addToast('Tip sent! Tx: ' + data.txId, 'success');
                },
                onCancel: () => {
                    setLoading(false);
                    analytics.trackTipCancelled();
                    addToast('Transaction cancelled.', 'info');
                }
            });
        } catch (error) {
            const msg = error.message || String(error);
            console.error('Failed to send tip:', msg);
            analytics.trackTipFailed();

            // Provide a more specific message for post-condition failures
            if (msg.toLowerCase().includes('post-condition') || msg.toLowerCase().includes('postcondition')) {
                addToast('Transaction rejected by post-condition check. Your funds are safe.', 'error');
            } else {
                addToast('Failed to send tip. Please try again.', 'error');
            }
            setLoading(false);
        }
    };

    /** Called by TxStatus when the transaction reaches 'success' status. */
    const handleTxConfirmed = useCallback(() => {
        refetchBalance();
        addToast('Tip confirmed on-chain!', 'success');
    }, [addToast, refetchBalance]);

    /** Called by TxStatus when the transaction is aborted on-chain. */
    const handleTxFailed = useCallback((reason) => {
        refetchBalance();
        addToast(`Transaction failed: ${reason}`, 'error');
    }, [addToast, refetchBalance]);

    return (
        <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Send a Tip</h2>

                {/* Balance */}
                {senderAddress && (
                    <div data-testid="balance-section" className="mb-5 flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Your Balance</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {balanceLoading ? 'Loading...' : balanceSTX !== null
                                    ? formatBalance(balance)
                                    : 'Unavailable'}
                            </p>
                            {pendingTx && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Pending confirmation
                                </p>
                            )}
                        </div>
                        <button onClick={refetchBalance} disabled={balanceLoading}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50" title="Refresh balance" aria-label="Refresh balance">
                            <svg className={`w-4 h-4 ${balanceLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Recipient */}
                    <div>
                        <label htmlFor="tip-recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Recipient Address</label>
                        <input id="tip-recipient" type="text" value={recipient} onChange={(e) => handleRecipientChange(e.target.value)}
                            aria-describedby={recipientError ? "tip-recipient-error" : undefined}
                            className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all bg-white dark:bg-gray-800 dark:text-white ${recipientError ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'}`}
                            placeholder="SP2..." />
                        {recipientError && <p id="tip-recipient-error" className="mt-1 text-xs text-red-500" role="alert">{recipientError}</p>}
                        {recipientWarning && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400" role="status">{recipientWarning}</p>}
                        {blockedWarning && (
                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                This recipient has blocked you. The transaction will likely fail on-chain.
                            </p>
                        )}
                    </div>

                    {/* Amount */}
                    <div>
                        <label htmlFor="tip-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (STX)</label>
                        <input id="tip-amount" type="number" value={amount} onChange={(e) => handleAmountChange(e.target.value)}
                            aria-describedby={amountError ? "tip-amount-error" : undefined}
                            className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all bg-white dark:bg-gray-800 dark:text-white ${amountError ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'}`}
                            placeholder="0.5" step="0.001" min={MIN_TIP_STX} max={MAX_TIP_STX} />
                        {amountError && <p id="tip-amount-error" className="mt-1 text-xs text-red-500" role="alert">{amountError}</p>}
                    </div>

                    {/* Message */}
                    <div>
                        <label htmlFor="tip-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message (optional)</label>
                        <textarea id="tip-message" value={message} onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all resize-none"
                            placeholder="Great work!" maxLength={280} rows={2} />
                        <p className={`text-xs mt-1 text-right ${message.length >= 280 ? 'text-red-500' : 'text-gray-400'}`}>
                            {message.length}/280
                        </p>
                    </div>

                    {/* Category */}
                    <div>
                        <label htmlFor="tip-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                        <select id="tip-category" value={category} onChange={(e) => setCategory(Number(e.target.value))}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all">
                            {TIP_CATEGORIES.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Breakdown with fee preview and post-condition ceiling */}
                    {amount && parseFloat(amount) > 0 && (
                        <div data-testid="fee-preview" className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-sm">
                            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Fee Preview</p>
                            <div className="space-y-1 text-gray-600 dark:text-gray-400">
                                <div className="flex justify-between">
                                    <span>Tip amount</span>
                                    <span>
                                        {parseFloat(amount).toFixed(6)} STX
                                        {toUsd(amount) && <span className="text-gray-400 ml-1">(~${toUsd(amount)})</span>}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Platform fee ({FEE_PERCENT}%)</span>
                                    <span>{formatSTX(feeForTip(toMicroSTX(amount)), 6)} STX</span>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 flex justify-between font-semibold text-gray-900 dark:text-white">
                                    <span>Total from wallet</span>
                                    <span>
                                        {formatSTX(totalDeduction(toMicroSTX(amount)), 6)} STX
                                    </span>
                                </div>
                                <div className="flex justify-between text-gray-500 dark:text-gray-500">
                                    <span>Recipient receives</span>
                                    <span>
                                        {formatSTX(recipientReceives(toMicroSTX(amount)), 6)} STX
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600 pt-1">
                                    <span>Post-condition ceiling</span>
                                    <span>{formatSTX(maxTransferForTip(toMicroSTX(amount)), 6)} STX</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <button onClick={validateAndConfirm} disabled={loading || cooldown > 0}
                        aria-disabled={loading || cooldown > 0}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </span>
                        ) : cooldown > 0 ? `Wait ${cooldown}s` : 'Send Tip'}
                    </button>
                </div>

                {/* Pending TX */}
                {pendingTx && (
                    <div data-testid="pending-tx" aria-live="polite" className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            Sent {pendingTx.amount} STX to <span className="font-mono text-xs">{pendingTx.recipient.slice(0, 8)}...{pendingTx.recipient.slice(-4)}</span>
                        </p>
                        <TxStatus txId={pendingTx.txId}
                            onConfirmed={handleTxConfirmed}
                            onFailed={handleTxFailed} />
                        <button onClick={() => setPendingTx(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Dismiss</button>
                    </div>
                )}

                <ConfirmDialog open={showConfirm} title="Confirm Tip" onConfirm={handleSendTip} onCancel={() => setShowConfirm(false)} confirmLabel="Send Tip">
                    <div className="space-y-2">
                        <p>Send <strong>{amount} STX</strong> to:</p>
                        <p className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-lg break-all">{recipient}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Category: <strong>{TIP_CATEGORIES.find(c => c.id === category)?.label}</strong></p>
                        {message && <p className="italic text-gray-500">"{message}"</p>}
                        {amount && parseFloat(amount) > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                <div className="flex justify-between">
                                    <span>Platform fee ({FEE_PERCENT}%)</span>
                                    <span>{formatSTX(feeForTip(toMicroSTX(amount)), 6)} STX</span>
                                </div>
                                <div className="flex justify-between font-semibold text-gray-900 dark:text-white">
                                    <span>Total from your wallet</span>
                                    <span>{formatSTX(totalDeduction(toMicroSTX(amount)), 6)} STX</span>
                                </div>
                            </div>
                        )}
                    </div>
                </ConfirmDialog>
            </div>
        </div>
    );
}
