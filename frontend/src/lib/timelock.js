/**
 * Timelock utility module for block-based countdown calculations.
 *
 * The TipStream contract uses a 144-block delay (~24 hours) for
 * administrative changes. This module provides helpers to calculate
 * remaining blocks, estimated time, and status for pending changes.
 */

/** Number of blocks in the timelock delay */
export const TIMELOCK_BLOCKS = 144;

/** Average Stacks block time in seconds (~10 minutes) */
export const AVERAGE_BLOCK_TIME_SECONDS = 600;

/**
 * Status values for a pending timelocked change.
 *
 * - none: No change is pending
 * - pending: Change is proposed but timelock has not expired
 * - ready: Timelock has expired, change can be executed
 */
export const TimelockStatus = {
    NONE: 'none',
    PENDING: 'pending',
    READY: 'ready',
};

/**
 * Calculate the number of blocks remaining before a timelocked
 * change can be executed.
 *
 * @param {number} effectiveHeight - Block height when timelock expires
 * @param {number} currentHeight - Current block height
 * @returns {number} Blocks remaining (0 if expired)
 */
export function blocksRemaining(effectiveHeight, currentHeight) {
    if (!effectiveHeight || !currentHeight) return 0;
    const remaining = effectiveHeight - currentHeight;
    return remaining > 0 ? remaining : 0;
}

/**
 * Estimate the time remaining for a timelock in human-readable format.
 *
 * @param {number} blocks - Number of blocks remaining
 * @returns {string} Human-readable time string
 */
export function estimateTimeRemaining(blocks) {
    if (blocks <= 0) return 'Ready to execute';

    const totalSeconds = blocks * AVERAGE_BLOCK_TIME_SECONDS;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
        return `~${hours}h ${minutes}m remaining`;
    }
    return `~${minutes}m remaining`;
}

/**
 * Get the status of a pending timelocked change.
 *
 * @param {*} pendingValue - The pending value (null if no change pending)
 * @param {number} effectiveHeight - Block height when timelock expires
 * @param {number} currentHeight - Current block height
 * @returns {{ status: string, blocksLeft: number, timeEstimate: string }}
 */
export function getPendingChangeStatus(pendingValue, effectiveHeight, currentHeight) {
    if (pendingValue === null || pendingValue === undefined) {
        return {
            status: TimelockStatus.NONE,
            blocksLeft: 0,
            timeEstimate: '',
        };
    }

    const blocks = blocksRemaining(effectiveHeight, currentHeight);

    if (blocks <= 0) {
        return {
            status: TimelockStatus.READY,
            blocksLeft: 0,
            timeEstimate: 'Ready to execute',
        };
    }

    return {
        status: TimelockStatus.PENDING,
        blocksLeft: blocks,
        timeEstimate: estimateTimeRemaining(blocks),
    };
}

/**
 * Calculate progress percentage through the timelock period.
 *
 * @param {number} effectiveHeight - Block height when timelock expires
 * @param {number} currentHeight - Current block height
 * @returns {number} Progress percentage (0-100)
 */
export function timelockProgress(effectiveHeight, currentHeight) {
    if (!effectiveHeight || !currentHeight) return 0;

    const proposalHeight = effectiveHeight - TIMELOCK_BLOCKS;
    const elapsed = currentHeight - proposalHeight;

    if (elapsed <= 0) return 0;
    if (elapsed >= TIMELOCK_BLOCKS) return 100;

    return Math.round((elapsed / TIMELOCK_BLOCKS) * 100);
}

/**
 * Format a block height for display.
 *
 * @param {number} height - Block height
 * @returns {string} Formatted block height
 */
export function formatBlockHeight(height) {
    if (!height || height <= 0) return '--';
    return height.toLocaleString();
}

/**
 * Format basis points as a percentage string.
 *
 * @param {number} basisPoints - Fee in basis points
 * @returns {string} Percentage string (e.g., "0.5%")
 */
export function formatBasisPoints(basisPoints) {
    if (basisPoints === null || basisPoints === undefined) return '--';
    return `${(basisPoints / 100).toFixed(2)}%`;
}
