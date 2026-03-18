/**
 * @module lib/eventCursorManager
 *
 * Manages stable cursors for paginating events with deduplication guarantees.
 *
 * Cursors are opaque, timestamped identifiers that enable stable pagination
 * across multi-page fetches without relying on offset numbers that can shift
 * when events are inserted or deleted on-chain.
 *
 * A cursor holds a snapshot of the last event's key properties, allowing
 * the next fetch to request "all events after cursor X" with the Stacks API.
 */

/**
 * Create a cursor from an event at a given position.
 *
 * @param {Array<Object>} events - Array of parsed event objects.
 * @param {number} position - Position in the array (0-based).
 * @returns {string|null} Opaque cursor string, or null if position is invalid.
 */
export function createCursorFromPosition(events, position) {
  if (!Array.isArray(events) || position < 0 || position >= events.length) {
    return null;
  }
  const event = events[position];
  if (!event) return null;

  const cursor = {
    txId: event.txId,
    timestamp: event.timestamp,
    tipId: event.tipId,
  };

  return btoa(JSON.stringify(cursor));
}

/**
 * Decode an opaque cursor string into its component values.
 *
 * @param {string} cursor - The cursor string.
 * @returns {Object|null} Decoded cursor object, or null if decode fails.
 */
export function decodeCursor(cursor) {
  if (typeof cursor !== 'string') return null;

  try {
    const decoded = JSON.parse(atob(cursor));
    if (decoded && typeof decoded === 'object') {
      return decoded;
    }
  } catch (err) {
    // Silent fail for invalid cursor format
  }

  return null;
}

/**
 * Filter and deduplicate events after a given cursor position.
 *
 * Compares event properties to find the cursor position, then returns
 * only events after that position.
 *
 * @param {Array<Object>} events - Array of parsed events.
 * @param {string} cursor - The cursor to resume after.
 * @returns {Array<Object>} Deduplicated events after cursor.
 */
export function filterEventsAfterCursor(events, cursor) {
  if (!cursor) return events;

  const decoded = decodeCursor(cursor);
  if (!decoded) return events;

  let foundIndex = -1;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (
      event.txId === decoded.txId &&
      event.timestamp === decoded.timestamp &&
      event.tipId === decoded.tipId
    ) {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex === -1) {
    return events;
  }

  return events.slice(foundIndex + 1);
}
