import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedPage,
  setCachedPage,
  clearPageCache,
  invalidatePagesWithSize,
  updatePaginationState,
  getPaginationState,
  getCacheStats,
} from './eventPageCache';

describe('Event Page Cache', () => {
  beforeEach(() => {
    clearPageCache();
  });

  describe('setCachedPage and getCachedPage', () => {
    it('stores and retrieves a page', () => {
      const events = [{ id: 1 }, { id: 2 }];
      const metadata = { total: 100, hasMore: true };
      setCachedPage(10, 0, events, metadata);

      const cached = getCachedPage(10, 0);
      expect(cached).toBeDefined();
      expect(cached.events).toEqual(events);
      expect(cached.metadata).toEqual(metadata);
    });

    it('returns null for uncached page', () => {
      expect(getCachedPage(10, 0)).toBeNull();
    });

    it('caches events with default metadata', () => {
      setCachedPage(10, 0, [{ id: 1 }]);
      const cached = getCachedPage(10, 0);
      expect(cached.events).toHaveLength(1);
      expect(cached.metadata).toEqual({});
    });

    it('makes a copy of events array', () => {
      const events = [{ id: 1 }];
      setCachedPage(10, 0, events);
      const cached = getCachedPage(10, 0);
      expect(cached.events).toEqual(events);
      expect(cached.events).not.toBe(events);
    });
  });

  describe('clearPageCache', () => {
    it('clears all cached pages', () => {
      setCachedPage(10, 0, [{ id: 1 }]);
      setCachedPage(10, 10, [{ id: 2 }]);
      clearPageCache();

      expect(getCachedPage(10, 0)).toBeNull();
      expect(getCachedPage(10, 10)).toBeNull();
    });

    it('resets pagination state', () => {
      updatePaginationState(100, true);
      clearPageCache();
      const state = getPaginationState();
      expect(state.total).toBe(0);
      expect(state.hasMore).toBe(false);
    });
  });

  describe('invalidatePagesWithSize', () => {
    it('invalidates pages below offset', () => {
      setCachedPage(10, 0, [{ id: 1 }]);
      setCachedPage(10, 10, [{ id: 2 }]);
      setCachedPage(10, 20, [{ id: 3 }]);

      invalidatePagesWithSize(10, 10);

      expect(getCachedPage(10, 0)).toBeNull();
      expect(getCachedPage(10, 10)).toBeDefined();
      expect(getCachedPage(10, 20)).toBeDefined();
    });

    it('preserves pages with different size', () => {
      setCachedPage(10, 0, [{ id: 1 }]);
      setCachedPage(20, 0, [{ id: 2 }]);

      invalidatePagesWithSize(10, 5);

      expect(getCachedPage(10, 0)).toBeNull();
      expect(getCachedPage(20, 0)).toBeDefined();
    });
  });

  describe('updatePaginationState and getPaginationState', () => {
    it('updates and retrieves pagination state', () => {
      updatePaginationState(500, true);
      const state = getPaginationState();
      expect(state.total).toBe(500);
      expect(state.hasMore).toBe(true);
    });

    it('tracks lastUpdated timestamp', () => {
      updatePaginationState(100, false);
      const state = getPaginationState();
      expect(typeof state.lastUpdated).toBe('number');
      expect(state.lastUpdated > 0).toBe(true);
    });
  });

  describe('getCacheStats', () => {
    it('returns cache statistics', () => {
      setCachedPage(10, 0, [{ id: 1 }]);
      setCachedPage(10, 10, [{ id: 2 }]);
      updatePaginationState(100, true);

      const stats = getCacheStats();
      expect(stats.cacheSize).toBe(2);
      expect(stats.pageCache).toHaveLength(2);
      expect(stats.paginationState.total).toBe(100);
    });
  });

  describe('Cache expiration', () => {
    it('returns null for expired pages', async () => {
      vi.useFakeTimers();
      try {
        setCachedPage(10, 0, [{ id: 1 }]);
        expect(getCachedPage(10, 0)).toBeDefined();

        vi.advanceTimersByTime(121 * 1000);
        expect(getCachedPage(10, 0)).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
