import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFilteredAndPaginatedEvents } from './useFilteredAndPaginatedEvents';

describe('useFilteredAndPaginatedEvents Integration', () => {
  const mockEvents = [
    {
      event: 'tip-sent',
      sender: 'alice',
      recipient: 'bob',
      amount: '1000000',
      tipId: '1',
    },
    {
      event: 'tip-sent',
      sender: 'charlie',
      recipient: 'dave',
      amount: '2000000',
      tipId: '2',
    },
    {
      event: 'tip-sent',
      sender: 'eve',
      recipient: 'frank',
      amount: '3000000',
      tipId: '3',
    },
    {
      event: 'tip-sent',
      sender: 'grace',
      recipient: 'henry',
      amount: '500000',
      tipId: '4',
    },
    {
      event: 'tip-sent',
      sender: 'iris',
      recipient: 'jack',
      amount: '1500000',
      tipId: '5',
    },
  ];

  it('initializes with first page of tips', () => {
    const { result } = renderHook(() => useFilteredAndPaginatedEvents(mockEvents));

    expect(result.current.enrichedTips).toBeDefined();
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBeGreaterThan(0);
  });

  it('filters tips by search query', () => {
    const { result } = renderHook(() => useFilteredAndPaginatedEvents(mockEvents));

    act(() => {
      result.current.setSearchQuery('alice');
    });

    expect(result.current.filteredTips).toHaveLength(1);
    expect(result.current.filteredTips[0].sender).toBe('alice');
  });

  it('filters tips by amount range', () => {
    const { result } = renderHook(() => useFilteredAndPaginatedEvents(mockEvents));

    act(() => {
      result.current.setMinAmount('1.5');
      result.current.setMaxAmount('2.5');
    });

    expect(result.current.filteredTips.length).toBeGreaterThan(0);
    const amounts = result.current.filteredTips.map(t => parseInt(t.amount));
    expect(amounts.every(a => a >= 1500000 && a <= 2500000)).toBe(true);
  });

  it('sorts tips by amount (high to low)', () => {
    const { result } = renderHook(() => useFilteredAndPaginatedEvents(mockEvents));

    act(() => {
      result.current.setSortBy('amount-high');
    });

    const amounts = result.current.filteredTips.map(t => parseInt(t.amount));
    for (let i = 0; i < amounts.length - 1; i++) {
      expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i + 1]);
    }
  });

  it('sorts tips by amount (low to high)', () => {
    const { result } = renderHook(() => useFilteredAndPaginatedEvents(mockEvents));

    act(() => {
      result.current.setSortBy('amount-low');
    });

    const amounts = result.current.filteredTips.map(t => parseInt(t.amount));
    for (let i = 0; i < amounts.length - 1; i++) {
      expect(amounts[i]).toBeLessThanOrEqual(amounts[i + 1]);
    }
  });

  it('navigates between pages', () => {
    const { result } = renderHook(() => useFilteredAndPaginatedEvents(mockEvents));

    expect(result.current.currentPage).toBe(1);

    if (result.current.totalPages > 1) {
      act(() => {
        result.current.nextPage();
      });
      expect(result.current.currentPage).toBe(2);

      act(() => {
        result.current.prevPage();
      });
      expect(result.current.currentPage).toBe(1);
    }
  });

  it('clears filters correctly', () => {
    const { result } = renderHook(() => useFilteredAndPaginatedEvents(mockEvents));

    act(() => {
      result.current.setSearchQuery('alice');
      result.current.setMinAmount('0.1');
      result.current.setSortBy('oldest');
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.minAmount).toBe('');
    expect(result.current.sortBy).toBe('newest');
  });

  it('combines filters (search and amount)', () => {
    const { result } = renderHook(() => useFilteredAndPaginatedEvents(mockEvents));

    act(() => {
      result.current.setSearchQuery('alice');
      result.current.setMinAmount('0.5');
    });

    const filtered = result.current.filteredTips;
    expect(
      filtered.every(t =>
        ['alice'].some(s => t.sender.includes(s) || t.recipient.includes(s)) &&
        parseInt(t.amount) >= 500000
      )
    ).toBe(true);
  });

  it('maintains enriched tips presence after filtering', () => {
    const { result } = renderHook(() => useFilteredAndPaginatedEvents(mockEvents));

    expect(result.current.enrichedTips).toBeDefined();
    expect(Array.isArray(result.current.enrichedTips)).toBe(true);

    act(() => {
      result.current.setSearchQuery('bob');
    });

    expect(result.current.enrichedTips).toBeDefined();
    expect(Array.isArray(result.current.enrichedTips)).toBe(true);
  });
});
