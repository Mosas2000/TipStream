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
    return `${STACKS_API_BASE}/extended/v1/contract/${contractId}/events?limit=${limit}&offset=${offset}`;
}
