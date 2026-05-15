import { useState, useMemo, useCallback, useEffect } from 'react';
import { toMicroSTX, formatSTX } from '../lib/utils';
import { formatBalance, hasSufficientMicroStx } from '../lib/balance-utils';
import { isValidStacksPrincipal } from '../lib/stacks-principal';
import { canProceedWithRecipient, getRecipientValidationMessage } from '../lib/recipient-validation';
import { totalDeduction, feeForTip, recipientReceives, FEE_PERCENT } from '../lib/post-conditions';
import { useDemoMode } from '../context/DemoContext';
import { useBalance } from '../hooks/useBalance';
import { useBlockCheck } from '../hooks/useBlockCheck';
import { useStxPrice } from '../hooks/useStxPrice';
import { useSenderAddress } from '../hooks/useSenderAddress';
import { analytics } from '../lib/analytics';
import ConfirmDialog from './ui/confirm-dialog';
import { Calendar, Clock } from 'lucide-react';

const MIN_TIP_STX = 0.001;
const MAX_TIP_STX = 10000;
const MIN_SCHEDULE_MINUTES = 5;
const MAX_SCHEDULE_DAYS = 365;

const TIP_CATEGORIES = [
    { id: 0, label: 'General' },
    { id: 1, label: 'Content Creation' },
    { id: 2, label: 'Open Source' },
    { id: 3, label: 'Community Help' },
    { id: 4, label: 'Appreciation' },
    { id: 5, label: 'Education' },
    { id: 6, label: 'Bug Bounty' },
];

export default function ScheduleTip({ addToast }) {
    const { demoEnabled, getDemoData } = useDemoMode();
    const { toUsd } = useStxPrice();
    const { blocked: blockedWarning, checkBlocked, reset: resetBlockCheck } = useBlockCheck();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState(0);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [recipientError, setRecipientError] = useState('');
    const [amountError, setAmountError] = useState('');
    const [scheduleError, setScheduleError] = useState('');

    const walletSenderAddress = useSenderAddress();
    const senderAddress = demoEnabled ? getDemoData().mockWalletAddress : walletSenderAddress;
    const realBalanceState = useBalance(senderAddress);
    const balance = demoEnabled ? getDemoData().mockBalance : realBalanceState.balance;
    const balanceLoading = demoEnabled ? false : realBalanceState.loading;

    const balanceSTX = useMemo(() => {
        if (balance === null || balance === undefined) return null;
        return typeof balance === 'string' ? Number(balance) / 1000000 : balance / 1000000;
    }, [balance]);

    const isRecipientHighRisk = !canProceedWithRecipient(recipient, blockedWarning);

    const minScheduleDateTime = useMemo(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + MIN_SCHEDULE_MINUTES);
        return now.toISOString().slice(0, 16);
    }, []);

    const maxScheduleDateTime = useMemo(() => {
        const now = new Date();
        now.setDate(now.getDate() + MAX_SCHEDULE_DAYS);
        return now.toISOString().slice(0, 16);
    }, []);

    const validateRecipient = useCallback((value) => {
        resetBlockCheck();
        setRecipientError('');

        if (value && !isValidStacksPrincipal(value)) {
            setRecipientError('Enter a valid Stacks principal');
            return;
        }

        if (value.trim() === senderAddress) {
            setRecipientError('You cannot send a tip to yourself');
            return;
        }

        if (value) {
            checkBlocked(value);
        }
    }, [checkBlocked, resetBlockCheck, senderAddress]);

    useEffect(() => {
        Promise.resolve().then(() => {
            validateRecipient(recipient);
        });
    }, [recipient, validateRecipient]);

    const handleRecipientChange = (value) => {
        setRecipient(value);
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
            const microSTX = toMicroSTX(parsed.toString());
            if (!hasSufficientMicroStx(balance, totalDeduction(microSTX))) {
                setAmountError('Insufficient balance');
            } else {
                setAmountError('');
            }
        } else {
            setAmountError('');
        }
    };

    const validateScheduleDateTime = useCallback(() => {
        setScheduleError('');

        if (!scheduledDate || !scheduledTime) {
            return;
        }

        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const now = new Date();
        const minTime = new Date(now.getTime() + MIN_SCHEDULE_MINUTES * 60 * 1000);
        const maxTime = new Date(now.getTime() + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000);

        if (scheduledDateTime < minTime) {
            setScheduleError(`Scheduled time must be at least ${MIN_SCHEDULE_MINUTES} minutes in the future`);
        } else if (scheduledDateTime > maxTime) {
            setScheduleError(`Scheduled time cannot be more than ${MAX_SCHEDULE_DAYS} days in the future`);
        }
    }, [scheduledDate, scheduledTime]);

    useEffect(() => {
        validateScheduleDateTime();
    }, [validateScheduleDateTime]);

    const validateAndConfirm = () => {
        if (!recipient || !amount || !scheduledDate || !scheduledTime) {
            addToast('Please fill in all required fields', 'warning');
            return;
        }

        if (!isValidStacksPrincipal(recipient)) {
            addToast('Invalid Stacks principal format', 'warning');
            return;
        }

        if (recipient.trim() === senderAddress) {
            addToast('You cannot send a tip to yourself', 'warning');
            return;
        }

        if (!canProceedWithRecipient(recipient, blockedWarning)) {
            const validationMessage = getRecipientValidationMessage(recipient, blockedWarning);
            addToast(validationMessage || 'Cannot send tip to this recipient', 'error');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            addToast('Please enter a valid amount', 'warning');
            return;
        }

        if (parsedAmount < MIN_TIP_STX || parsedAmount > MAX_TIP_STX) {
            addToast(`Amount must be between ${MIN_TIP_STX} and ${MAX_TIP_STX.toLocaleString()} STX`, 'warning');
            return;
        }

        if (balanceSTX !== null) {
            const microSTX = toMicroSTX(amount);
            if (!hasSufficientMicroStx(balance, totalDeduction(microSTX))) {
                addToast('Insufficient balance', 'warning');
                return;
            }
        }

        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const now = new Date();
        const minTime = new Date(now.getTime() + MIN_SCHEDULE_MINUTES * 60 * 1000);

        if (scheduledDateTime < minTime) {
            addToast(`Scheduled time must be at least ${MIN_SCHEDULE_MINUTES} minutes in the future`, 'warning');
            return;
        }

        setShowConfirm(true);
        analytics.trackTipStarted();
    };

    const handleScheduleTip = async () => {
        setShowConfirm(false);
        setLoading(true);

        try {
            const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
            const microSTX = toMicroSTX(amount);

            const payload = {
                sender: senderAddress,
                recipient: recipient.trim(),
                amount: microSTX,
                scheduledFor: scheduledDateTime.toISOString(),
                message: message || '',
                category,
            };

            const response = await fetch('/api/scheduled-tips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to schedule tip');
            }

            const result = await response.json();

            setRecipient('');
            setAmount('');
            setMessage('');
            setCategory(0);
            setScheduledDate('');
            setScheduledTime('');

            addToast(`Tip scheduled for ${scheduledDateTime.toLocaleString()}`, 'success');
            analytics.trackScheduledTipCreated();
        } catch (error) {
            console.error('Failed to schedule tip:', error);
            addToast(error.message || 'Failed to schedule tip', 'error');
            analytics.trackScheduledTipFailed();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Schedule a Tip</h2>

                {senderAddress && (
                    <div className="mb-5 flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Your Balance</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                {balanceLoading ? 'Loading...' : balanceSTX !== null
                                    ? formatBalance(balance)
                                    : 'Unavailable'}
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label htmlFor="schedule-recipient" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Recipient Address</label>
                        {(() => {
                            const isRisky = !canProceedWithRecipient(recipient, blockedWarning);
                            const validationMsg = getRecipientValidationMessage(recipient, blockedWarning);
                            return (
                                <>
                                    <input id="schedule-recipient" type="text" value={recipient} onChange={(e) => handleRecipientChange(e.target.value)}
                                        className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all bg-white dark:bg-gray-800 dark:text-white ${recipientError || (isRisky && validationMsg) ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'}`}
                                        placeholder="SP2..." />
                                    {recipientError && <p className="mt-1 text-xs text-red-500">{recipientError}</p>}
                                    {validationMsg && <p className="mt-1 text-xs text-red-500">{validationMsg}</p>}
                                </>
                            );
                        })()}
                    </div>

                    <div>
                        <label htmlFor="schedule-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (STX)</label>
                        <input id="schedule-amount" type="number" value={amount} onChange={(e) => handleAmountChange(e.target.value)}
                            className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all bg-white dark:bg-gray-800 dark:text-white ${amountError ? 'border-red-300 dark:border-red-600' : 'border-gray-200 dark:border-gray-700'}`}
                            placeholder="0.5" step="0.001" min={MIN_TIP_STX} max={MAX_TIP_STX} />
                        {amountError && <p className="mt-1 text-xs text-red-500">{amountError}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Date
                            </label>
                            <input id="schedule-date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                                min={minScheduleDateTime.split('T')[0]}
                                max={maxScheduleDateTime.split('T')[0]}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label htmlFor="schedule-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Time
                            </label>
                            <input id="schedule-time" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all" />
                        </div>
                    </div>
                    {scheduleError && <p className="text-xs text-red-500">{scheduleError}</p>}

                    <div>
                        <label htmlFor="schedule-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message (optional)</label>
                        <textarea id="schedule-message" value={message} onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all resize-none"
                            placeholder="Great work!" maxLength={280} rows={2} />
                        <p className={`text-xs mt-1 text-right ${message.length >= 280 ? 'text-red-500' : 'text-gray-400'}`}>
                            {message.length}/280
                        </p>
                    </div>

                    <div>
                        <label htmlFor="schedule-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                        <select id="schedule-category" value={category} onChange={(e) => setCategory(Number(e.target.value))}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all">
                            {TIP_CATEGORIES.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    {amount && parseFloat(amount) > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-sm">
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
                                    <span>{formatSTX(totalDeduction(toMicroSTX(amount)), 6)} STX</span>
                                </div>
                                <div className="flex justify-between text-gray-500 dark:text-gray-500">
                                    <span>Recipient receives</span>
                                    <span>{formatSTX(recipientReceives(toMicroSTX(amount)), 6)} STX</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <button onClick={validateAndConfirm} disabled={loading || isRecipientHighRisk}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </span>
                        ) : 'Schedule Tip'}
                    </button>
                </div>

                <ConfirmDialog open={showConfirm} title="Confirm Scheduled Tip" onConfirm={handleScheduleTip} onCancel={() => setShowConfirm(false)} confirmLabel="Schedule Tip">
                    <div className="space-y-2">
                        <p>Schedule <strong>{amount} STX</strong> to:</p>
                        <p className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-lg break-all">{recipient}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Scheduled for: <strong>{scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString() : ''}</strong>
                        </p>
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
