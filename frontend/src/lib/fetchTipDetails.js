/**
 * @module fetchTipDetails
 *
 * Utilities for retrieving full tip records (including the message field)
 * from the TipStream smart-contract's on-chain `tips` map.
 *
 * The contract's print events deliberately omit `message` to keep event
 * payloads small.  These helpers call the read-only `get-tip` function to
 * retrieve the full record and expose a caching layer so repeated renders
 * do not trigger duplicate API requests.
 *
 * Cache entries expire after CACHE_TTL_MS milliseconds (default 5 minutes).
 * Use clearTipCache() only for user-initiated hard refreshes, not in
 * automated polling loops.
 *
 * Exports:
 *   fetchTipDetail(tipId)     - Fetch a single tip record (cached).
 *   fetchTipMessages(tipIds)  - Batch-fetch messages for many tips at once.
 *   clearTipCache()           - Evict all cache entries (manual refresh only).
 *   getCacheSize()            - Return the number of cached entries.
 *   CACHE_TTL_MS              - TTL for cached tip records in milliseconds.
 */

import { fetchCallReadOnlyFunction, cvToJSON, uintCV } from '@stacks/transactions';
import { network } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '../config/contracts';

/**
 * Time-to-live for cached tip records, in milliseconds.
 * Entries older than this threshold are treated as stale and re-fetched
 * on the next access.  Five minutes balances freshness with API call volume.
 */
export const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * In-memory cache for tip details to avoid redundant API calls.
 * Keys are tip IDs (as strings).
 * Values are { value: <tip detail object>, expiresAt: <unix ms timestamp> }.
 */
const tipCache = new Map();

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
    const cacheKey = String(tipId);
    const cached = tipCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.value;
    }

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

        tipCache.set(cacheKey, { value: parsed.value, expiresAt: Date.now() + CACHE_TTL_MS });
        return parsed.value;
    } catch (err) {
        console.error(`Failed to fetch tip #${tipId}:`, err.message || err);
        return null;
    }
}

/**
 * Maximum number of concurrent read-only calls when fetching a batch of tips.
 * Keeps Hiro API rate-limit pressure low while still being faster than serial.
 */
const CONCURRENCY_LIMIT = 5;

/**
 * Fetch messages for a batch of tip IDs.
 *
 * Calls fetchTipDetail for each tip ID with bounded concurrency so the
 * Stacks API is not overwhelmed.  Returns a Map of tipId -> message string.
 * Tips that fail to load or have no message are silently skipped.
 *
 * @param {Array<number|string>} tipIds - The tip IDs to look up.
 * @returns {Promise<Map<string, string>>} Map from tipId to message text.
 */
export async function fetchTipMessages(tipIds) {
    const messages = new Map();
    const queue = [...tipIds];

    async function worker() {
        while (queue.length > 0) {
            const id = queue.shift();
            const detail = await fetchTipDetail(id);
            if (detail?.message?.value) {
                messages.set(String(id), detail.message.value);
            }
        }
    }

    const workers = Array.from(
        { length: Math.min(CONCURRENCY_LIMIT, tipIds.length) },
        () => worker(),
    );
    await Promise.all(workers);

    return messages;
}

/**
 * Clear the in-memory tip detail cache.
 *
 * Useful when the user manually refreshes or when new tips are submitted
 * and the UI should re-fetch updated records from the chain.
 */
export function clearTipCache() {
    tipCache.clear();
}
