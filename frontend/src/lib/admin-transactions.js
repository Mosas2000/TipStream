/**
 * Admin transaction builders for timelocked operations.
 *
 * IMPORTANT: These builders exclusively use the timelocked propose/execute
 * path. The direct bypass functions (set-paused, set-fee-basis-points) are
 * intentionally excluded from the frontend to enforce the 144-block delay.
 *
 * Banned functions (never called from frontend):
 * - set-paused: bypasses timelock, use propose-pause-change instead
 * - set-fee-basis-points: bypasses timelock, use propose-fee-change instead
 */

import { openContractCall } from '@stacks/connect';
import {
    PostConditionMode,
    uintCV,
    boolCV,
} from '@stacks/transactions';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '../config/contracts';
import { network, appDetails, userSession } from '../utils/stacks';

/**
 * Build common transaction options for admin calls.
 *
 * @param {string} functionName - Contract function name
 * @param {Array} functionArgs - Clarity function arguments
 * @param {Function} onFinish - Success callback
 * @param {Function} onCancel - Cancel callback
 * @returns {object} Transaction options
 */
function buildAdminTxOptions(functionName, functionArgs, onFinish, onCancel) {
    return {
        network,
        appDetails,
        userSession,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName,
        functionArgs,
        postConditionMode: PostConditionMode.Deny,
        postConditions: [],
        onFinish: (data) => {
            if (onFinish) onFinish(data);
        },
        onCancel: () => {
            if (onCancel) onCancel();
        },
    };
}

/**
 * Propose a pause state change through the timelock.
 *
 * This starts the 144-block waiting period before the change can be executed.
 *
 * @param {boolean} paused - Whether to pause (true) or unpause (false)
 * @param {object} callbacks
 * @param {Function} callbacks.onFinish - Called when transaction is submitted
 * @param {Function} callbacks.onCancel - Called when user cancels
 */
export function proposePauseChange(paused, { onFinish, onCancel } = {}) {
    const options = buildAdminTxOptions(
        'propose-pause-change',
        [boolCV(paused)],
        onFinish,
        onCancel
    );
    return openContractCall(options);
}

/**
 * Execute a pending pause change after the timelock has expired.
 *
 * @param {object} callbacks
 * @param {Function} callbacks.onFinish - Called when transaction is submitted
 * @param {Function} callbacks.onCancel - Called when user cancels
 */
export function executePauseChange({ onFinish, onCancel } = {}) {
    const options = buildAdminTxOptions(
        'execute-pause-change',
        [],
        onFinish,
        onCancel
    );
    return openContractCall(options);
}

/**
 * Propose a fee change through the timelock.
 *
 * This starts the 144-block waiting period before the change can be executed.
 *
 * @param {number} newFeeBasisPoints - New fee in basis points (0-1000)
 * @param {object} callbacks
 * @param {Function} callbacks.onFinish - Called when transaction is submitted
 * @param {Function} callbacks.onCancel - Called when user cancels
 */
export function proposeFeeChange(newFeeBasisPoints, { onFinish, onCancel } = {}) {
    if (newFeeBasisPoints < 0 || newFeeBasisPoints > 1000) {
        throw new Error('Fee must be between 0 and 1000 basis points');
    }

    const options = buildAdminTxOptions(
        'propose-fee-change',
        [uintCV(newFeeBasisPoints)],
        onFinish,
        onCancel
    );
    return openContractCall(options);
}

/**
 * Execute a pending fee change after the timelock has expired.
 *
 * @param {object} callbacks
 * @param {Function} callbacks.onFinish - Called when transaction is submitted
 * @param {Function} callbacks.onCancel - Called when user cancels
 */
export function executeFeeChange({ onFinish, onCancel } = {}) {
    const options = buildAdminTxOptions(
        'execute-fee-change',
        [],
        onFinish,
        onCancel
    );
    return openContractCall(options);
}

/**
 * Cancel a pending fee change.
 *
 * @param {object} callbacks
 * @param {Function} callbacks.onFinish - Called when transaction is submitted
 * @param {Function} callbacks.onCancel - Called when user cancels
 */
export function cancelFeeChange({ onFinish, onCancel } = {}) {
    const options = buildAdminTxOptions(
        'cancel-fee-change',
        [],
        onFinish,
        onCancel
    );
    return openContractCall(options);
}
