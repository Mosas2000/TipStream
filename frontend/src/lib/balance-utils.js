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
