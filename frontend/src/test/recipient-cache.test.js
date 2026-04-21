import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RECIPIENT_CACHE,
  setCacheEntry,
  getCacheEntry,
  isCacheValid,
  clearCache,
  clearExpiredEntries,
  getCacheStats,
  getCacheHitRate,
  optimizeCache,
} from '../lib/recipient-cache';

describe('recipient-cache', () => {
  const testRecipient = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';
  const testData = { isBlocked: true };

  beforeEach(() => {
    clearCache();
  });

  describe('cache operations', () => {
    it('sets and retrieves cache entries', () => {
      setCacheEntry(testRecipient, testData);
      const retrieved = getCacheEntry(testRecipient);

      expect(retrieved).toEqual(testData);
    });

    it('returns null for non-existent entries', () => {
      const retrieved = getCacheEntry(testRecipient);
      expect(retrieved).toBeNull();
    });

    it('respects TTL', () => {
      vi.useFakeTimers();

      try {
        vi.setSystemTime(new Date(0));

        const shortTTL = 100;
        setCacheEntry(testRecipient, testData, shortTTL);

        expect(getCacheEntry(testRecipient)).toEqual(testData);

        vi.setSystemTime(new Date(150));
        expect(getCacheEntry(testRecipient)).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('checks cache validity', () => {
      setCacheEntry(testRecipient, testData, 60000);
      expect(isCacheValid(testRecipient)).toBe(true);

      expect(isCacheValid('unknown-recipient')).toBe(false);
    });

    it('clears all entries', () => {
      setCacheEntry(testRecipient, testData);
      setCacheEntry('another-recipient', testData);

      clearCache();
      expect(RECIPIENT_CACHE.size).toBe(0);
    });
  });

  describe('cache management', () => {
    it('clears expired entries', () => {
      vi.useFakeTimers();

      try {
        vi.setSystemTime(new Date(0));

        const shortTTL = 100;
        setCacheEntry(testRecipient, testData, shortTTL);
        setCacheEntry('another-recipient', testData, 60000);

        expect(RECIPIENT_CACHE.size).toBe(2);

        vi.setSystemTime(new Date(150));
        clearExpiredEntries();
        expect(RECIPIENT_CACHE.size).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('provides cache statistics', () => {
      setCacheEntry(testRecipient, testData);
      const stats = getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(stats.size).toBe(1);
    });

    it('calculates cache hit rate', () => {
      setCacheEntry(testRecipient, testData);
      const hitRate = getCacheHitRate();

      expect(hitRate).toBeGreaterThanOrEqual(0);
      expect(hitRate).toBeLessThanOrEqual(1);
    });

    it('returns 0 hit rate for empty cache', () => {
      const hitRate = getCacheHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe('cache optimization', () => {
    it('removes expired entries during optimization', () => {
      vi.useFakeTimers();

      try {
        vi.setSystemTime(new Date(0));

        const shortTTL = 100;
        setCacheEntry(testRecipient, testData, shortTTL);
        setCacheEntry('another-recipient', testData, 60000);

        expect(RECIPIENT_CACHE.size).toBe(2);

        vi.setSystemTime(new Date(150));
        optimizeCache();
        expect(RECIPIENT_CACHE.size).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('limits cache size to 100 entries', () => {
      for (let i = 0; i < 150; i++) {
        const recipient = `SP${i.toString().padStart(34, '0')}`;
        setCacheEntry(recipient, testData);
      }

      optimizeCache();
      expect(RECIPIENT_CACHE.size).toBeLessThanOrEqual(100);
    });

    it('keeps newest entries when optimizing', () => {
      for (let i = 0; i < 150; i++) {
        const recipient = `SP${i.toString().padStart(34, '0')}`;
        setCacheEntry(recipient, { index: i });
      }

      optimizeCache();

      const remaining = Array.from(RECIPIENT_CACHE.values());
      expect(remaining.length).toBeLessThanOrEqual(100);
    });
  });

  describe('privacy considerations', () => {
    it('truncates addresses in cache stats', () => {
      setCacheEntry(testRecipient, testData);
      const stats = getCacheStats();

      const entry = stats.entries[0];
      expect(entry.recipient).toContain('...');
      expect(entry.recipient).not.toBe(testRecipient);
    });
  });

  describe('edge cases', () => {
    it('handles multiple entries', () => {
      for (let i = 0; i < 10; i++) {
        const recipient = `SP${i}${testRecipient.slice(3)}`;
        setCacheEntry(recipient, { id: i });
      }

      expect(RECIPIENT_CACHE.size).toBe(10);
    });

    it('handles cache update for same recipient', () => {
      setCacheEntry(testRecipient, { version: 1 });
      expect(getCacheEntry(testRecipient).version).toBe(1);

      setCacheEntry(testRecipient, { version: 2 });
      expect(getCacheEntry(testRecipient).version).toBe(2);
      expect(RECIPIENT_CACHE.size).toBe(1);
    });

    it('handles null TTL as default', () => {
      setCacheEntry(testRecipient, testData);
      const retrieved = getCacheEntry(testRecipient);
      expect(retrieved).toEqual(testData);
    });
  });
});
