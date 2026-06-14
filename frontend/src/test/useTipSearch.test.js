import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTipSearch } from '../hooks/useTipSearch';

vi.mock('react-router-dom', () => ({
  useSearchParams: () => {
    const params = new URLSearchParams();
    const setParams = vi.fn((updater) => {
      const next = updater(params);
      params.clear();
      for (const [key, value] of next.entries()) {
        params.set(key, value);
      }
    });
    return [params, setParams];
  },
}));

describe('useTipSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default values when no search params', () => {
    const { result } = renderHook(() => useTipSearch());
    expect(result.current.searchQuery).toBe('');
    expect(result.current.categoryFilter).toBe('all');
    expect(result.current.sortBy).toBe('newest');
    expect(result.current.minAmount).toBe('');
    expect(result.current.maxAmount).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('sets search query via setSearchQuery', () => {
    const { result } = renderHook(() => useTipSearch());
    act(() => result.current.setSearchQuery('test'));
    expect(result.current.setSearchQuery).toBeDefined();
  });

  it('clears filters via clearFilters', () => {
    const { result } = renderHook(() => useTipSearch());
    act(() => result.current.clearFilters());
    expect(result.current.clearFilters).toBeDefined();
  });

  it('provides category labels', () => {
    const { result } = renderHook(() => useTipSearch());
    expect(result.current.CATEGORY_LABELS).toBeDefined();
    expect(result.current.CATEGORY_LABELS[5]).toBe('Education');
  });

  it('provides sort options', () => {
    const { result } = renderHook(() => useTipSearch());
    expect(result.current.SORT_OPTIONS).toBeDefined();
    expect(result.current.SORT_OPTIONS.length).toBe(4);
  });
});
