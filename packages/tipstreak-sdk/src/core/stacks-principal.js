/**
 * @module tipstreak-sdk/core/stacks-principal
 *
 * Validation helpers for Stacks addresses and contract principals.
 *
 * Supports mainnet (SP), testnet (ST), and mocknet (SM) prefixes.
 * No external dependencies — safe to use in any JS environment.
 */

const STANDARD_ADDRESS_REGEX = /^(SP|SM|ST)[0-9A-Z]{33,39}$/i;
const CONTRACT_PRINCIPAL_REGEX = /^(SP|SM|ST)[0-9A-Z]{33,39}\.[a-zA-Z][a-zA-Z0-9-_]{0,127}$/i;

/**
 * Check whether a value is a valid Stacks standard address.
 *
 * @param {unknown} value
 * @returns {boolean}
 *
 * @example
 * isValidStacksAddress('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ') // true
 * isValidStacksAddress('not-an-address') // false
 */
export function isValidStacksAddress(value) {
  if (!value || typeof value !== 'string') return false;
  return STANDARD_ADDRESS_REGEX.test(value.trim());
}

/**
 * Check whether a value is a valid Stacks contract principal.
 *
 * @param {unknown} value
 * @returns {boolean}
 *
 * @example
 * isContractPrincipal('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ.my-contract') // true
 */
export function isContractPrincipal(value) {
  if (!value || typeof value !== 'string') return false;
  return CONTRACT_PRINCIPAL_REGEX.test(value.trim());
}

/**
 * Check whether a value is either a valid Stacks address or contract principal.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidStacksPrincipal(value) {
  return isValidStacksAddress(value) || isContractPrincipal(value);
}

/**
 * Truncate a Stacks address for display purposes.
 *
 * @param {string} address - Full Stacks address
 * @param {number} [startChars=6] - Characters to show from the start
 * @param {number} [endChars=4] - Characters to show from the end
 * @returns {string} Truncated address like `SP2J6Z...V9EJ`
 *
 * @example
 * formatAddress('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ') // 'SP2J6Z...V9EJ'
 */
export function formatAddress(address, startChars = 6, endChars = 4) {
  if (!address || address.length <= startChars + endChars + 3) return address ?? '';
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
