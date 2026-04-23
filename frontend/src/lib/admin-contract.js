/**
 * Admin contract interaction helpers for timelocked operations.
 *
 * These functions exclusively use the timelocked propose-wait-execute
 * path for pause and fee changes. The direct bypass functions
 * (set-paused, set-fee-basis-points) are intentionally omitted to
 * enforce the 144-block timelock on all admin actions.
 */

import { CONTRACT_ADDRESS, CONTRACT_NAME, STACKS_API_BASE, FN_GET_CURRENT_FEE_BASIS_POINTS } from '../config/contracts';

/**
 * Fetch the current block height from the Stacks API.
 *
 * @returns {Promise<number>} Current block height
 */
export async function fetchCurrentBlockHeight() {
    const response = await fetch(`${STACKS_API_BASE}/v2/info`);
    if (!response.ok) {
        throw new Error(`Failed to fetch block info: ${response.statusText}`);
    }
    const data = await response.json();
    return data.stacks_tip_height;
}

/**
 * Fetch a read-only contract value.
 *
 * @param {string} functionName - The read-only function name
 * @param {Array} args - Clarity function arguments (hex-encoded)
 * @returns {Promise<object>} Decoded contract response
 */
async function callReadOnly(functionName, args = []) {
    const url = `${STACKS_API_BASE}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${functionName}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender: CONTRACT_ADDRESS,
            arguments: args,
        }),
    });

    if (!response.ok) {
        throw new Error(`Read-only call failed: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch the current contract pause state and any pending changes.
 *
 * @returns {Promise<{ isPaused: boolean, pendingPause: boolean|null, effectiveHeight: number }>}
 */
export async function fetchPauseState() {
    // Fetch both pending and current state in parallel for consistency
    const [pendingData, currentData] = await Promise.all([
        callReadOnly('get-pending-pause-change'),
        callReadOnly('is-paused')
    ]);

    const result = parseClarityValue(pendingData.result);
    const isPaused = parseClarityValue(currentData.result);

    return {
        isPaused: !!isPaused,
        pendingPause: result['pending-pause'],
        effectiveHeight: result['effective-height'] || 0,
    };
}

/**
 * Fetch the current fee basis points and any pending fee change.
 *
 * @returns {Promise<{ currentFeeBasisPoints: number, pendingFee: number|null, effectiveHeight: number }>}
 */
export async function fetchFeeState() {
    // Fetch both pending and current state in parallel for consistency
    const [pendingData, currentFee] = await Promise.all([
        callReadOnly('get-pending-fee-change'),
        fetchCurrentFee()
    ]);

    const result = parseClarityValue(pendingData.result);

    return {
        currentFeeBasisPoints: currentFee,
        pendingFee: result['pending-fee'],
        effectiveHeight: result['effective-height'] || 0,
    };
}

/**
 * Fetch the contract owner address.
 *
 * @returns {Promise<string>} Contract owner principal
 */
export async function fetchContractOwner() {
    const data = await callReadOnly('get-contract-owner');
    const result = parseClarityValue(data.result);
    return result;
}

/**
 * Fetch the authorized multisig contract address.
 *
 * @returns {Promise<string|null>} Multisig principal or null
 */
export async function fetchMultisig() {
    const data = await callReadOnly('get-multisig');
    const result = parseClarityValue(data.result);
    return result;
}

/**
 * Fetch the current fee basis points from the contract.
 *
 * @returns {Promise<number>} Current fee in basis points
 */
export async function fetchCurrentFee() {
    const data = await callReadOnly(FN_GET_CURRENT_FEE_BASIS_POINTS);
    const result = parseClarityValue(data.result);
    return typeof result === 'number' ? result : 0;
}

/**
 * Parse a hex-encoded Clarity value into a JavaScript value.
 *
 * This is a simplified parser for the values returned by the
 * read-only API. It handles common types: uint, bool, optional,
 * tuple, principal, and response (ok/err).
 *
 * @param {string} hex - Hex-encoded Clarity value
 * @returns {*} Parsed JavaScript value
 */
export function parseClarityValue(hex) {
    if (!hex || typeof hex !== 'string') return null;

    // Remove 0x prefix if present
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;

    try {
        return decodeClarityHex(clean);
    } catch {
        return null;
    }
}

/**
 * Decode a Clarity hex value recursively.
 *
 * @param {string} hex - Hex string without 0x prefix
 * @returns {*} Decoded value
 */
function decodeClarityHex(hex) {
    if (!hex || hex.length < 2) return null;

    const typeId = parseInt(hex.slice(0, 2), 16);

    switch (typeId) {
        case 0x00: // int
            return parseInt(hex.slice(2, 34), 16);
        case 0x01: { // uint
            const value = hex.slice(2, 34);
            return parseInt(value, 16);
        }
        case 0x03: // true
            return true;
        case 0x04: // false
            return false;
        case 0x09: // none
            return null;
        case 0x0a: // some
            return decodeClarityHex(hex.slice(2));
        case 0x07: { // ok
            return decodeClarityHex(hex.slice(2));
        }
        case 0x08: { // err
            return null;
        }
        case 0x05: // standard principal
            return hex.slice(0, 44); // 1 byte type + 1 byte version + 20 bytes hash = 22 bytes = 44 hex chars
        case 0x06: // contract principal
            return hex; // Complex, just return hex for now
        case 0x0c: { // tuple
            const numFields = parseInt(hex.slice(2, 10), 16);
            const result = {};
            let offset = 10;

            for (let i = 0; i < numFields; i++) {
                // Field name length
                const nameLen = parseInt(hex.slice(offset, offset + 2), 16);
                offset += 2;

                // Field name
                const nameHex = hex.slice(offset, offset + nameLen * 2);
                const name = hexToString(nameHex);
                offset += nameLen * 2;

                // Field value - we need to know the size, which depends on type
                const fieldHex = hex.slice(offset);
                const { value, consumed } = decodeClarityHexWithSize(fieldHex);
                result[name] = value;
                offset += consumed;
            }

            return result;
        }
        default:
            return null;
    }
}

/**
 * Decode a Clarity hex value and return the number of hex chars consumed.
 *
 * @param {string} hex - Hex string
 * @returns {{ value: *, consumed: number }}
 */
function decodeClarityHexWithSize(hex) {
    if (!hex || hex.length < 2) return { value: null, consumed: 0 };

    const typeId = parseInt(hex.slice(0, 2), 16);

    switch (typeId) {
        case 0x00: // int
            return { value: parseInt(hex.slice(2, 34), 16), consumed: 34 };
        case 0x01: // uint
            return { value: parseInt(hex.slice(2, 34), 16), consumed: 34 };
        case 0x03: // true
            return { value: true, consumed: 2 };
        case 0x04: // false
            return { value: false, consumed: 2 };
        case 0x09: // none
            return { value: null, consumed: 2 };
        case 0x0a: { // some
            const inner = decodeClarityHexWithSize(hex.slice(2));
            return { value: inner.value, consumed: 2 + inner.consumed };
        }
        case 0x07: { // ok
            const inner = decodeClarityHexWithSize(hex.slice(2));
            return { value: inner.value, consumed: 2 + inner.consumed };
        }
        case 0x08: { // err
            const inner = decodeClarityHexWithSize(hex.slice(2));
            return { value: null, consumed: 2 + inner.consumed };
        }
        default:
            return { value: null, consumed: 2 };
    }
}

/**
 * Convert a hex string to an ASCII string.
 *
 * @param {string} hex - Hex string
 * @returns {string} ASCII string
 */
function hexToString(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    return str;
}
