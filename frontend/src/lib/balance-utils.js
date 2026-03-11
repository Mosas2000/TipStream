/**
 * @module lib/balance-utils
 * @description Pure utility functions for converting between micro-STX
 * (the on-chain integer unit) and STX (the human-readable decimal unit).
 *
 * All functions accept both `string` and `number` inputs so they work
 * seamlessly with the raw API string stored by `useBalance` and with
 * numeric literals used elsewhere in the frontend.
 *
 * 1 STX = 1,000,000 micro-STX.
 */

/** Number of micro-STX in one STX. */
export const MICRO_STX = 1_000_000;

/**
 * Parse a balance value (string, number, or BigInt) into a finite number.
 *
 * Returns `null` for any input that cannot be safely represented as a
 * JavaScript number (NaN, Infinity, null, undefined, empty string).
 *
 * @param {string|number|bigint|null|undefined} value - Raw balance value.
 * @returns {number|null} Parsed numeric value in micro-STX, or null.
 */
export function parseBalance(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Convert a micro-STX value to STX.
 *
 * Accepts the same input types as `parseBalance`. Returns `null` when
 * the input cannot be parsed.
 *
 * @param {string|number|bigint|null|undefined} microStx - Amount in micro-STX.
 * @returns {number|null} Amount in STX, or null.
 */
export function microToStx(microStx) {
  const parsed = parseBalance(microStx);
  return parsed !== null ? parsed / MICRO_STX : null;
}

/**
 * Convert an STX value to micro-STX (integer, floored).
 *
 * Accepts string or number. Returns `null` if the input is not a valid
 * finite number after parsing.
 *
 * @param {string|number|null|undefined} stx - Amount in STX.
 * @returns {number|null} Integer amount in micro-STX, or null.
 */
export function stxToMicro(stx) {
  if (stx === null || stx === undefined || stx === '') return null;
  const n = parseFloat(stx);
  return Number.isFinite(n) ? Math.floor(n * MICRO_STX) : null;
}

/**
 * Format a micro-STX balance for display as a locale-aware STX string.
 *
 * Returns a human-readable string like `"1,234.50 STX"`. If the input
 * cannot be parsed, returns the provided fallback (default `'--'`).
 *
 * @param {string|number|bigint|null|undefined} microStx - Balance in micro-STX.
 * @param {object} [options]
 * @param {number} [options.minDecimals=2] - Minimum fraction digits.
 * @param {number} [options.maxDecimals=6] - Maximum fraction digits.
 * @param {boolean} [options.suffix=true] - Append " STX" suffix.
 * @param {string} [options.fallback='--'] - Value when balance is null/invalid.
 * @returns {string}
 */
export function formatBalance(microStx, options = {}) {
  const {
    minDecimals = 2,
    maxDecimals = 6,
    suffix = true,
    fallback = '--',
  } = options;

  const stx = microToStx(microStx);
  if (stx === null) return fallback;

  const formatted = stx.toLocaleString(undefined, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });

  return suffix ? `${formatted} STX` : formatted;
}

/**
 * Check whether a value can be safely used as a balance.
 *
 * Returns `true` only if the value parses to a finite, non-negative number.
 *
 * @param {unknown} value - Value to check.
 * @returns {boolean}
 */
export function isValidBalance(value) {
  const n = parseBalance(value);
  return n !== null && n >= 0;
}
