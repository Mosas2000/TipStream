/**
 * @module tipstreak-sdk/core/balance-utils
 *
 * Pure utility functions for converting between micro-STX (on-chain integer
 * unit) and STX (human-readable decimal unit).
 *
 * All functions accept `string`, `number`, and `bigint` inputs so they work
 * seamlessly with raw API responses and numeric literals.
 *
 * 1 STX = 1,000,000 micro-STX
 */

/** Number of micro-STX in one STX. */
export const MICRO_STX = 1_000_000;

/** BigInt variant used for precision-safe integer operations. */
const MICRO_STX_BIGINT = 1_000_000n;

/**
 * Convert a micro-STX value into a normalized non-negative bigint.
 *
 * Returns `null` for invalid, fractional, or negative values.
 *
 * @param {string|number|bigint|null|undefined} value
 * @returns {bigint|null}
 */
export function toMicroStxBigInt(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'bigint') {
    return value >= 0n ? value : null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) return null;
    return BigInt(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    return BigInt(trimmed);
  }

  return null;
}

/**
 * Check if a balance (micro-STX) can cover a required amount (micro-STX).
 *
 * Uses BigInt internally to avoid Number precision issues.
 *
 * @param {string|number|bigint|null|undefined} balanceMicroStx
 * @param {string|number|bigint|null|undefined} requiredMicroStx
 * @returns {boolean}
 *
 * @example
 * hasSufficientMicroStx('5000000', 1000000) // true  (5 STX >= 1 STX)
 * hasSufficientMicroStx('500000', 1000000)  // false (0.5 STX < 1 STX)
 */
export function hasSufficientMicroStx(balanceMicroStx, requiredMicroStx) {
  const balance = toMicroStxBigInt(balanceMicroStx);
  const required = toMicroStxBigInt(requiredMicroStx);
  if (balance === null || required === null) return false;
  return balance >= required;
}

/**
 * Convert micro-STX to a decimal STX string with fixed precision.
 *
 * @param {string|number|bigint|null|undefined} microStx
 * @param {number} [precision=6]
 * @returns {string|null}
 *
 * @example
 * microToStxDecimalString(1500000) // '1.500000'
 * microToStxDecimalString(1500000, 2) // '1.50'
 */
export function microToStxDecimalString(microStx, precision = 6) {
  const normalized = toMicroStxBigInt(microStx);
  if (normalized === null) return null;

  const whole = normalized / MICRO_STX_BIGINT;
  const fractionalRaw = normalized % MICRO_STX_BIGINT;
  const fullFraction = fractionalRaw.toString().padStart(6, '0');
  const clippedFraction = fullFraction.slice(0, Math.max(0, Math.min(6, precision)));

  if (precision <= 0) return whole.toString();
  return `${whole.toString()}.${clippedFraction.padEnd(precision, '0')}`;
}

/**
 * Parse a balance value into a finite number.
 *
 * Returns `null` for NaN, Infinity, null, undefined, or empty string.
 *
 * @param {string|number|bigint|null|undefined} value
 * @returns {number|null}
 */
export function parseBalance(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Convert micro-STX to STX as a number.
 *
 * @param {string|number|bigint|null|undefined} microStx
 * @returns {number|null}
 *
 * @example
 * microToStx(1000000) // 1
 * microToStx('2500000') // 2.5
 */
export function microToStx(microStx) {
  const parsed = parseBalance(microStx);
  return parsed !== null ? parsed / MICRO_STX : null;
}

/**
 * Convert STX to micro-STX (integer, floored).
 *
 * @param {string|number|null|undefined} stx
 * @returns {number|null}
 *
 * @example
 * stxToMicro(1.5) // 1500000
 * stxToMicro('2') // 2000000
 */
export function stxToMicro(stx) {
  if (stx === null || stx === undefined || stx === '') return null;
  const n = parseFloat(String(stx));
  return Number.isFinite(n) ? Math.floor(n * MICRO_STX) : null;
}

/**
 * Format a micro-STX balance for display as a locale-aware STX string.
 *
 * @param {string|number|bigint|null|undefined} microStx
 * @param {object} [options]
 * @param {number} [options.minDecimals=2]
 * @param {number} [options.maxDecimals=6]
 * @param {boolean} [options.suffix=true] - Append " STX" suffix
 * @param {string} [options.fallback='--'] - Value when input is null/invalid
 * @returns {string}
 *
 * @example
 * formatBalance(1234500000) // '1,234.50 STX'
 * formatBalance(null)       // '--'
 */
export function formatBalance(microStx, options = {}) {
  const {
    minDecimals = 2,
    maxDecimals = 6,
    suffix = true,
    fallback = '--',
  } = options;

  const stxDecimal = microToStxDecimalString(microStx, maxDecimals);
  if (stxDecimal === null) return fallback;

  const stx = Number(stxDecimal);
  if (!Number.isFinite(stx)) {
    const plain = maxDecimals > 0 ? stxDecimal.replace(/\.0+$/, '') : stxDecimal;
    return suffix ? `${plain} STX` : plain;
  }

  const formatted = stx.toLocaleString(undefined, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });

  return suffix ? `${formatted} STX` : formatted;
}

/**
 * Check whether a value is a valid, non-negative balance.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidBalance(value) {
  const n = parseBalance(value);
  return n !== null && n >= 0;
}
