/**
 * Event deduplication for idempotent webhook ingest.
 * 
 * Generates stable keys from event metadata to detect and filter duplicate
 * webhook deliveries caused by network retries or chainhook restarts.
 */

/**
 * Generate a stable key for an event based on immutable on-chain metadata.
 * Uses txId, block height, contract, and event type to ensure uniqueness.
 * 
 * @param {object} event - Raw event from chainhook payload
 * @returns {string} Stable deduplication key
 */
export function generateEventKey(event) {
  const parts = [
    event.txId,
    String(event.blockHeight),
    event.contract,
    event.event?.event || 'unknown'
  ];
  return parts.join('::');
}

/**
 * Filter duplicate events from a batch using an existing event store.
 * Compares new events against known keys from stored events.
 * 
 * @param {Array<object>} newEvents - Candidate events to deduplicate
 * @param {Array<object>} storedEvents - Existing events in the store
 * @returns {object} Result with deduplicated events and duplicate count
 */
export function deduplicateEvents(newEvents, storedEvents) {
  const existingKeys = new Set(storedEvents.map(generateEventKey));
  const deduplicated = [];
  let duplicateCount = 0;

  for (const event of newEvents) {
    const key = generateEventKey(event);
    if (existingKeys.has(key)) {
      duplicateCount++;
    } else {
      deduplicated.push(event);
      existingKeys.add(key);
    }
  }

  return { deduplicated, duplicateCount };
}
