import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTipSearch } from '../hooks/useTipSearch';

let currentParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useSearchParams: () => {
    const setParams = vi.fn((updaterOrObj) => {
      if (typeof updaterOrObj === 'function') {
        const next = updaterOrObj(currentParams);
        currentParams = next;
      } else {
        currentParams = new URLSearchParams(updaterOrObj);
      }
    });
    return [currentParams, setParams];
  },
}));

describe('useTipSearch', () => {
  beforeEach(() => {
    currentParams = new URLSearchParams();
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

  it('detects active filters correctly', () => {
    currentParams = new URLSearchParams('?q=test&category=5&sort=oldest');
    const { result } = renderHook(() => useTipSearch());
    expect(result.current.hasActiveFilters).toBe(true);
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
    expect(result.current.SORT_OPTIONS[0].value).toBe('newest');
  });

  it('reads category from URL params', () => {
    currentParams = new URLSearchParams('?category=2');
    const { result } = renderHook(() => useTipSearch());
    expect(result.current.categoryFilter).toBe('2');
  });

  it('reads sort from URL params', () => {
    currentParams = new URLSearchParams('?sort=oldest');
    const { result } = renderHook(() => useTipSearch());
    expect(result.current.sortBy).toBe('oldest');
  });

  it('reads min and max amount from URL params', () => {
    currentParams = new URLSearchParams('?min=0.5&max=10');
    const { result } = renderHook(() => useTipSearch());
    expect(result.current.minAmount).toBe('0.5');
    expect(result.current.maxAmount).toBe('10');
  });
});
