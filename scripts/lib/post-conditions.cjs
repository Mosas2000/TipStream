/**
 * Post-condition helpers for TipStream contract interactions.
 *
 * Every on-chain call should use PostConditionMode.Deny paired with
 * explicit conditions that cap how much STX the sender can transfer.
 * This module centralizes the fee calculation and condition building
 * so all scripts use the same logic.
 */

const {
    makeStandardSTXPostCondition,
    FungibleConditionCode,
    PostConditionMode,
} = require('@stacks/transactions');

// Default contract fee — keep in sync with tipstream.clar
const FEE_BASIS_POINTS = 50;
const BASIS_POINTS_DIVISOR = 10000;

/**
 * Calculate the maximum STX (in microSTX) the sender should transfer
 * for a given tip amount, accounting for the platform fee.
 *
 * The contract deducts `amount * feeBasisPoints / 10000` as a fee.
 * We add 1 microSTX as a rounding buffer to avoid off-by-one rejections.
 *
 * @param {number} amount  Tip amount in microSTX.
 * @param {number} [feeBps=50]  Fee in basis points.
 * @returns {number} Maximum microSTX the sender will send.
 */
function maxTransferForTip(amount, feeBps = FEE_BASIS_POINTS) {
    const fee = Math.ceil(amount * feeBps / BASIS_POINTS_DIVISOR);
    return amount + fee + 1;
}

/**
 * Build a standard STX post condition for a tip transaction.
 *
 * @param {string} senderAddress  The sender's Stacks principal.
 * @param {number} amount  Tip amount in microSTX.
 * @param {number} [feeBps=50]  Fee in basis points.
 * @returns {object} A Stacks post condition object.
 */
function tipPostCondition(senderAddress, amount, feeBps = FEE_BASIS_POINTS) {
    return makeStandardSTXPostCondition(
        senderAddress,
        FungibleConditionCode.LessEqual,
        maxTransferForTip(amount, feeBps)
    );
}

/**
 * The only acceptable post-condition mode for production transactions.
 */
const SAFE_POST_CONDITION_MODE = PostConditionMode.Deny;

module.exports = {
    FEE_BASIS_POINTS,
    BASIS_POINTS_DIVISOR,
    maxTransferForTip,
    tipPostCondition,
    SAFE_POST_CONDITION_MODE,
};
