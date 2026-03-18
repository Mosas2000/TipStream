/**
 * @module lib/eventBatchOperations
 *
 * Utilities for performing batch operations on events.
 *
 * Handles common patterns like bulk enrichment coordination,
 * batch filtering, and deduplication across multiple sources.
 */

/**
 * Deduplicate events from multiple sources by tipId.
 *
 * @param {...Array} eventArrays - Multiple event arrays to merge.
 * @returns {Array} Deduplicated events maintaining order.
 */
export function deduplicateEventsByTipId(...eventArrays) {
  const seen = new Set();
  const result = [];

  for (const events of eventArrays) {
    if (!Array.isArray(events)) continue;
    for (const event of events) {
      const key = event.tipId || event.txId;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(event);
      }
    }
  }

  return result;
}

/**
 * Partition events into groups for batch processing.
 *
 * @param {Array} events - Events to partition.
 * @param {number} batchSize - Size of each batch.
 * @returns {Array<Array>} Array of batches.
 */
export function batchEvents(events, batchSize = 10) {
  if (!Array.isArray(events) || batchSize <= 0) {
    return [];
  }

  const batches = [];
  for (let i = 0; i < events.length; i += batchSize) {
    batches.push(events.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Group events by a given property.
 *
 * @param {Array} events - Events to group.
 * @param {string} property - Property name to group by.
 * @returns {Object} Object with groups keyed by property value.
 */
export function groupEventsByProperty(events, property) {
  return events.reduce((groups, event) => {
    const key = event[property] || 'unknown';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(event);
    return groups;
  }, {});
}

/**
 * Filter events to only include those of a specific type.
 *
 * @param {Array} events - Events to filter.
 * @param {string} eventType - The event type to keep.
 * @returns {Array} Filtered events.
 */
export function filterEventsByType(events, eventType) {
  return events.filter(e => e.event === eventType);
}

/**
 * Extract unique senders and recipients from events.
 *
 * @param {Array} events - Events to extract from.
 * @returns {Object} { senders: Set, recipients: Set }
 */
export function extractParticipants(events) {
  const senders = new Set();
  const recipients = new Set();

  for (const event of events) {
    if (event.sender) senders.add(event.sender);
    if (event.recipient) recipients.add(event.recipient);
  }

  return { senders, recipients };
}

/**
 * Calculate summary statistics for a set of events.
 *
 * @param {Array} events - Events to summarize.
 * @returns {Object} Statistics including total, minimum, maximum, average amount.
 */
export function calculateEventStats(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return {
      count: 0,
      totalAmount: 0,
      minAmount: 0,
      maxAmount: 0,
      averageAmount: 0,
    };
  }

  const amounts = events
    .map(e => parseInt(e.amount || 0))
    .filter(a => !isNaN(a));

  const totalAmount = amounts.reduce((sum, a) => sum + a, 0);

  return {
    count: events.length,
    totalAmount,
    minAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
    maxAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
    averageAmount: amounts.length > 0 ? Math.floor(totalAmount / amounts.length) : 0,
  };
}
