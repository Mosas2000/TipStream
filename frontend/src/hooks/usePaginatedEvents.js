/**
 * @module hooks/usePaginatedEvents
 *
 * Hook for fetching and caching event pages with stable cursors.
 *
 * Manages pagination state, caching, and cursor advancement without
 * loading all events into memory upfront.
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { fetchEventPage } from '../lib/contractEvents';
import { getCachedPage, setCachedPage, clearPageCache } from '../lib/eventPageCache';
import { createCursorFromPosition } from '../lib/eventCursorManager';

const PAGE_SIZE = 10;

/**
 * Hook for paginated event loading.
 *
 * @returns {Object} Pagination state and actions.
 */
export function usePaginatedEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const cancelledRef = useRef(false);

  const loadPage = useCallback(async (offset) => {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    try {
      const cached = getCachedPage(PAGE_SIZE, offset);
      if (cached) {
        if (!cancelledRef.current) {
          setEvents(cached.events);
          setCurrentOffset(cached.metadata.offset || offset);
          setTotalCount(cached.metadata.total || 0);
          setHasMore(cached.metadata.hasMore ?? false);
        }
        return;
      }

      const result = await fetchEventPage(offset);
      if (cancelledRef.current) return;

      setCachedPage(PAGE_SIZE, offset, result.events, {
        total: result.total,
        hasMore: result.hasMore,
        offset: result.offset,
      });

      setEvents(result.events);
      setCurrentOffset(result.offset);
      setTotalCount(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      if (!cancelledRef.current) {
        console.error('Failed to load event page:', err.message || err);
        setError(err.message || 'Failed to load events');
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const nextPage = useCallback(() => {
    if (hasMore) {
      loadPage(currentOffset);
    }
  }, [currentOffset, hasMore, loadPage]);

  const resetPagination = useCallback(() => {
    clearPageCache();
    setEvents([]);
    setCurrentOffset(0);
    setTotalCount(0);
    setHasMore(false);
    loadPage(0);
  }, [loadPage]);

  useEffect(() => {
    loadPage(0);
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const cursor = createCursorFromPosition(events, Math.min(PAGE_SIZE - 1, events.length - 1));

  return {
    events,
    loading,
    error,
    currentOffset,
    totalCount,
    hasMore,
    cursor,
    nextPage,
    loadPage,
    resetPagination,
  };
}
