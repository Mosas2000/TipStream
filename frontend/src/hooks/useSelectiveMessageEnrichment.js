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
  const cancelledRef = useRef(false);
  const previousIdsRef = useRef([]);

  // Extract unique, non-zero tip IDs from the currently visible set
  const visibleTipIds = useMemo(
    () => visibleTips
      .map(t => t.tipId)
      .filter(id => id && id !== '0')
      .filter((v, i, a) => a.indexOf(v) === i),
    [visibleTips]
  );

  const hasNewIds = useMemo(
    () => visibleTipIds.length !== previousIdsRef.current.length ||
           visibleTipIds.some((id, i) => id !== previousIdsRef.current[i]),
    [visibleTipIds] // Only recalculate when visibleTipIds changes
  );

  useEffect(() => {
    if (visibleTipIds.length === 0) {
      setLoading(false);
      return;
    }

    if (!hasNewIds) {
      return;
    }

    let cancelled = false;
    cancelledRef.current = false;
    
    setLoading(true);
    setError(null);

    Promise.resolve().then(() => {
      if (cancelled || cancelledRef.current) return;
      
      /** 
       * Reconcile state: If the new visible set has NO overlap with the previous set,
       * we treat this as a material change (e.g. navigation, filtering, or deep jump).
       * We clear the stale messages to prevent memory bloat and stale mappings.
       */
      const prevSet = new Set(previousIdsRef.current);
      const hasOverlap = visibleTipIds.some(id => prevSet.has(id));
      if (!hasOverlap && previousIdsRef.current.length > 0) {
        setTipMessages({});
      }
      
      previousIdsRef.current = visibleTipIds;
    });

    const marker = createEnrichmentMarker();

    fetchTipMessages(visibleTipIds)
      .then(messageMap => {
        if (cancelled || cancelledRef.current) return;
        const obj = {};
        messageMap.forEach((v, k) => { obj[k] = v; });
        setTipMessages(prev => ({ ...prev, ...obj }));
        marker.stop(visibleTipIds.length, messageMap.size);
      })
      .catch(err => {
        if (!cancelled && !cancelledRef.current) {
          console.warn('Failed to fetch visible tip messages:', err.message || err);
          setError(err.message || 'Failed to load messages');
        }
      })
      .finally(() => {
        if (!cancelled && !cancelledRef.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      cancelledRef.current = true;
    };
  }, [visibleTipIds, hasNewIds]);

  const enrichedTips = useMemo(
    () => visibleTips.map(t => {
      const msg = tipMessages[String(t.tipId)];
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
    previousIdsRef.current = [];
  }, []);

  return {
    enrichedTips,
    loading,
    error,
    clearEnrichment,
  };
}
