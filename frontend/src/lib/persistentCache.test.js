import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setCacheEntry,
  getCacheEntry,
  getCacheMetadata,
  clearCacheEntry,
  clearAllCache,
  getCacheStats,
} from './persistentCache';

describe('Persistent Cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('setCacheEntry and getCacheEntry', () => {
    it('stores and retrieves data', () => {
      const data = { stats: { total: 100 } };
      expect(setCacheEntry('stats', data, 60000)).toBe(true);
      expect(getCacheEntry('stats')).toEqual(data);
    });

    it('returns null for non-existent entries', () => {
      expect(getCacheEntry('nonexistent')).toBeNull();
    });

    it('returns null for expired entries', () => {
      vi.useFakeTimers();
      try {
        setCacheEntry('expired', { value: 'data' }, 1000);
        vi.advanceTimersByTime(1001);
        expect(getCacheEntry('expired')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('returns false for invalid keys', () => {
      expect(setCacheEntry('', { data: 'test' }, 1000)).toBe(false);
      expect(setCacheEntry(null, { data: 'test' }, 1000)).toBe(false);
    });

    it('returns false for invalid TTL', () => {
      expect(setCacheEntry('key', { data: 'test' }, 0)).toBe(false);
      expect(setCacheEntry('key', { data: 'test' }, -1)).toBe(false);
    });

    it('preserves complex data structures', () => {
      const complex = {
        array: [1, 2, 3],
        nested: { a: { b: { c: 'deep' } } },
        null: null,
        bool: true,
      };
      setCacheEntry('complex', complex);
      expect(getCacheEntry('complex')).toEqual(complex);
    });
  });

  describe('getCacheMetadata', () => {
    it('returns metadata for valid entries', () => {
      setCacheEntry('test', { data: 'value' }, 60000);
      const metadata = getCacheMetadata('test');

      expect(metadata).toBeDefined();
      expect(metadata.timestamp).toBeDefined();
      expect(metadata.ttl).toBe(60000);
      expect(metadata.age).toBeGreaterThanOrEqual(0);
      expect(metadata.isExpired).toBe(false);
      expect(metadata.expiresAt).toBeDefined();
    });

    it('marks expired entries in metadata', () => {
      vi.useFakeTimers();
      try {
        setCacheEntry('expiring', { data: 'value' }, 1000);
        vi.advanceTimersByTime(1001);
        const metadata = getCacheMetadata('expiring');
        expect(metadata.isExpired).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it('returns null for non-existent entries', () => {
      expect(getCacheMetadata('nonexistent')).toBeNull();
    });

    it('tracks age correctly', () => {
      vi.useFakeTimers();
      try {
        setCacheEntry('tracking', { data: 'value' }, 60000);
        vi.advanceTimersByTime(5000);
        const metadata = getCacheMetadata('tracking');
        expect(metadata.age).toBeGreaterThanOrEqual(5000);
        expect(metadata.age).toBeLessThan(5100);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('clearCacheEntry', () => {
    it('deletes specific entries', () => {
      setCacheEntry('keep', { data: 'keep' });
      setCacheEntry('delete', { data: 'delete' });

      expect(clearCacheEntry('delete')).toBe(true);
      expect(getCacheEntry('keep')).toBeDefined();
      expect(getCacheEntry('delete')).toBeNull();
    });

    it('returns false for non-existent entries', () => {
      expect(clearCacheEntry('nonexistent')).toBe(false);
    });

    it('returns false for invalid keys', () => {
      expect(clearCacheEntry('')).toBe(false);
      expect(clearCacheEntry(null)).toBe(false);
    });
  });

  describe('clearAllCache', () => {
    it('clears all cache entries', () => {
      setCacheEntry('one', { data: 1 });
      setCacheEntry('two', { data: 2 });
      setCacheEntry('three', { data: 3 });

      expect(clearAllCache()).toBe(3);
      expect(getCacheEntry('one')).toBeNull();
      expect(getCacheEntry('two')).toBeNull();
      expect(getCacheEntry('three')).toBeNull();
    });

    it('preserves non-TipStream entries', () => {
      localStorage.setItem('other_key', 'other_data');
      setCacheEntry('tipstream', { data: 'value' });

      clearAllCache();

      expect(localStorage.getItem('other_key')).toBe('other_data');
      expect(getCacheEntry('tipstream')).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('returns statistics for cached entries', () => {
      setCacheEntry('stats1', { data: 'value1' });
      setCacheEntry('stats2', { data: 'value2' });

      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.entries).toHaveLength(2);
    });

    it('includes metadata for each entry', () => {
      setCacheEntry('test', { data: 'value' });
      const stats = getCacheStats();

      expect(stats.entries[0].key).toBe('test');
      expect(stats.entries[0].size).toBeGreaterThan(0);
      expect(stats.entries[0].metadata).toBeDefined();
    });

    it('handles empty cache', () => {
      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.entries).toHaveLength(0);
    });
  });

  describe('Integration', () => {
    it('handles full lifecycle', () => {
      const data = { name: 'test', count: 42 };
      expect(setCacheEntry('lifecycle', data, 5000)).toBe(true);
      expect(getCacheEntry('lifecycle')).toEqual(data);

      const metadata = getCacheMetadata('lifecycle');
      expect(metadata.isExpired).toBe(false);

      expect(clearCacheEntry('lifecycle')).toBe(true);
      expect(getCacheEntry('lifecycle')).toBeNull();
    });

    it('handles storage quota errors gracefully', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      getItemSpy.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(setCacheEntry('error', { data: 'test' }, 5000)).toBe(false);
      getItemSpy.mockRestore();
    });
  });
});
