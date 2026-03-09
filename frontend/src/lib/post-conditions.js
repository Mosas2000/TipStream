/**
 * Post-condition helpers for TipStream frontend contract calls.
 *
 * All user-facing transactions must use PostConditionMode.Deny and
 * attach explicit STX transfer limits.  This module provides the
 * same fee-aware calculation used in the CLI scripts so the frontend
 * and backend stay in sync.
 */

import { PostConditionMode, Pc } from '@stacks/transactions';

// Contract fee parameters — keep in sync with tipstream.clar
export const FEE_BASIS_POINTS = 50;
export const BASIS_POINTS_DIVISOR = 10000;

/**
 * The only acceptable post-condition mode for production transactions.
 * Using PostConditionMode.Allow is a security risk because it permits
 * the contract to transfer arbitrary STX from the user's account.
 */
export const SAFE_POST_CONDITION_MODE = PostConditionMode.Deny;

/**
 * Calculate the maximum microSTX the sender will transfer for a tip,
 * including the contract fee and a 1-uSTX rounding buffer.
 *
 * @param {number} amountMicroSTX  Tip amount in microSTX.
 * @param {number} [feeBps=50]  Fee in basis points.
 * @returns {number}
 */
export function maxTransferForTip(amountMicroSTX, feeBps = FEE_BASIS_POINTS) {
    const fee = Math.ceil(amountMicroSTX * feeBps / BASIS_POINTS_DIVISOR);
    return amountMicroSTX + fee + 1;
}

/**
 * Build a Pc-based STX post condition for a tip transaction.
 *
 * @param {string} senderAddress  The sender's Stacks principal.
 * @param {number} amountMicroSTX  Tip amount in microSTX.
 * @param {number} [feeBps=50]  Fee in basis points.
 * @returns {object}
 */
export function tipPostCondition(senderAddress, amountMicroSTX, feeBps = FEE_BASIS_POINTS) {
    return Pc.principal(senderAddress)
        .willSendLte(maxTransferForTip(amountMicroSTX, feeBps))
        .ustx();
}

/**
 * Calculate the platform fee in microSTX for a given tip amount.
 * Uses Math.ceil to match the on-chain rounding behavior.
 *
 * @param {number} amountMicroSTX  Tip amount in microSTX.
 * @param {number} [feeBps=50]  Fee in basis points.
 * @returns {number}
 */
export function feeForTip(amountMicroSTX, feeBps = FEE_BASIS_POINTS) {
    return Math.ceil(amountMicroSTX * feeBps / BASIS_POINTS_DIVISOR);
}

/**
 * Calculate the total microSTX deducted from the sender's wallet,
 * which is the tip amount plus the platform fee.
 *
 * @param {number} amountMicroSTX  Tip amount in microSTX.
 * @param {number} [feeBps=50]  Fee in basis points.
 * @returns {number}
 */
export function totalDeduction(amountMicroSTX, feeBps = FEE_BASIS_POINTS) {
    return amountMicroSTX + feeForTip(amountMicroSTX, feeBps);
}

/**
 * Calculate the net amount the recipient receives after the fee split.
 *
 * @param {number} amountMicroSTX  Tip amount in microSTX.
 * @param {number} [feeBps=50]  Fee in basis points.
 * @returns {number}
 */
export function recipientReceives(amountMicroSTX, feeBps = FEE_BASIS_POINTS) {
    return amountMicroSTX - Math.floor(amountMicroSTX * feeBps / BASIS_POINTS_DIVISOR);
}
