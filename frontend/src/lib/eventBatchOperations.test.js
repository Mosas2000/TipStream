import { describe, it, expect } from 'vitest';
import {
  deduplicateEventsByTipId,
  batchEvents,
  groupEventsByProperty,
  filterEventsByType,
  extractParticipants,
  calculateEventStats,
} from './eventBatchOperations';

describe('Event Batch Operations', () => {
  const mockEvents = [
    { tipId: '1', event: 'tip-sent', sender: 'alice', recipient: 'bob', amount: '1000000' },
    { tipId: '2', event: 'tip-sent', sender: 'charlie', recipient: 'dave', amount: '2000000' },
    { tipId: '3', event: 'tip-categorized', sender: 'eve', recipient: 'frank', amount: '3000000' },
  ];

  describe('deduplicateEventsByTipId', () => {
    it('removes duplicates by tipId', () => {
      const arr1 = [mockEvents[0], mockEvents[1]];
      const arr2 = [mockEvents[1], mockEvents[2]];
      const result = deduplicateEventsByTipId(arr1, arr2);

      expect(result).toHaveLength(3);
      expect(result.map(e => e.tipId)).toEqual(['1', '2', '3']);
    });

    it('handles single array', () => {
      const result = deduplicateEventsByTipId(mockEvents);
      expect(result).toHaveLength(3);
    });

    it('handles empty arrays', () => {
      const result = deduplicateEventsByTipId([], []);
      expect(result).toHaveLength(0);
    });

    it('skips non-array inputs', () => {
      const result = deduplicateEventsByTipId(mockEvents, null, undefined);
      expect(result).toHaveLength(3);
    });
  });

  describe('batchEvents', () => {
    it('creates batches of specified size', () => {
      const result = batchEvents(mockEvents, 2);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(1);
    });

    it('handles batch size larger than array', () => {
      const result = batchEvents(mockEvents, 10);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
    });

    it('returns empty array for invalid inputs', () => {
      expect(batchEvents(null, 2)).toHaveLength(0);
      expect(batchEvents([], 0)).toHaveLength(0);
      expect(batchEvents(mockEvents, -1)).toHaveLength(0);
    });
  });

  describe('groupEventsByProperty', () => {
    it('groups events by property', () => {
      const result = groupEventsByProperty(mockEvents, 'event');
      expect(Object.keys(result)).toContain('tip-sent');
      expect(Object.keys(result)).toContain('tip-categorized');
      expect(result['tip-sent']).toHaveLength(2);
    });

    it('handles missing properties', () => {
      const events = [{ tipId: '1' }, { tipId: '2', event: 'tip-sent' }];
      const result = groupEventsByProperty(events, 'event');
      expect(result.unknown).toHaveLength(1);
      expect(result['tip-sent']).toHaveLength(1);
    });
  });

  describe('filterEventsByType', () => {
    it('filters events by type', () => {
      const result = filterEventsByType(mockEvents, 'tip-sent');
      expect(result).toHaveLength(2);
      expect(result.every(e => e.event === 'tip-sent')).toBe(true);
    });

    it('returns empty array for non-matching type', () => {
      const result = filterEventsByType(mockEvents, 'no-such-type');
      expect(result).toHaveLength(0);
    });
  });

  describe('extractParticipants', () => {
    it('extracts unique senders and recipients', () => {
      const result = extractParticipants(mockEvents);
      expect(result.senders.size).toBe(3);
      expect(result.recipients.size).toBe(3);
      expect(result.senders.has('alice')).toBe(true);
      expect(result.recipients.has('bob')).toBe(true);
    });

    it('handles empty events array', () => {
      const result = extractParticipants([]);
      expect(result.senders.size).toBe(0);
      expect(result.recipients.size).toBe(0);
    });
  });

  describe('calculateEventStats', () => {
    it('calculates statistics', () => {
      const result = calculateEventStats(mockEvents);
      expect(result.count).toBe(3);
      expect(result.totalAmount).toBe(6000000);
      expect(result.minAmount).toBe(1000000);
      expect(result.maxAmount).toBe(3000000);
      expect(result.averageAmount).toBe(2000000);
    });

    it('handles empty array', () => {
      const result = calculateEventStats([]);
      expect(result.count).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.minAmount).toBe(0);
      expect(result.maxAmount).toBe(0);
      expect(result.averageAmount).toBe(0);
    });

    it('handles invalid amounts', () => {
      const events = [
        { amount: 'invalid' },
        { amount: '1000000' },
      ];
      const result = calculateEventStats(events);
      expect(result.count).toBe(2);
      expect(result.totalAmount).toBe(1000000);
    });
  });
});
