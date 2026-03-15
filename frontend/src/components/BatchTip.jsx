import { useState, useMemo, useCallback } from 'react';
import { openContractCall } from '@stacks/connect';
import {
    uintCV,
    stringUtf8CV,
    principalCV,
    listCV,
    tupleCV,
    PostConditionMode,
    Pc,
} from '@stacks/transactions';
import { network, appDetails, getSenderAddress } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_SEND_BATCH_TIPS, FN_SEND_BATCH_TIPS_STRICT } from '../config/contracts';
import { toMicroSTX, formatSTX, formatAddress } from '../lib/utils';
import { formatBalance } from '../lib/balance-utils';
import { analytics } from '../lib/analytics';
import { summarizeBatchTipResult, buildBatchTipOutcomeMessage } from '../lib/batchTipResults';
import { useBalance } from '../hooks/useBalance';
import { useTipContext } from '../context/TipContext';
import { Users, Plus, Trash2, Send, Loader2, AlertTriangle } from 'lucide-react';
import ConfirmDialog from './ui/confirm-dialog';
import TxStatus from './ui/tx-status';

const MAX_BATCH_SIZE = 50;
const MIN_TIP_STX = 0.001;

function emptyRecipient() {
    return { address: '', amount: '', message: '' };
}

export default function BatchTip({ addToast }) {
    const { notifyTipSent } = useTipContext();
    const [recipients, setRecipients] = useState([emptyRecipient()]);
    const [strictMode, setStrictMode] = useState(false);
    const [sending, setSending] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState({});
    const [pendingTx, setPendingTx] = useState(null);

    const senderAddress = useMemo(() => getSenderAddress(), []);

    const { balance, balanceStx: balanceSTX, loading: balanceLoading } = useBalance(senderAddress);

    const totalAmount = useMemo(() => {
        return recipients.reduce((sum, r) => {
            const parsed = parseFloat(r.amount);
            return sum + (isNaN(parsed) ? 0 : parsed);
        }, 0);
    }, [recipients]);

    const isValidStacksAddress = (address) => {
        if (!address) return false;
        const trimmed = address.trim();
        if (trimmed.length < 38 || trimmed.length > 41) return false;
        return /^(SP|SM|ST)[0-9A-Z]{33,39}$/i.test(trimmed);
    };

    const updateRecipient = useCallback((index, field, value) => {
        setRecipients((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
        setErrors((prev) => {
            const key = `${index}-${field}`;
            if (prev[key]) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return prev;
        });
    }, []);

    const addRecipient = () => {
        if (recipients.length >= MAX_BATCH_SIZE) {
            addToast?.(`Maximum ${MAX_BATCH_SIZE} recipients per batch`, 'warning');
            return;
        }
        setRecipients((prev) => [...prev, emptyRecipient()]);
    };

    const removeRecipient = (index) => {
        if (recipients.length <= 1) return;
        setRecipients((prev) => prev.filter((_, i) => i !== index));
        setErrors((prev) => {
            const next = {};
            Object.entries(prev).forEach(([key, val]) => {
                const [idx] = key.split('-');
                const num = parseInt(idx);
                if (num < index) next[key] = val;
                else if (num > index) next[`${num - 1}-${key.split('-')[1]}`] = val;
            });
            return next;
        });
    };

    const validate = () => {
        const newErrors = {};
        let valid = true;

        if (recipients.length === 0) {
            addToast?.('Add at least one recipient', 'warning');
            return false;
        }

        recipients.forEach((r, i) => {
            if (!r.address.trim()) {
                newErrors[`${i}-address`] = 'Address is required';
                valid = false;
            } else if (!isValidStacksAddress(r.address.trim())) {
                newErrors[`${i}-address`] = 'Invalid Stacks address';
                valid = false;
            } else if (r.address.trim() === senderAddress) {
                newErrors[`${i}-address`] = 'Cannot tip yourself';
                valid = false;
            }

            const amt = parseFloat(r.amount);
            if (!r.amount || isNaN(amt) || amt <= 0) {
                newErrors[`${i}-amount`] = 'Enter a valid amount';
                valid = false;
            } else if (amt < MIN_TIP_STX) {
                newErrors[`${i}-amount`] = `Min ${MIN_TIP_STX} STX`;
                valid = false;
            }

            if (r.message && r.message.length > 280) {
                newErrors[`${i}-message`] = 'Max 280 characters';
                valid = false;
            }
        });

        // Check for duplicate addresses
        const seen = new Set();
        recipients.forEach((r, i) => {
            const addr = r.address.trim();
            if (addr && seen.has(addr)) {
                newErrors[`${i}-address`] = 'Duplicate address';
                valid = false;
            }
            if (addr) seen.add(addr);
        });

        if (valid && balanceSTX !== null && totalAmount > balanceSTX) {
            addToast?.('Insufficient balance for this batch', 'warning');
            return false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleConfirmAndSend = () => {
        if (!validate()) return;
        analytics.trackBatchTipStarted();
        setShowConfirm(true);
    };

    const handleSendBatch = async () => {
        setShowConfirm(false);
        analytics.trackBatchTipSubmitted();
        analytics.trackBatchSize(recipients.length);

        setSending(true);
        try {
            const tipsList = recipients.map((r) =>
                tupleCV({
                    recipient: principalCV(r.address.trim()),
                    amount: uintCV(toMicroSTX(r.amount)),
                    message: stringUtf8CV(r.message || 'Batch tip via TipStream'),
                })
            );

            const totalMicro = recipients.reduce(
                (sum, r) => sum + toMicroSTX(r.amount),
                0
            );

            await openContractCall({
                network,
                appDetails,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: strictMode ? FN_SEND_BATCH_TIPS_STRICT : FN_SEND_BATCH_TIPS,
                functionArgs: [listCV(tipsList)],
                postConditions: [
                    Pc.principal(senderAddress).willSendLte(totalMicro).ustx(),
                ],
                postConditionMode: PostConditionMode.Deny,
                onFinish: (data) => {
                    setSending(false);
                    setPendingTx({ txId: data.txId, totalRecipients: recipients.length, strictMode });
                    setRecipients([emptyRecipient()]);
                    setErrors({});
                    addToast?.(
                        `Batch transaction submitted. Waiting for confirmation... Tx: ${data.txId}`,
                        'info'
                    );
                },
                onCancel: () => {
                    setSending(false);
                    analytics.trackBatchTipCancelled();
                    addToast?.('Batch tip cancelled', 'info');
                },
            });
        } catch (err) {
            console.error('Batch tip failed:', err.message || err);
            analytics.trackBatchTipFailed();
            addToast?.('Failed to send batch tips. Please try again.', 'error');
            setSending(false);
        }
    };

    const handleBatchTxConfirmed = useCallback((txData) => {
        analytics.trackBatchTipConfirmed();
        notifyTipSent();

        const summary = summarizeBatchTipResult(txData, pendingTx?.totalRecipients ?? 0);
        const toastType = summary.failureCount === 0
            ? 'success'
            : summary.successCount > 0
                ? 'warning'
                : 'error';

        addToast?.(buildBatchTipOutcomeMessage(summary), toastType);
    }, [addToast, notifyTipSent, pendingTx?.totalRecipients]);

    const handleBatchTxFailed = useCallback((reason) => {
        analytics.trackBatchTipFailed();
        addToast?.(`Batch transaction failed: ${reason}`, 'error');
    }, [addToast]);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white">
                        <Users className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Batch Tips</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Send tips to multiple recipients in a single transaction
                        </p>
                    </div>
                </div>

                {/* Balance */}
                {senderAddress && (
                    <div className="mb-5 flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Your Balance</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {balanceLoading
                                    ? 'Loading...'
                                    : formatBalance(balance, { fallback: 'Unavailable' })}
                            </p>
                        </div>
                        {totalAmount > 0 && (
                            <div className="text-right">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Batch Total</p>
                                <p className={`text-lg font-bold ${balanceSTX !== null && totalAmount > balanceSTX ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {totalAmount.toFixed(6)} STX
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Strict mode toggle */}
                <div className="mb-5 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Strict Mode</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Stop entire batch if any single tip fails
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setStrictMode(!strictMode)}
                        role="switch"
                        aria-checked={strictMode}
                        aria-label="Toggle strict mode"
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            strictMode ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                strictMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                    </button>
                </div>

                {/* Recipient list */}
                <div className="space-y-3 mb-5">
                    {recipients.map((r, i) => (
                        <fieldset
                            key={i}
                            className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700"
                        >
                            <legend className="sr-only">Recipient {i + 1}</legend>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    #{i + 1}
                                </span>
                                {recipients.length > 1 && (
                                    <button
                                        onClick={() => removeRecipient(i)}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        aria-label={`Remove recipient ${i + 1}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2 mb-2">
                                <div>
                                    <label htmlFor={`batch-addr-${i}`} className="sr-only">
                                        Recipient {i + 1} address
                                    </label>
                                    <input
                                        id={`batch-addr-${i}`}
                                        type="text"
                                        value={r.address}
                                        onChange={(e) => updateRecipient(i, 'address', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                                            errors[`${i}-address`]
                                                ? 'border-red-300 dark:border-red-600'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                        placeholder="SP2... recipient address"
                                    />
                                    {errors[`${i}-address`] && (
                                        <p className="mt-0.5 text-xs text-red-500">{errors[`${i}-address`]}</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor={`batch-amt-${i}`} className="sr-only">
                                        Recipient {i + 1} amount
                                    </label>
                                    <input
                                        id={`batch-amt-${i}`}
                                        type="number"
                                        value={r.amount}
                                        onChange={(e) => updateRecipient(i, 'amount', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                                            errors[`${i}-amount`]
                                                ? 'border-red-300 dark:border-red-600'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                        placeholder="STX"
                                        step="0.001"
                                        min={MIN_TIP_STX}
                                    />
                                    {errors[`${i}-amount`] && (
                                        <p className="mt-0.5 text-xs text-red-500">{errors[`${i}-amount`]}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label htmlFor={`batch-msg-${i}`} className="sr-only">
                                    Recipient {i + 1} message
                                </label>
                                <input
                                    id={`batch-msg-${i}`}
                                    type="text"
                                    value={r.message}
                                    onChange={(e) => updateRecipient(i, 'message', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="Message (optional, max 280 chars)"
                                    maxLength={280}
                                />
                                {errors[`${i}-message`] && (
                                    <p className="mt-0.5 text-xs text-red-500">{errors[`${i}-message`]}</p>
                                )}
                            </div>
                        </fieldset>
                    ))}
                </div>

                {/* Add recipient */}
                <button
                    onClick={addRecipient}
                    disabled={recipients.length >= MAX_BATCH_SIZE}
                    className="w-full flex items-center justify-center gap-2 py-2.5 mb-5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Add Recipient ({recipients.length}/{MAX_BATCH_SIZE})
                </button>

                {/* Summary and submit */}
                {recipients.length > 0 && totalAmount > 0 && (
                    <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-sm">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400 mb-1">
                            <span>Recipients</span>
                            <span className="font-semibold">{recipients.length}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400 mb-1">
                            <span>Mode</span>
                            <span className="font-semibold">{strictMode ? 'Strict (all-or-nothing)' : 'Best effort'}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
                            <span>Total</span>
                            <span>{totalAmount.toFixed(6)} STX</span>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleConfirmAndSend}
                    disabled={sending || recipients.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {sending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            Sending Batch...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" aria-hidden="true" />
                            Send {recipients.length} Tip{recipients.length !== 1 ? 's' : ''}
                        </>
                    )}
                </button>

                {pendingTx?.txId && (
                    <TxStatus
                        txId={pendingTx.txId}
                        onConfirmed={handleBatchTxConfirmed}
                        onFailed={handleBatchTxFailed}
                    />
                )}
            </div>

            <ConfirmDialog
                open={showConfirm}
                title="Confirm Batch Tips"
                onConfirm={handleSendBatch}
                onCancel={() => setShowConfirm(false)}
                confirmLabel={`Send ${recipients.length} Tip${recipients.length !== 1 ? 's' : ''}`}
            >
                <p>
                    You are about to send <strong>{recipients.length}</strong> tip{recipients.length !== 1 ? 's' : ''} totalling{' '}
                    <strong>{totalAmount.toFixed(6)} STX</strong> in a single transaction.
                </p>
                <p className="mt-2 text-xs text-gray-500">
                    Mode: {strictMode ? 'Strict (all-or-nothing)' : 'Best effort (partial success allowed)'}
                </p>
            </ConfirmDialog>
        </div>
    );
}
