import { describe, it, expect } from 'vitest';
import {
  getEventId,
  deduplicateEvents,
  mergeAndDeduplicateEvents,
  sortEventsStably,
  eventExists,
} from './eventDeduplication.js';

describe('eventDeduplication', () => {
  const mockEvent1 = { tx_id: 'tx1', event_index: 0, block_height: 100 };
  const mockEvent2 = { tx_id: 'tx2', event_index: 0, block_height: 99 };
  const mockEvent1Dup = { tx_id: 'tx1', event_index: 0, block_height: 100, amount: 123 };
  const mockEvent3 = { tx_id: 'tx3', event_index: 1, block_height: 98 };

  describe('getEventId', () => {
    it('generates unique ID from tx_id and event_index', () => {
      expect(getEventId(mockEvent1)).toBe('tx1:0');
      expect(getEventId(mockEvent2)).toBe('tx2:0');
      expect(getEventId(mockEvent3)).toBe('tx3:1');
    });

    it('returns null for events without tx_id', () => {
      expect(getEventId({})).toBeNull();
      expect(getEventId(null)).toBeNull();
      expect(getEventId(undefined)).toBeNull();
    });

    it('defaults event_index to 0', () => {
      const event = { tx_id: 'tx1' };
      expect(getEventId(event)).toBe('tx1:0');
    });
  });

  describe('deduplicateEvents', () => {
    it('removes duplicates while preserving order', () => {
      const events = [mockEvent1, mockEvent2, mockEvent1Dup, mockEvent3];
      const result = deduplicateEvents(events);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockEvent1);
      expect(result[1]).toEqual(mockEvent2);
      expect(result[2]).toEqual(mockEvent3);
    });

    it('handles empty array', () => {
      expect(deduplicateEvents([])).toEqual([]);
    });

    it('handles null or non-array input', () => {
      expect(deduplicateEvents(null)).toEqual([]);
      expect(deduplicateEvents(undefined)).toEqual([]);
      expect(deduplicateEvents('not an array')).toEqual([]);
    });

    it('preserves events without tx_id', () => {
      const events = [mockEvent1, { data: 'no tx_id' }, mockEvent2];
      const result = deduplicateEvents(events);
      expect(result).toHaveLength(3);
      expect(result[1]).toEqual({ data: 'no tx_id' });
    });
  });

  describe('mergeAndDeduplicateEvents', () => {
    it('merges and deduplicates two arrays', () => {
      const existing = [mockEvent1, mockEvent2];
      const incoming = [mockEvent1Dup, mockEvent3];
      const result = mergeAndDeduplicateEvents(existing, incoming);
      expect(result).toHaveLength(3);
      expect(result).toContainEqual(mockEvent1);
      expect(result).toContainEqual(mockEvent2);
      expect(result).toContainEqual(mockEvent3);
    });

    it('preserves order of existing events', () => {
      const existing = [mockEvent2, mockEvent1];
      const incoming = [mockEvent3];
      const result = mergeAndDeduplicateEvents(existing, incoming);
      expect(result[0]).toEqual(mockEvent2);
      expect(result[1]).toEqual(mockEvent1);
      expect(result[2]).toEqual(mockEvent3);
    });

    it('handles null existing array', () => {
      const result = mergeAndDeduplicateEvents(null, [mockEvent1]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockEvent1);
    });

    it('handles null incoming array', () => {
      const result = mergeAndDeduplicateEvents([mockEvent1], null);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockEvent1);
    });
  });

  describe('sortEventsStably', () => {
    it('sorts by block height descending', () => {
      const events = [mockEvent3, mockEvent1, mockEvent2];
      const result = sortEventsStably(events);
      expect(result[0].block_height).toBe(100);
      expect(result[1].block_height).toBe(99);
      expect(result[2].block_height).toBe(98);
    });

    it('sorts by event_index when block heights are equal', () => {
      const e1 = { tx_id: 'tx1', event_index: 0, block_height: 100 };
      const e2 = { tx_id: 'tx2', event_index: 2, block_height: 100 };
      const e3 = { tx_id: 'tx3', event_index: 1, block_height: 100 };
      const result = sortEventsStably([e1, e2, e3]);
      expect(result[0].event_index).toBe(2);
      expect(result[1].event_index).toBe(1);
      expect(result[2].event_index).toBe(0);
    });

    it('handles missing block_height or event_index', () => {
      const e1 = { tx_id: 'tx1' };
      const e2 = { tx_id: 'tx2', block_height: 100 };
      const result = sortEventsStably([e1, e2]);
      expect(result[0].block_height).toBe(100);
      expect(result[1].block_height).toBeUndefined();
    });

    it('does not mutate original array', () => {
      const original = [mockEvent3, mockEvent1, mockEvent2];
      const originalOrder = [...original];
      sortEventsStably(original);
      expect(original).toEqual(originalOrder);
    });
  });

  describe('eventExists', () => {
    it('detects existing event by ID', () => {
      const events = [mockEvent1, mockEvent2];
      expect(eventExists(mockEvent1, events)).toBe(true);
      expect(eventExists(mockEvent2, events)).toBe(true);
    });

    it('detects duplicates by ID', () => {
      const events = [mockEvent1];
      expect(eventExists(mockEvent1Dup, events)).toBe(true);
    });

    it('returns false for non-existent events', () => {
      const events = [mockEvent1];
      expect(eventExists(mockEvent2, events)).toBe(false);
      expect(eventExists(mockEvent3, events)).toBe(false);
    });

    it('handles null or non-array event list', () => {
      expect(eventExists(mockEvent1, null)).toBe(false);
      expect(eventExists(mockEvent1, undefined)).toBe(false);
      expect(eventExists(mockEvent1, 'not an array')).toBe(false);
    });

    it('returns false for events without tx_id', () => {
      const events = [mockEvent1];
      expect(eventExists({ data: 'no tx_id' }, events)).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('handles rapid refresh and pagination overlap', () => {
      const existing = [mockEvent1, mockEvent2];
      const pageTwo = [mockEvent1Dup, mockEvent3]; // mockEvent1 appears in both
      const result = mergeAndDeduplicateEvents(existing, pageTwo);
      expect(result).toHaveLength(3);
      const ids = result.map(getEventId);
      expect(new Set(ids).size).toBe(3); // All unique
    });

    it('maintains stable sort after dedup and merge', () => {
      const page1 = [mockEvent2, mockEvent3];
      const page2 = [mockEvent1, mockEvent1Dup]; // mockEvent1Dup is duplicate
      const merged = mergeAndDeduplicateEvents(page1, page2);
      const sorted = sortEventsStably(merged);
      expect(sorted[0].block_height).toBe(100); // mockEvent1
      expect(sorted[1].block_height).toBe(99);  // mockEvent2
      expect(sorted[2].block_height).toBe(98);  // mockEvent3
    });
  });
});
