import { useState } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import {
    TimelockStatus,
    formatBlockHeight,
    formatBasisPoints,
    TIMELOCK_BLOCKS,
} from '../lib/timelock';
import {
    proposePauseChange,
    executePauseChange,
    proposeFeeChange,
    executeFeeChange,
    cancelFeeChange,
} from '../lib/admin-transactions';
import {
    Shield,
    Pause,
    Play,
    Clock,
    DollarSign,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Loader2,
} from 'lucide-react';

/**
 * AdminDashboard component for timelocked contract administration.
 *
 * This component exclusively uses the timelocked propose-wait-execute
 * path for all admin operations. The direct bypass functions
 * (set-paused, set-fee-basis-points) are intentionally never called
 * from this interface to enforce the 144-block (~24 hour) timelock.
 *
 * @param {object} props
 * @param {string} props.userAddress - Connected user's STX address
 * @param {Function} props.addToast - Toast notification function
 */
export default function AdminDashboard({ userAddress, addToast }) {
    const {
        contractOwner,
        isOwner,
        blockHeight,
        pauseState,
        feeState,
        pendingPauseStatus,
        pendingFeeStatus,
        loading,
        error,
        refresh,
    } = useAdmin(userAddress);

    const [newFee, setNewFee] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="max-w-2xl mx-auto text-center py-16">
                <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Admin Access Required
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    This page is restricted to the contract owner.
                </p>
                {contractOwner && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-4 font-mono break-all">
                        Owner: {contractOwner}
                    </p>
                )}
            </div>
        );
    }

    const handleProposePause = async (paused) => {
        setSubmitting(true);
        try {
            await proposePauseChange(paused, {
                onFinish: () => {
                    addToast(
                        `Pause ${paused ? 'enable' : 'disable'} proposed. Execution available after ${TIMELOCK_BLOCKS} blocks (~24 hours).`,
                        'success'
                    );
                    refresh();
                },
                onCancel: () => {
                    addToast('Transaction cancelled.', 'info');
                },
            });
        } catch (err) {
            addToast(err.message || 'Failed to propose pause change.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleExecutePause = async () => {
        setSubmitting(true);
        try {
            await executePauseChange({
                onFinish: () => {
                    addToast('Pause change executed successfully.', 'success');
                    refresh();
                },
                onCancel: () => {
                    addToast('Transaction cancelled.', 'info');
                },
            });
        } catch (err) {
            addToast(err.message || 'Failed to execute pause change.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleProposeFee = async () => {
        const feeValue = parseInt(newFee, 10);
        if (isNaN(feeValue) || feeValue < 0 || feeValue > 1000) {
            addToast('Fee must be between 0 and 1000 basis points.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await proposeFeeChange(feeValue, {
                onFinish: () => {
                    addToast(
                        `Fee change to ${formatBasisPoints(feeValue)} proposed. Execution available after ${TIMELOCK_BLOCKS} blocks (~24 hours).`,
                        'success'
                    );
                    setNewFee('');
                    refresh();
                },
                onCancel: () => {
                    addToast('Transaction cancelled.', 'info');
                },
            });
        } catch (err) {
            addToast(err.message || 'Failed to propose fee change.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleExecuteFee = async () => {
        setSubmitting(true);
        try {
            await executeFeeChange({
                onFinish: () => {
                    addToast('Fee change executed successfully.', 'success');
                    refresh();
                },
                onCancel: () => {
                    addToast('Transaction cancelled.', 'info');
                },
            });
        } catch (err) {
            addToast(err.message || 'Failed to execute fee change.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelFee = async () => {
        setSubmitting(true);
        try {
            await cancelFeeChange({
                onFinish: () => {
                    addToast('Fee change proposal cancelled.', 'success');
                    refresh();
                },
                onCancel: () => {
                    addToast('Transaction cancelled.', 'info');
                },
            });
        } catch (err) {
            addToast(err.message || 'Failed to cancel fee change.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-amber-500" />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Admin Dashboard
                    </h1>
                </div>
                <button
                    onClick={refresh}
                    disabled={submitting}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Refresh admin state"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Status Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatusCard
                    label="Block Height"
                    value={formatBlockHeight(blockHeight)}
                    icon={Clock}
                />
                <StatusCard
                    label="Contract Owner"
                    value={contractOwner ? `${contractOwner.slice(0, 8)}...${contractOwner.slice(-4)}` : '--'}
                    icon={Shield}
                />
                <StatusCard
                    label="Timelock Delay"
                    value={`${TIMELOCK_BLOCKS} blocks`}
                    icon={Clock}
                />
            </div>

            {/* Pause Controls */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Pause className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Pause Controls
                    </h2>
                </div>

                <div className="space-y-4">
                    <TimelockNotice />

                    {pendingPauseStatus.status === TimelockStatus.NONE ? (
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleProposePause(true)}
                                disabled={submitting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <Pause className="w-4 h-4" />
                                Propose Pause
                            </button>
                            <button
                                onClick={() => handleProposePause(false)}
                                disabled={submitting}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                <Play className="w-4 h-4" />
                                Propose Unpause
                            </button>
                        </div>
                    ) : (
                        <PendingChangeCard
                            label={`Pending: ${pauseState.pendingPause ? 'Pause' : 'Unpause'}`}
                            status={pendingPauseStatus}
                            effectiveHeight={pauseState.effectiveHeight}
                            blockHeight={blockHeight}
                            onExecute={handleExecutePause}
                            submitting={submitting}
                        />
                    )}
                </div>
            </section>

            {/* Fee Controls */}
            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-2 mb-6">
                    <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Fee Controls
                    </h2>
                </div>

                <div className="space-y-4">
                    <TimelockNotice />

                    {pendingFeeStatus.status === TimelockStatus.NONE ? (
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label
                                    htmlFor="new-fee"
                                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                                >
                                    New Fee (basis points, 0-1000)
                                </label>
                                <input
                                    id="new-fee"
                                    type="number"
                                    min="0"
                                    max="1000"
                                    value={newFee}
                                    onChange={(e) => setNewFee(e.target.value)}
                                    placeholder="e.g. 50 = 0.5%"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                            </div>
                            <button
                                onClick={handleProposeFee}
                                disabled={submitting || !newFee}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                Propose Fee Change
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <PendingChangeCard
                                label={`Pending Fee: ${formatBasisPoints(feeState.pendingFee)}`}
                                status={pendingFeeStatus}
                                effectiveHeight={feeState.effectiveHeight}
                                blockHeight={blockHeight}
                                onExecute={handleExecuteFee}
                                onCancel={handleCancelFee}
                                submitting={submitting}
                            />
                        </div>
                    )}
                </div>
            </section>

            {/* Security Notice */}
            <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                            Timelock Enforcement
                        </h3>
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                            All admin changes go through the {TIMELOCK_BLOCKS}-block (~24 hour) timelock.
                            This dashboard does not use direct bypass functions. Changes are proposed first,
                            then executed after the waiting period expires.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

function StatusCard({ label, value, icon: Icon }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{value}</p>
        </div>
    );
}

function TimelockNotice() {
    return (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>All changes require a {TIMELOCK_BLOCKS}-block (~24 hour) waiting period before execution.</span>
        </div>
    );
}

function PendingChangeCard({ label, status, effectiveHeight, onExecute, onCancel, submitting }) {
    const isReady = status.status === TimelockStatus.READY;
    const progress = typeof status.blocksLeft === 'number' && typeof effectiveHeight === 'number' && typeof status.blocksTotal === 'number'
        ? 1 - (status.blocksLeft / status.blocksTotal)
        : 0;

    return (
        <div className={`rounded-xl border p-4 ${
            isReady
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
        }`}>
            <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-white">{label}</span>
                {isReady ? (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" /> Ready
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                        <Clock className="w-4 h-4" /> {status.timeEstimate}
                    </span>
                )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Effective at block {formatBlockHeight(effectiveHeight)}
                {status.blocksLeft > 0 && ` (${status.blocksLeft} blocks remaining)`}
            </p>

            {/* Timelock progress bar */}
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded mb-3 overflow-hidden">
                <div
                    className="h-2 bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                    style={{ width: `${Math.min(Math.max(progress * 100, 0), 100)}%` }}
                />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={onExecute}
                    disabled={!isReady || submitting}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                        isReady
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    <CheckCircle className="w-4 h-4" />
                    Execute
                </button>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        disabled={submitting}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <XCircle className="w-4 h-4" />
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}
