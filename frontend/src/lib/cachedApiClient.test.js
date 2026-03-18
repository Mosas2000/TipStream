import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cachedFetch, cachedGet, cachedPost, registerCachePattern } from './cachedApiClient';
import * as persistentCache from './persistentCache';

describe('Cached API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('cachedFetch', () => {
    it('caches successful GET responses', async () => {
      const mockData = { stats: { total: 100 } };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await cachedFetch('/stats');
      expect(result).toEqual(mockData);

      const cached = persistentCache.getCacheEntry('api__stats');
      expect(cached).toEqual(mockData);
    });

    it('returns cached data on timeout', async () => {
      const cachedData = { stats: { cached: true } };
      persistentCache.setCacheEntry('api__stats', cachedData, 300000);

      global.fetch = vi.fn(
        () => new Promise(resolve => setTimeout(resolve, 20000))
      );

      const result = await cachedFetch('/stats', { timeout: 100 });
      expect(result).toEqual(cachedData);
    });

    it('respects useCache option', async () => {
      const mockData = { data: 'new' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await cachedFetch('/stats', { useCache: false });

      const cached = persistentCache.getCacheEntry('api__stats');
      expect(cached).toBeNull();
    });

    it('handles fetch errors with cache fallback', async () => {
      const cachedData = { stats: { fallback: true } };
      persistentCache.setCacheEntry('api__stats', cachedData, 300000);

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await cachedFetch('/stats');
      expect(result).toEqual(cachedData);
    });

    it('throws error when no cache and fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(cachedFetch('/stats')).rejects.toThrow();
    });

    it('handles non-OK responses', async () => {
      const cachedData = { stats: { fallback: true } };
      persistentCache.setCacheEntry('api__stats', cachedData, 300000);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await cachedFetch('/stats');
      expect(result).toEqual(cachedData);
    });
  });

  describe('cachedGet', () => {
    it('makes GET requests with caching', async () => {
      const mockData = { data: 'value' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await cachedGet('/endpoint');
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        '/endpoint',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('cachedPost', () => {
    it('makes POST requests without caching', async () => {
      const mockData = { success: true };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const body = { data: 'test' };
      const result = await cachedPost('/endpoint', body);
      expect(result).toEqual(mockData);

      const cached = persistentCache.getCacheEntry('api__endpoint');
      expect(cached).toBeNull();
    });
  });

  describe('Cache TTL configuration', () => {
    it('uses configured TTL for endpoints', async () => {
      const mockData = { data: 'value' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await cachedFetch('/stats');
      const metadata = persistentCache.getCacheMetadata('api__stats');
      expect(metadata.ttl).toBe(5 * 60 * 1000);
    });

    it('supports custom pattern registration', async () => {
      registerCachePattern('/custom', 60000);

      const mockData = { data: 'value' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await cachedFetch('/custom');
      const metadata = persistentCache.getCacheMetadata('api__custom');
      expect(metadata.ttl).toBe(60000);
    });
  });

  describe('Error handling', () => {
    it('handles timeout gracefully', async () => {
      global.fetch = vi.fn(
        () => new Promise(resolve => setTimeout(resolve, 30000))
      );

      await expect(
        cachedFetch('/endpoint', { timeout: 100 })
      ).rejects.toThrow();
    });

    it('distinguishes between timeout and network error', async () => {
      const cachedData = { fallback: true };
      persistentCache.setCacheEntry('api__endpoint', cachedData, 300000);

      global.fetch = vi.fn(
        () => new Promise(resolve => setTimeout(resolve, 20000))
      );

      const result = await cachedFetch('/endpoint', { timeout: 100 });
      expect(result).toEqual(cachedData);
    });
  });

  describe('Integration', () => {
    it('handles full lifecycle', async () => {
      const mockData = { stats: { count: 100 } };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result1 = await cachedFetch('/stats');
      expect(result1).toEqual(mockData);

      global.fetch = vi.fn().mockRejectedValue(new Error('API down'));

      const result2 = await cachedFetch('/stats');
      expect(result2).toEqual(mockData);
    });
  });
});
