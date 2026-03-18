/**
 * @module hooks/useFilteredAndPaginatedEvents
 *
 * Hook for filtering and paginating events with selective enrichment.
 *
 * Combines paginated event loading with client-side filtering and
 * selective message enrichment for only visible tips.
 *
 * This is the primary hook for event feed components.
 */

import { useMemo, useState, useCallback } from 'react';
import { toMicroSTX } from '../lib/utils';
import { useSelectiveMessageEnrichment } from './useSelectiveMessageEnrichment';
import { useTipContext } from '../context/TipContext';

const PAGE_SIZE = 10;

/**
 * Hook for filtered and paginated event display.
 *
 * Applies filters and sorting to a base event set, then paginates the result,
 * and enriches only the visible page with message data.
 *
 * @param {Array<Object>} baseEvents - The starting event array.
 * @returns {Object} Filtered, paginated, enriched events and actions.
 */
export function useFilteredAndPaginatedEvents(baseEvents = []) {
  const [searchQuery, setSearchQuery] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [offset, setOffset] = useState(0);

  // Filter events based on criteria
  const filteredTips = useMemo(() => {
    let result = baseEvents
      .filter(t => t.event === 'tip-sent' && t.sender && t.recipient);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(t =>
        [t.sender, t.recipient, t.message || ''].some(s => s.toLowerCase().includes(q))
      );
    }

    if (minAmount) {
      const m = toMicroSTX(minAmount);
      result = result.filter(t => parseInt(t.amount) >= m);
    }

    if (maxAmount) {
      const m = toMicroSTX(maxAmount);
      result = result.filter(t => parseInt(t.amount) <= m);
    }

    if (sortBy === 'oldest') {
      result.reverse();
    } else if (sortBy === 'amount-high') {
      result.sort((a, b) => parseInt(b.amount) - parseInt(a.amount));
    } else if (sortBy === 'amount-low') {
      result.sort((a, b) => parseInt(a.amount) - parseInt(b.amount));
    }

    return result;
  }, [baseEvents, searchQuery, minAmount, maxAmount, sortBy]);

  // Paginate the filtered results
  const paginatedTips = useMemo(
    () => filteredTips.slice(offset, offset + PAGE_SIZE),
    [filteredTips, offset]
  );

  // Enrich only visible tips with messages
  const { enrichedTips, loading: messagesLoading } = useSelectiveMessageEnrichment(paginatedTips);

  const totalPages = Math.max(1, Math.ceil(filteredTips.length / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const hasActiveFilters = searchQuery || minAmount || maxAmount || sortBy !== 'newest';

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('newest');
    setOffset(0);
  }, []);

  const prevPage = useCallback(() => {
    setOffset(Math.max(0, offset - PAGE_SIZE));
  }, [offset]);

  const nextPage = useCallback(() => {
    setOffset(Math.min((totalPages - 1) * PAGE_SIZE, offset + PAGE_SIZE));
  }, [offset, totalPages]);

  return {
    // Pagination state
    filteredTips,
    paginatedTips,
    enrichedTips,
    currentPage,
    totalPages,
    offset,

    // Enrichment state
    messagesLoading,

    // Filter state
    searchQuery,
    minAmount,
    maxAmount,
    sortBy,
    hasActiveFilters,

    // Actions
    setSearchQuery: (q) => { setSearchQuery(q); setOffset(0); },
    setMinAmount: (a) => { setMinAmount(a); setOffset(0); },
    setMaxAmount: (a) => { setMaxAmount(a); setOffset(0); },
    setSortBy: (s) => { setSortBy(s); setOffset(0); },
    setOffset,
    prevPage,
    nextPage,
    clearFilters,
  };
}
