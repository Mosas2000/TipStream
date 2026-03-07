import { fetchCallReadOnlyFunction, cvToJSON, uintCV } from '@stacks/transactions';
import { network } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '../config/contracts';

/**
 * Fetch full tip details (including message) from the contract's tips map.
 *
 * The contract's print events do not include the message field, so this
 * function calls the read-only `get-tip` function to retrieve the full
 * tip record stored on-chain.
 *
 * @param {number|string} tipId - The tip ID to look up.
 * @returns {Promise<Object|null>} The tip details or null if not found.
 */
export async function fetchTipDetail(tipId) {
    try {
        const result = await fetchCallReadOnlyFunction({
            network,
            contractAddress: CONTRACT_ADDRESS,
            contractName: CONTRACT_NAME,
            functionName: 'get-tip',
            functionArgs: [uintCV(Number(tipId))],
            senderAddress: CONTRACT_ADDRESS,
        });

        const parsed = cvToJSON(result);
        if (!parsed || parsed.type === 'none' || !parsed.value) {
            return null;
        }

        return parsed.value;
    } catch (err) {
        console.error(`Failed to fetch tip #${tipId}:`, err.message || err);
        return null;
    }
}
