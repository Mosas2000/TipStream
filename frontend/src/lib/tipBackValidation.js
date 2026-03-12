/**
 * Tip-back validation utilities.
 *
 * Extracted from RecentTips so that validation logic can be tested
 * independently without pulling in heavy Stacks SDK dependencies.
 *
 * @module lib/tipBackValidation
 */

/** Minimum acceptable tip-back amount in STX. Matches SendTip constraint. */
export const MIN_TIP_STX = 0.001;

/** Maximum acceptable tip-back amount in STX. Matches SendTip constraint. */
export const MAX_TIP_STX = 10000;

/**
 * Validate the tip-back amount and return an error message string.
 * Returns an empty string when the amount is valid.
 *
 * @param {string} value - Raw input value from the amount field.
 * @returns {string} Error message, or '' if valid.
 */
export function validateTipBackAmount(value) {
    if (!value || value.trim() === '') return 'Amount is required';
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) return 'Amount must be a positive number';
    if (parsed < MIN_TIP_STX) return `Minimum tip is ${MIN_TIP_STX} STX`;
    if (parsed > MAX_TIP_STX) return `Maximum tip is ${MAX_TIP_STX.toLocaleString()} STX`;
    return '';
}
