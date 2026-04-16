/**
 * Shared contract-event fetching and caching layer.
 *
 * Centralises the Stacks API polling that was previously duplicated across
 * Leaderboard, RecentTips, TipHistory, and useNotifications.  A single
 * fetch loop runs at POLL_INTERVAL and distributes parsed events to all
 * consumers via TipContext.
 *
 * @module lib/contractEvents
 */

import { CONTRACT_ADDRESS, CONTRACT_NAME, STACKS_API_BASE } from '../config/contracts';
import { parseTipEvent } from './parseTipEvent';

/** Number of events to request per API call. */
export const PAGE_LIMIT = 50;

/** Maximum number of pages to auto-paginate on the initial fetch. */
export const MAX_INITIAL_PAGES = 10;

/** Polling interval in milliseconds (30 seconds). */
export const POLL_INTERVAL_MS = 30_000;

/**
 * Build the Stacks API URL for contract events.
 *
 * @param {number} limit  - Number of events per page.
 * @param {number} offset - Offset into the full event list.
 * @returns {string} Fully-qualified URL.
 */
function buildEventsUrl(limit, offset) {
    const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
    return `${STACKS_API_BASE}/extended/v1/contract/${contractId}/events?limit=${limit}&offset=${offset}&decode_clarity_values=true`;
}

/**
 * Fetch a single page of raw contract events from the Stacks API.
 *
 * @param {number} offset - Offset into the event list.
 * @returns {Promise<{results: Array, total: number, offset: number}>}
 */
async function fetchEventsPage(offset) {
    const url = buildEventsUrl(PAGE_LIMIT, offset);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Stacks API returned ${res.status}`);
    return res.json();
}

/**
 * Parse raw API results into typed tip event objects.
 *
 * Filters for entries that have a contract_log value, prefers decoded
 * Clarity data when present, and falls back to repr strings when needed.
 * Each parsed event is enriched with the block timestamp and txId from the
 * original API entry.
 *
 * @param {Array} results - Raw results array from the Stacks API.
 * @returns {Array} Parsed tip event objects.
 */
export function parseRawEvents(results) {
    return results
        .filter((e) => e.contract_log?.value)
        .map(e => {
            const value = e.contract_log.value;
            const parsed = parseTipEvent(value.value ?? value.raw_value ?? value.repr ?? value);
            if (!parsed) return null;
            return {
                ...parsed,
                timestamp: e.block_time || null,
                txId: e.tx_id || null,
            };
        })
        .filter(Boolean);
}

/**
 * Fetch a single page of events with parsing and metadata.
 *
 * @param {number} offset - API offset to fetch from.
 * @returns {Promise<{events: Array, offset: number, total: number, hasMore: boolean}>}
 */
export async function fetchEventPage(offset = 0) {
    const data = await fetchEventsPage(offset);
    const events = parseRawEvents(data.results);
    const nextOffset = offset + data.results.length;

    return {
        events,
        offset: nextOffset,
        total: data.total,
        hasMore: nextOffset < data.total,
    };
}

/**
 * Fetch contract events from the Stacks API with auto-pagination.
 *
 * Returns all parsed events and metadata about the total available and
 * the furthest offset reached, so callers can request additional pages.
 *
 * @param {Object}  options
 * @param {number}  [options.startOffset=0]  - API offset to start from.
 * @param {number}  [options.maxPages=MAX_INITIAL_PAGES] - Cap on pages.
 * @returns {Promise<{events: Array, apiOffset: number, total: number, hasMore: boolean}>}
 */
export async function fetchAllContractEvents({ startOffset = 0, maxPages = MAX_INITIAL_PAGES } = {}) {
    let accumulated = [];
    let currentOffset = startOffset;
    let total = 0;

    for (let page = 0; page < maxPages; page++) {
        const data = await fetchEventsPage(currentOffset);
        total = data.total;
        accumulated = accumulated.concat(data.results);
        currentOffset += data.results.length;

        if (currentOffset >= total || data.results.length < PAGE_LIMIT) break;
    }

    const events = parseRawEvents(accumulated);

    return {
        events,
        apiOffset: currentOffset,
        total,
        hasMore: currentOffset < total,
    };
}
