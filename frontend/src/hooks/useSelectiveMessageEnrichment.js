/**
 * @module hooks/useSelectiveMessageEnrichment
 *
 * Hook for selectively enriching only visible tips with messages.
 *
 * Instead of fetching all tip messages at once, this hook only loads
 * messages for tips currently in the viewport. This reduces API pressure
 * during initial load and when paginating.
 *
 * Message cache is persistent across hook re-renders to minimize redundant
 * fetches as the visible set changes.
 *
 * Key features:
 * - Detects visible set changes to reset stale state
 * - Tracks request IDs to prevent race conditions
 * - Uses ref-based cache tracking to avoid infinite loops
 * - Reconciles state on partial set changes
 * - Handles rapid pagination and filtering gracefully
 */

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { fetchTipMessages } from '../lib/fetchTipDetails';
import { createEnrichmentMarker } from '../lib/enrichmentMetrics';

/**
 * Selective message enrichment hook.
 *
 * @param {Array<Object>} visibleTips - The tips currently visible.
 * @returns {Object} { enrichedTips, loading, error, clearEnrichment }
 */
export function useSelectiveMessageEnrichment(visibleTips = []) {
  if (!Array.isArray(visibleTips)) {
    visibleTips = [];
  }
  const [tipMessages, setTipMessages] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const previousIdsRef = useRef([]);
  const activeRequestIdRef = useRef(0);
  // Ref to track cache state without triggering effect re-runs
  const tipMessagesRef = useRef({});
  const [clearCounter, setClearCounter] = useState(0);

  // Extract unique, non-zero tip IDs from the currently visible set
  const visibleTipIds = useMemo(
    () => {
      const ids = visibleTips.map(t => t?.tipId).filter(id => id && id !== '0');
      return Array.from(new Set(ids));
    },
    [visibleTips]
  );

  // Detect if the visible set has changed materially
  // clearCounter forces recalculation when clearEnrichment is called
  const visibleSetChanged = useMemo(() => {
    const current = new Set(visibleTipIds);
    const previous = new Set(previousIdsRef.current);
    
    if (current.size !== previous.size) return true;
    
    for (const id of current) {
      if (!previous.has(id)) return true;
    }
    
    return false;
  }, [visibleTipIds, clearCounter]);

  useEffect(() => {
    if (visibleTipIds.length === 0) {
      setLoading(false);
      return;
    }

    if (!visibleSetChanged) {
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    
    const prevSet = new Set(previousIdsRef.current);
    const currentSet = new Set(visibleTipIds);
    const hasOverlap = visibleTipIds.some(id => prevSet.has(id));
    
    if (!hasOverlap && previousIdsRef.current.length > 0) {
      setTipMessages({});
      tipMessagesRef.current = {};
    } else if (hasOverlap) {
      setTipMessages(prev => {
        const filtered = {};
        for (const id of currentSet) {
          if (prev[id]) {
            filtered[id] = prev[id];
          }
        }
        tipMessagesRef.current = filtered;
        return filtered;
      });
    }
    
    previousIdsRef.current = visibleTipIds;
    
    const uncachedIds = visibleTipIds.filter(id => !tipMessagesRef.current[id]);
    
    if (uncachedIds.length === 0) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const marker = createEnrichmentMarker();

    fetchTipMessages(uncachedIds)
      .then(messageMap => {
        // Only update state if this is still the active request
        if (requestId !== activeRequestIdRef.current) return;
        const obj = {};
        messageMap.forEach((v, k) => { obj[k] = v; });
        setTipMessages(prev => {
          const updated = { ...prev, ...obj };
          tipMessagesRef.current = updated;
          return updated;
        });
        marker.stop(uncachedIds.length, messageMap.size);
      })
      .catch(err => {
        if (requestId === activeRequestIdRef.current) {
          console.warn('Failed to fetch visible tip messages:', err.message || err);
          setError(err.message || 'Failed to load messages');
        }
      })
      .finally(() => {
        if (requestId === activeRequestIdRef.current) {
          setLoading(false);
        }
      });

    return () => {
      // Don't increment here, just let the next effect run increment it
    };
  }, [visibleTipIds, visibleSetChanged]);

  /**
   * Re-map the visible tips to include their fetched messages.
   * Unfetched or failed messages simply leave the tip unchanged.
   */
  const enrichedTips = useMemo(
    () => visibleTips.map(t => {
      const msg = tipMessages[String(t?.tipId)];
      return msg ? { ...t, message: msg } : t;
    }),
    [visibleTips, tipMessages]
  );

  /**
   * Manually clears the enrichment state.
   * Useful when forcefully refreshing the entire UI or changing networks.
   */
  const clearEnrichment = useCallback(() => {
    setTipMessages({});
    tipMessagesRef.current = {};
    previousIdsRef.current = [];
    activeRequestIdRef.current++;
    setLoading(false);
    setError(null);
    setClearCounter(c => c + 1);
  }, []);

  return {
    enrichedTips,
    loading,
    error,
    clearEnrichment,
  };
}
