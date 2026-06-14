import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const CATEGORY_LABELS = {
  0: 'General', 1: 'Content Creation', 2: 'Open Source',
  3: 'Community Help', 4: 'Appreciation', 5: 'Education', 6: 'Bug Bounty',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount-high', label: 'Highest amount' },
  { value: 'amount-low', label: 'Lowest amount' },
];

export function useTipSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const searchQuery = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || 'all';
  const sortBy = searchParams.get('sort') || 'newest';
  const minAmount = searchParams.get('min') || '';
  const maxAmount = searchParams.get('max') || '';

  const setSearchQuery = useCallback((q) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set('q', q);
      else next.delete('q');
      return next;
    });
  }, [setSearchParams]);

  const setCategoryFilter = useCallback((c) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (c && c !== 'all') next.set('category', c);
      else next.delete('category');
      return next;
    });
  }, [setSearchParams]);

  const setSortBy = useCallback((s) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (s && s !== 'newest') next.set('sort', s);
      else next.delete('sort');
      return next;
    });
  }, [setSearchParams]);

  const setMinAmount = useCallback((v) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set('min', v);
      else next.delete('min');
      return next;
    });
  }, [setSearchParams]);

  const setMaxAmount = useCallback((v) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set('max', v);
      else next.delete('max');
      return next;
    });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams({});
    setShowFilters(false);
  }, [setSearchParams]);

  const hasActiveFilters = useMemo(() => {
    return !!searchQuery || categoryFilter !== 'all' || sortBy !== 'newest' || !!minAmount || !!maxAmount;
  }, [searchQuery, categoryFilter, sortBy, minAmount, maxAmount]);

  return {
    searchQuery,
    categoryFilter,
    sortBy,
    minAmount,
    maxAmount,
    showFilters,
    setSearchQuery,
    setCategoryFilter,
    setSortBy,
    setMinAmount,
    setMaxAmount,
    setShowFilters,
    clearFilters,
    hasActiveFilters,
    CATEGORY_LABELS,
    SORT_OPTIONS,
  };
}
