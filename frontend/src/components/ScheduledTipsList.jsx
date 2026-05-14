import { useState, useEffect, useCallback } from 'react';
import { formatSTX } from '../lib/utils';
import { useSenderAddress } from '../hooks/useSenderAddress';
import { useDemoMode } from '../context/DemoContext';
import { Calendar, Clock, X, CheckCircle, XCircle, Loader } from 'lucide-react';
import ConfirmDialog from './ui/confirm-dialog';

const STATUS_LABELS = {
    pending: 'Pending',
    processing: 'Processing',
    executed: 'Executed',
    cancelled: 'Cancelled',
    failed: 'Failed',
};

const STATUS_COLORS = {
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    executed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function ScheduledTipsList({ addToast }) {
    const { demoEnabled, getDemoData } = useDemoMode();
    const walletSenderAddress = useSenderAddress();
    const senderAddress = demoEnabled ? getDemoData().mockWalletAddress : walletSenderAddress;

    const [scheduledTips, setScheduledTips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [cancellingId, setCancellingId] = useState(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [tipToCancel, setTipToCancel] = useState(null);

    const fetchScheduledTips = useCallback(async () => {
        if (!senderAddress) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({ sender: senderAddress });
            if (filter !== 'all') {
                params.append('status', filter);
            }

            const response = await fetch(`/api/scheduled-tips?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch scheduled tips');
            }

            const data = await response.json();
            setScheduledTips(data.scheduledTips || []);
        } catch (error) {
            console.error('Failed to fetch scheduled tips:', error);
            addToast('Failed to load scheduled tips', 'error');
        } finally {
            setLoading(false);
        }
    }, [senderAddress, filter, addToast]);

    useEffect(() => {
        fetchScheduledTips();
    }, [fetchScheduledTips]);

    const handleCancelClick = (tip) => {
        setTipToCancel(tip);
        setShowCancelConfirm(true);
    };

    const handleCancelTip = async () => {
        if (!tipToCancel) return;

        setShowCancelConfirm(false);
        setCancellingId(tipToCancel.id);

        try {
            const response = await fetch(`/api/scheduled-tips/${tipToCancel.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender: senderAddress }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to cancel scheduled tip');
            }

            addToast('Scheduled tip cancelled successfully', 'success');
            fetchScheduledTips();
        } catch (error) {
            console.error('Failed to cancel scheduled tip:', error);
            addToast(error.message || 'Failed to cancel scheduled tip', 'error');
        } finally {
            setCancellingId(null);
            setTipToCancel(null);
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const isUpcoming = (scheduledFor) => {
        return new Date(scheduledFor) > new Date();
    };

    if (!senderAddress) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Connect your wallet to view scheduled tips</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scheduled Tips</h2>
                    <button
                        onClick={fetchScheduledTips}
                        disabled={loading}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {['all', 'pending', 'executed', 'cancelled', 'failed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                                filter === status
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            {status === 'all' ? 'All' : STATUS_LABELS[status]}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-amber-500" />
                    </div>
                ) : scheduledTips.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">
                            {filter === 'all' ? 'No scheduled tips yet' : `No ${filter} scheduled tips`}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {scheduledTips.map((tip) => (
                            <div
                                key={tip.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[tip.status]}`}>
                                                {STATUS_LABELS[tip.status]}
                                            </span>
                                            {tip.status === 'pending' && isUpcoming(tip.scheduledFor) && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    Upcoming
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">To:</span>
                                                <span className="font-mono text-xs text-gray-900 dark:text-white truncate">
                                                    {tip.recipient}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {formatSTX(tip.amount, 6)} STX
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Calendar className="w-4 h-4" />
                                                <span>{formatDateTime(tip.scheduledFor)}</span>
                                            </div>

                                            {tip.message && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-2">
                                                    "{tip.message}"
                                                </p>
                                            )}

                                            {tip.txId && (
                                                <div className="flex items-center gap-2 text-sm mt-2">
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                    <a
                                                        href={`https://explorer.hiro.so/txid/${tip.txId}?chain=mainnet`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-mono text-xs"
                                                    >
                                                        {tip.txId.slice(0, 8)}...{tip.txId.slice(-8)}
                                                    </a>
                                                </div>
                                            )}

                                            {tip.failureReason && (
                                                <div className="flex items-center gap-2 text-sm mt-2 text-red-600 dark:text-red-400">
                                                    <XCircle className="w-4 h-4" />
                                                    <span>{tip.failureReason}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {tip.status === 'pending' && (
                                        <button
                                            onClick={() => handleCancelClick(tip)}
                                            disabled={cancellingId === tip.id}
                                            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {cancellingId === tip.id ? (
                                                <Loader className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <X className="w-4 h-4" />
                                            )}
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={showCancelConfirm}
                title="Cancel Scheduled Tip"
                onConfirm={handleCancelTip}
                onCancel={() => {
                    setShowCancelConfirm(false);
                    setTipToCancel(null);
                }}
                confirmLabel="Cancel Tip"
            >
                {tipToCancel && (
                    <div className="space-y-2">
                        <p>Are you sure you want to cancel this scheduled tip?</p>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                                <span className="font-semibold">{formatSTX(tipToCancel.amount, 6)} STX</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Recipient:</span>
                                <span className="font-mono text-xs">{tipToCancel.recipient.slice(0, 8)}...{tipToCancel.recipient.slice(-4)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Scheduled for:</span>
                                <span>{formatDateTime(tipToCancel.scheduledFor)}</span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
                    </div>
                )}
            </ConfirmDialog>
        </div>
    );
}
