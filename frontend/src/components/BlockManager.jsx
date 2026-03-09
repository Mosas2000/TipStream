import { useState, useMemo } from 'react';
import { openContractCall } from '@stacks/connect';
import {
    fetchCallReadOnlyFunction,
    cvToJSON,
    principalCV,
    PostConditionMode,
} from '@stacks/transactions';
import { network, appDetails, userSession } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_IS_USER_BLOCKED, FN_TOGGLE_BLOCK_USER } from '../config/contracts';
import { formatAddress } from '../lib/utils';
import { ShieldBan, Search, UserX, UserCheck, Loader2 } from 'lucide-react';

export default function BlockManager({ addToast }) {
    const [addressInput, setAddressInput] = useState('');
    const [checkResult, setCheckResult] = useState(null);
    const [checking, setChecking] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [blockedList, setBlockedList] = useState([]);

    const senderAddress = useMemo(() => {
        try {
            return userSession.loadUserData().profile.stxAddress.mainnet;
        } catch {
            return null;
        }
    }, []);

    const isValidStacksAddress = (address) => {
        if (!address) return false;
        const trimmed = address.trim();
        if (trimmed.length < 38 || trimmed.length > 41) return false;
        return /^(SP|SM|ST)[0-9A-Z]{33,39}$/i.test(trimmed);
    };

    const handleCheckBlocked = async () => {
        const target = addressInput.trim();
        if (!target || !senderAddress) return;

        if (!isValidStacksAddress(target)) {
            addToast?.('Enter a valid Stacks address', 'warning');
            return;
        }

        if (target === senderAddress) {
            addToast?.('You cannot block yourself', 'warning');
            return;
        }

        setChecking(true);
        setCheckResult(null);

        try {
            const result = await fetchCallReadOnlyFunction({
                network,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: FN_IS_USER_BLOCKED,
                functionArgs: [principalCV(senderAddress), principalCV(target)],
                senderAddress,
            });

            const json = cvToJSON(result);
            const isBlocked = json.value === true || json.value === 'true';
            setCheckResult({ address: target, blocked: isBlocked });
        } catch (err) {
            console.error('Failed to check block status:', err.message || err);
            addToast?.('Failed to check block status', 'error');
        } finally {
            setChecking(false);
        }
    };

    const handleToggleBlock = async (targetAddress) => {
        if (!senderAddress || !targetAddress) return;

        setToggling(true);
        try {
            await openContractCall({
                network,
                appDetails,
                contractAddress: CONTRACT_ADDRESS,
                contractName: CONTRACT_NAME,
                functionName: FN_TOGGLE_BLOCK_USER,
                functionArgs: [principalCV(targetAddress)],
                postConditions: [],
                postConditionMode: PostConditionMode.Deny,
                onFinish: (data) => {
                    setToggling(false);
                    const wasBlocked = checkResult?.blocked;
                    if (checkResult?.address === targetAddress) {
                        setCheckResult((prev) => prev ? { ...prev, blocked: !prev.blocked } : null);
                    }
                    if (wasBlocked) {
                        setBlockedList((prev) => prev.filter((a) => a !== targetAddress));
                        addToast?.(`Unblocked ${formatAddress(targetAddress, 6, 4)}. Tx: ${data.txId}`, 'success');
                    } else {
                        setBlockedList((prev) => [...prev, targetAddress]);
                        addToast?.(`Blocked ${formatAddress(targetAddress, 6, 4)}. Tx: ${data.txId}`, 'success');
                    }
                },
                onCancel: () => {
                    setToggling(false);
                    addToast?.('Block toggle cancelled', 'info');
                },
            });
        } catch (err) {
            console.error('Failed to toggle block:', err.message || err);
            addToast?.('Failed to toggle block status. Please try again.', 'error');
            setToggling(false);
        }
    };

    return (
        <div className="max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white">
                        <ShieldBan className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Block Manager</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Block or unblock users from sending you tips
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="block-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            User Address
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="block-address"
                                type="text"
                                value={addressInput}
                                onChange={(e) => {
                                    setAddressInput(e.target.value);
                                    setCheckResult(null);
                                }}
                                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all"
                                placeholder="SP2..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCheckBlocked();
                                }}
                            />
                            <button
                                onClick={handleCheckBlocked}
                                disabled={checking || !addressInput.trim()}
                                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Check block status"
                            >
                                {checking ? (
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                ) : (
                                    <Search className="w-4 h-4" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>

                    {checkResult && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={`flex items-center justify-between p-4 rounded-xl border ${
                            checkResult.blocked
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                        }`}>
                            <div className="flex items-center gap-3">
                                {checkResult.blocked ? (
                                    <UserX className="w-5 h-5 text-red-500" aria-hidden="true" />
                                ) : (
                                    <UserCheck className="w-5 h-5 text-green-500" aria-hidden="true" />
                                )}
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {formatAddress(checkResult.address, 8, 6)}
                                    </p>
                                    <p className={`text-xs ${checkResult.blocked ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {checkResult.blocked ? 'Currently blocked' : 'Not blocked'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggleBlock(checkResult.address)}
                                disabled={toggling}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 ${
                                    checkResult.blocked
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            >
                                {toggling ? (
                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                ) : checkResult.blocked ? (
                                    'Unblock'
                                ) : (
                                    'Block'
                                )}
                            </button>
                        </div>
                    )}

                    {blockedList.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Recently Blocked
                            </h3>
                            <div className="space-y-1">
                                {blockedList.map((addr) => (
                                    <div
                                        key={addr}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                                    >
                                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                            {formatAddress(addr, 8, 6)}
                                        </span>
                                        <button
                                            onClick={() => handleToggleBlock(addr)}
                                            disabled={toggling}
                                            className="text-xs font-semibold text-green-600 dark:text-green-400 hover:underline disabled:opacity-40"
                                        >
                                            Unblock
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
