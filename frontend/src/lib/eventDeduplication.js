/**
 * @module lib/eventDeduplication
 *
 * Event deduplication utilities for TipContext.
 *
 * Prevents duplicate events when pagination overlaps or
 * refresh and load-more requests race.
 */

/**
 * Generate a deterministic identifier for an event.
 * Uses tx_id and event index as the unique key.
 *
 * @param {Object} event - The contract event
 * @returns {string} Unique event identifier
 */
export function getEventId(event) {
  if (!event || !event.tx_id) return null;
  const index = event.event_index ?? 0;
  return `${event.tx_id}:${index}`;
}

/**
 * Deduplicate an array of events while preserving order.
 * Keeps the first occurrence of each event ID.
 *
 * @param {Array} events - The event array to deduplicate
 * @returns {Array} Deduplicated event array
 */
export function deduplicateEvents(events) {
  if (!Array.isArray(events)) return [];
  
  const seen = new Set();
  const result = [];
  
  for (const event of events) {
    const id = getEventId(event);
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(event);
    } else if (!id) {
      // Keep events without IDs to avoid data loss
      result.push(event);
    }
  }
  
  return result;
}

/**
 * Merge two event arrays with deduplication.
 * Preserves the order of existing events and appends new ones.
 *
 * @param {Array} existing - Current event array
 * @param {Array} incoming - New events to append
 * @returns {Array} Merged and deduplicated events
 */
export function mergeAndDeduplicateEvents(existing, incoming) {
  if (!Array.isArray(existing)) return deduplicateEvents(incoming);
  if (!Array.isArray(incoming)) return deduplicateEvents(existing);
  
  const combined = [...existing, ...incoming];
  return deduplicateEvents(combined);
}

/**
 * Sort events by block height (descending) and event index (descending).
 * Ensures consistent ordering across all consumers.
 *
 * @param {Array} events - The event array to sort
 * @returns {Array} Sorted event array
 */
export function sortEventsStably(events) {
  if (!Array.isArray(events)) return [];
  
  return [...events].sort((a, b) => {
    // Primary sort: block height (newest first)
    const blockDiff = (b.block_height ?? 0) - (a.block_height ?? 0);
    if (blockDiff !== 0) return blockDiff;
    
    // Secondary sort: event index (newest first)
    return (b.event_index ?? 0) - (a.event_index ?? 0);
  });
}

/**
 * Check if an event appears in an array by ID.
 *
 * @param {Object} event - The event to check
 * @param {Array} events - The event array
 * @returns {boolean} True if event is in array
 */
export function eventExists(event, events) {
  if (!Array.isArray(events)) return false;
  const eventId = getEventId(event);
  if (!eventId) return false;
  return events.some(e => getEventId(e) === eventId);
}
