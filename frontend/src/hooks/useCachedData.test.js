import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCachedData } from './useCachedData';
import * as persistentCache from '../lib/persistentCache';

describe('useCachedData Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('fetches live data on mount', async () => {
    const mockData = { stats: { total: 100 } };
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useCachedData('test', fetchFn, { ttl: 5000 })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.source).toBe('live');
    expect(result.current.isLive).toBe(true);
  });

  it('caches successful responses', async () => {
    const mockData = { stats: { total: 100 } };
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    renderHook(() => useCachedData('test-cache', fetchFn, { ttl: 5000 }));

    await waitFor(() => {
      const cached = persistentCache.getCacheEntry('test-cache');
      expect(cached).toEqual(mockData);
    });
  });

  it('falls back to cache on fetch error', async () => {
    const cachedData = { stats: { total: 50 } };
    persistentCache.setCacheEntry('fallback', cachedData, 5000);

    const fetchFn = vi.fn().mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() =>
      useCachedData('fallback', fetchFn, { ttl: 5000 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(cachedData);
    expect(result.current.source).toBe('cache');
    expect(result.current.isCached).toBe(true);
    expect(result.current.error).toBeDefined();
  });

  it('returns null when no live data and no cache', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() =>
      useCachedData('nocache', fetchFn, { ttl: 5000 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.source).toBe('none');
  });

  it('retries fetch on demand', async () => {
    const mockData = { stats: { total: 100 } };
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useCachedData('retry-test', fetchFn, { ttl: 5000 })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  it('handles fetch timeout', async () => {
    const cachedData = { stats: { old: true } };
    persistentCache.setCacheEntry('timeout-test', cachedData, 5000);

    const fetchFn = vi.fn(
      () => new Promise(resolve => setTimeout(resolve, 20000))
    );

    const { result } = renderHook(() =>
      useCachedData('timeout-test', fetchFn, { ttl: 5000, timeout: 100 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(cachedData);
    expect(result.current.source).toBe('cache');
  });

  it('provides metadata for cached data', async () => {
    vi.useFakeTimers();
    try {
      const mockData = { stats: { total: 100 } };
      persistentCache.setCacheEntry('meta-test', mockData, 60000);

      vi.advanceTimersByTime(5000);

      const fetchFn = vi.fn().mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() =>
        useCachedData('meta-test', fetchFn, { ttl: 60000 })
      );

      await waitFor(() => {
        expect(result.current.metadata).toBeDefined();
      });

      expect(result.current.metadata.age).toBeGreaterThanOrEqual(5000);
      expect(result.current.metadata.isExpired).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears cache on demand', async () => {
    const mockData = { stats: { total: 100 } };
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useCachedData('clear-test', fetchFn, { ttl: 5000 })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    act(() => {
      result.current.clearCache();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.metadata).toBeNull();
  });

  it('respects TTL option', async () => {
    const mockData = { stats: { total: 100 } };
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    renderHook(() =>
      useCachedData('ttl-test', fetchFn, { ttl: 30000 })
    );

    await waitFor(() => {
      const metadata = persistentCache.getCacheMetadata('ttl-test');
      expect(metadata.ttl).toBe(30000);
    });
  });
});
