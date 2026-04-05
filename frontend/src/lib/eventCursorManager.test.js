import { describe, it, expect } from 'vitest';
import {
  createCursorFromPosition,
  decodeCursor,
  filterEventsAfterCursor,
} from './eventCursorManager';

describe('Event Cursor Manager', () => {
  const mockEvents = [
    { txId: 'tx-1', timestamp: 100, tipId: '1' },
    { txId: 'tx-2', timestamp: 101, tipId: '2' },
    { txId: 'tx-3', timestamp: 102, tipId: '3' },
  ];

  describe('createCursorFromPosition', () => {
    it('creates cursor from valid position', () => {
      const cursor = createCursorFromPosition(mockEvents, 1);
      expect(cursor).toBeDefined();
      expect(typeof cursor).toBe('string');
    });

    it('returns null for out-of-bounds position', () => {
      expect(createCursorFromPosition(mockEvents, -1)).toBeNull();
      expect(createCursorFromPosition(mockEvents, 3)).toBeNull();
    });

    it('returns null for empty events array', () => {
      expect(createCursorFromPosition([], 0)).toBeNull();
    });

    it('returns null for non-array input', () => {
      expect(createCursorFromPosition(null, 0)).toBeNull();
    });
  });

  describe('decodeCursor', () => {
    it('decodes valid cursor', () => {
      const cursor = createCursorFromPosition(mockEvents, 1);
      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual({
        txId: 'tx-2',
        timestamp: 101,
        tipId: '2',
      });
    });

    it('returns null for invalid cursor', () => {
      expect(decodeCursor('invalid')).toBeNull();
      expect(decodeCursor('')).toBeNull();
      expect(decodeCursor(null)).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(decodeCursor(123)).toBeNull();
      expect(decodeCursor({})).toBeNull();
    });
  });

  describe('filterEventsAfterCursor', () => {
    it('returns all events when cursor is null', () => {
      const result = filterEventsAfterCursor(mockEvents, null);
      expect(result).toHaveLength(3);
    });

    it('filters events after cursor position', () => {
      const cursor = createCursorFromPosition(mockEvents, 0);
      const result = filterEventsAfterCursor(mockEvents, cursor);
      expect(result).toHaveLength(2);
      expect(result[0].tipId).toBe('2');
    });

    it('returns all events if cursor not found', () => {
      const cursor = createCursorFromPosition(mockEvents, 1);
      const differentEvents = [
        { txId: 'tx-new', timestamp: 200, tipId: '10' },
        { txId: 'tx-new-2', timestamp: 201, tipId: '11' },
      ];
      const result = filterEventsAfterCursor(differentEvents, cursor);
      expect(result).toHaveLength(2);
    });

    it('returns empty array if cursor is last event', () => {
      const cursor = createCursorFromPosition(mockEvents, 2);
      const result = filterEventsAfterCursor(mockEvents, cursor);
      expect(result).toHaveLength(0);
    });

    it('filters events after cursor position', () => {
      const cursor = createCursorFromPosition(mockEvents, 0);
      const eventsWithDuplicate = [
        mockEvents[0],
        { txId: 'tx-1-dup', timestamp: 100, tipId: '1' },
        mockEvents[1],
        mockEvents[2],
      ];
      const result = filterEventsAfterCursor(eventsWithDuplicate, cursor);
      // Returns all events after cursor position (index 0)
      expect(result).toHaveLength(3);
      expect(result[0].txId).toBe('tx-1-dup');
      expect(result[1].txId).toBe('tx-2');
    });
  });
});
