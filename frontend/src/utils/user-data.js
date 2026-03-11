/**
 * @module utils/user-data
 * @description Pure helper functions for extracting data from the user
 * data object returned by `authenticate()` and `userSession.loadUserData()`.
 *
 * These are intentionally kept in a separate module from `stacks.js`
 * so they can be tested without importing the Stacks SDK, which
 * requires browser globals.
 *
 * The expected user data shape is:
 * ```
 * {
 *   profile: {
 *     stxAddress: { mainnet: string, testnet: string }
 *   }
 * }
 * ```
 *
 * @see module:utils/stacks - Re-exports these helpers alongside SDK functions.
 */

/**
 * Extract the mainnet STX address from a user data object.
 *
 * Safely navigates `profile.stxAddress.mainnet` and returns `null`
 * if any intermediate property is missing.
 *
 * @param {object|null|undefined} data - User data from authenticate() or loadUserData().
 * @returns {string|null} The mainnet Stacks address, or null.
 */
export function getMainnetAddress(data) {
  return data?.profile?.stxAddress?.mainnet ?? null;
}

/**
 * Extract the testnet STX address from a user data object.
 *
 * @param {object|null|undefined} data - User data from authenticate() or loadUserData().
 * @returns {string|null} The testnet Stacks address, or null.
 */
export function getTestnetAddress(data) {
  return data?.profile?.stxAddress?.testnet ?? null;
}

/**
 * Validate that a user data object has the expected shape.
 *
 * Returns `true` only if `data.profile.stxAddress.mainnet` is a
 * non-empty string. Does not throw on any input.
 *
 * @param {unknown} data - Value to check.
 * @returns {boolean}
 */
export function isValidUserData(data) {
  const address = getMainnetAddress(data);
  return typeof address === 'string' && address.length > 0;
}

/**
 * Return either the mainnet or testnet address based on a network name.
 *
 * Accepts `'mainnet'`, `'testnet'`, or `'devnet'`. Devnet is treated
 * as testnet. Any other value falls back to mainnet.
 *
 * @param {object|null|undefined} data - User data object.
 * @param {'mainnet'|'testnet'|'devnet'} [networkName='mainnet'] - Target network.
 * @returns {string|null} The corresponding STX address, or null.
 */
export function getNetworkAddress(data, networkName = 'mainnet') {
  if (networkName === 'testnet' || networkName === 'devnet') {
    return getTestnetAddress(data);
  }
  return getMainnetAddress(data);
}
