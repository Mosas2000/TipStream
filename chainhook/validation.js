/**
 * Input validation helpers for the chainhook server.
 */

/** Maximum allowed request body size in bytes (10 MB). */
export const MAX_BODY_SIZE = 10 * 1024 * 1024;

/** Regex matching valid Stacks addresses (SP/SM/ST prefix + 33-39 alphanumeric chars). */
export const STACKS_ADDRESS_RE = /^(SP|SM|ST)[0-9A-Z]{33,39}$/i;

/**
 * Check whether a value is a valid Stacks address string.
 * @param {unknown} address - The value to validate.
 * @returns {boolean}
 */
export function isValidStacksAddress(address) {
  return typeof address === "string" && STACKS_ADDRESS_RE.test(address);
}
