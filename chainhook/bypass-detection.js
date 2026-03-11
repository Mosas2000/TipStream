/**
 * Timelock bypass detection for chainhook events.
 *
 * Monitors contract events for direct bypass function calls
 * (set-paused, set-fee-basis-points) that circumvent the
 * 144-block timelock mechanism. Logs warnings when detected.
 */

/**
 * Admin events that indicate a direct bypass was used.
 * These events are emitted by functions that skip the timelock.
 */
const BYPASS_EVENTS = new Set([
    'contract-paused',
    'fee-updated',
]);

/**
 * Admin events that indicate the timelocked path was used.
 * These are the expected events for proper admin operations.
 */
const TIMELOCKED_EVENTS = new Set([
    'pause-change-proposed',
    'pause-change-executed',
    'fee-change-proposed',
    'fee-change-executed',
    'fee-change-cancelled',
]);

/**
 * Check if an event represents a direct bypass of the timelock.
 *
 * A bypass is detected when a contract-paused or fee-updated event
 * occurs without a corresponding proposal event in the recent history.
 *
 * @param {object} event - The contract event
 * @param {Array} recentEvents - Recent event history for context
 * @returns {{ isBypass: boolean, eventType: string, detail: string }}
 */
export function detectBypass(event, recentEvents = []) {
    const value = event?.event;
    if (!value || typeof value !== 'object') {
        return { isBypass: false, eventType: '', detail: '' };
    }

    const eventType = value.event;

    if (!BYPASS_EVENTS.has(eventType)) {
        return { isBypass: false, eventType, detail: '' };
    }

    // Check if there was a corresponding proposal in recent history
    const hasProposal = recentEvents.some((e) => {
        const v = e?.event;
        if (!v || typeof v !== 'object') return false;

        if (eventType === 'contract-paused') {
            return v.event === 'pause-change-executed';
        }
        if (eventType === 'fee-updated') {
            return v.event === 'fee-change-executed';
        }
        return false;
    });

    if (hasProposal) {
        // The timelocked path was used - this is not a bypass
        return { isBypass: false, eventType, detail: 'Timelocked path confirmed' };
    }

    const detail = eventType === 'contract-paused'
        ? `Direct set-paused detected: paused=${value.paused}`
        : `Direct set-fee-basis-points detected: new-fee=${value['new-fee']}`;

    return { isBypass: true, eventType, detail };
}

/**
 * Parse an admin event from the chainhook payload.
 *
 * @param {object} event - Raw chainhook event
 * @returns {object|null} Parsed admin event or null
 */
export function parseAdminEvent(event) {
    const val = event?.event;
    if (!val || typeof val !== 'object') return null;

    const eventType = val.event;
    if (!BYPASS_EVENTS.has(eventType) && !TIMELOCKED_EVENTS.has(eventType)) {
        return null;
    }

    return {
        eventType,
        txId: event.txId,
        blockHeight: event.blockHeight,
        timestamp: event.timestamp,
        data: val,
        isBypass: BYPASS_EVENTS.has(eventType),
        isTimelocked: TIMELOCKED_EVENTS.has(eventType),
    };
}

/**
 * Format a bypass detection alert for logging.
 *
 * @param {object} detection - Detection result from detectBypass
 * @param {object} event - The original event
 * @returns {string} Formatted alert message
 */
export function formatBypassAlert(detection, event) {
    if (!detection.isBypass) return '';

    const lines = [
        '[SECURITY ALERT] Timelock bypass detected',
        `  Event: ${detection.eventType}`,
        `  Detail: ${detection.detail}`,
        `  TX: ${event?.txId || 'unknown'}`,
        `  Block: ${event?.blockHeight || 'unknown'}`,
        `  Time: ${new Date(event?.timestamp || Date.now()).toISOString()}`,
    ];

    return lines.join('\n');
}
