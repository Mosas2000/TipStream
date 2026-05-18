/**
 * @module tipstreak-sdk/core/post-conditions
 *
 * Post-condition helpers for Stacks contract calls.
 *
 * All user-facing transactions should use PostConditionMode.Deny and
 * attach explicit STX transfer limits. This module provides fee-aware
 * calculation helpers that match the on-chain contract logic.
 *
 * Requires `@stacks/transactions` as a peer dependency.
 */

import { PostConditionMode, Pc } from '@stacks/transactions';

// Default fee parameters — keep in sync with your contract
export const FEE_BASIS_POINTS = 50;
export const BASIS_POINTS_DIVISOR = 10000;
export const MIN_FEE_USTX = 1;

/** Human-readable fee percentage (e.g. 0.5 for 0.5%). */
export const FEE_PERCENT = (FEE_BASIS_POINTS / BASIS_POINTS_DIVISOR) * 100;

/**
 * The only safe post-condition mode for production transactions.
 * PostConditionMode.Allow permits the contract to transfer arbitrary STX.
 */
export const SAFE_POST_CONDITION_MODE = PostConditionMode.Deny;

/**
 * Calculate the maximum micro-STX the sender will transfer for a tip,
 * including the contract fee and a 1-uSTX rounding buffer.
 *
 * @param {number|string} amountMicroSTX - Tip amount in micro-STX
 * @param {number} [feeBps=50] - Fee in basis points
 * @returns {number}
 *
 * @example
 * maxTransferForTip(1000000) // 1005001  (1 STX + 0.5% fee + 1 buffer)
 */
export function maxTransferForTip(amountMicroSTX, feeBps = FEE_BASIS_POINTS) {
  const amt = Number(amountMicroSTX);
  const rawFee = Math.ceil((amt * feeBps) / BASIS_POINTS_DIVISOR);
  const fee = feeBps > 0 ? Math.max(rawFee, MIN_FEE_USTX) : 0;
  return amt + fee + 1;
}

/**
 * Build a Pc-based STX post condition for a tip transaction.
 *
 * @param {string} senderAddress - The sender's Stacks principal
 * @param {number} amountMicroSTX - Tip amount in micro-STX
 * @param {number} [feeBps=50] - Fee in basis points
 * @returns {object} Post condition object for use in `makeContractCall`
 *
 * @example
 * const postCondition = tipPostCondition('SP2J6Z...', 1000000);
 */
export function tipPostCondition(senderAddress, amountMicroSTX, feeBps = FEE_BASIS_POINTS) {
  return Pc.principal(senderAddress)
    .willSendLte(maxTransferForTip(amountMicroSTX, feeBps))
    .ustx();
}

/**
 * Calculate the platform fee in micro-STX for a given tip amount.
 * Uses Math.ceil to match on-chain rounding behavior.
 *
 * @param {number|string} amountMicroSTX
 * @param {number} [feeBps=50]
 * @returns {number}
 *
 * @example
 * feeForTip(1000000) // 5000  (0.5% of 1 STX)
 */
export function feeForTip(amountMicroSTX, feeBps = FEE_BASIS_POINTS) {
  const raw = Math.ceil((Number(amountMicroSTX) * feeBps) / BASIS_POINTS_DIVISOR);
  return feeBps > 0 ? Math.max(raw, MIN_FEE_USTX) : 0;
}

/**
 * Calculate the total micro-STX deducted from the sender's wallet
 * (tip amount + platform fee).
 *
 * @param {number|string} amountMicroSTX
 * @param {number} [feeBps=50]
 * @returns {number}
 */
export function totalDeduction(amountMicroSTX, feeBps = FEE_BASIS_POINTS) {
  const amt = Number(amountMicroSTX);
  return amt + feeForTip(amt, feeBps);
}

/**
 * Calculate the net amount the recipient receives after the fee split.
 *
 * @param {number|string} amountMicroSTX
 * @param {number} [feeBps=50]
 * @returns {number}
 *
 * @example
 * recipientReceives(1000000) // 995000  (1 STX minus 0.5% fee)
 */
export function recipientReceives(amountMicroSTX, feeBps = FEE_BASIS_POINTS) {
  const amt = Number(amountMicroSTX);
  const rawFee = Math.floor((amt * feeBps) / BASIS_POINTS_DIVISOR);
  const fee = feeBps > 0 ? Math.max(rawFee, MIN_FEE_USTX) : 0;
  return amt - fee;
}
