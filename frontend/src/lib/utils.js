import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { MICRO_STX } from './balance-utils';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Convert micro-STX (integer) to STX (decimal string).
 * @param {number} microStx - Amount in micro-STX
 * @param {number} [decimals=6] - Decimal places to display
 * @returns {string} Formatted STX amount
 */
export function formatSTX(microStx, decimals = 6) {
    const value = Number(microStx) / MICRO_STX;
    return value.toFixed(decimals);
}

/**
 * Convert STX (decimal) to micro-STX (integer).
 * @param {number|string} stx - Amount in STX
 * @returns {number} Amount in micro-STX
 */
export function toMicroSTX(stx) {
    return Math.floor(parseFloat(stx) * MICRO_STX);
}

/**
 * Truncate a Stacks address for display.
 * @param {string} address - Full address
 * @param {number} [startChars=6] - Characters to show from start
 * @param {number} [endChars=4] - Characters to show from end
 * @returns {string} Truncated address
 */
export function formatAddress(address, startChars = 6, endChars = 4) {
    if (!address || address.length <= startChars + endChars + 3) return address || '';
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Locale-aware number formatting.
 * @param {number|string} n - Number to format
 * @param {object} [options] - Intl.NumberFormat options
 * @returns {string} Formatted number
 */
export function formatNumber(n, options = {}) {
    return Number(n).toLocaleString(undefined, options);
}
