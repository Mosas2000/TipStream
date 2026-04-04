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

import { useEffect, useState, useRef, useMemo } from 'react';
import { fetchTipMessages } from '../lib/fetchTipDetails';
import { createEnrichmentMarker } from '../lib/enrichmentMetrics';

/**
 * Selective message enrichment hook.
 *
 * @param {Array<Object>} visibleTips - The tips currently visible.
 * @returns {Object} { enrichedTips, loading, error }
 */
export function useSelectiveMessageEnrichment(visibleTips = []) {
  const [tipMessages, setTipMessages] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cancelledRef = useRef(false);
  const [previousIds, setPreviousIds] = useState([]);

  const visibleTipIds = useMemo(
    () => visibleTips
      .map(t => t.tipId)
      .filter(id => id && id !== '0')
      .filter((v, i, a) => a.indexOf(v) === i),
    [visibleTips]
  );

  const hasNewIds = useMemo(
    () => visibleTipIds.length !== previousIds.length ||
           visibleTipIds.some((id, i) => id !== previousIds[i]),
    [visibleTipIds, previousIds]
  );

  useEffect(() => {
    if (visibleTipIds.length === 0) {
      return;
    }

    if (!hasNewIds) {
      return;
    }

    let cancelled = false;
    cancelledRef.current = false;
    
    Promise.resolve().then(() => {
      if (cancelled || cancelledRef.current) return;
      setLoading(true);
      setError(null);
      setPreviousIds(visibleTipIds);
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

  return {
    enrichedTips,
    loading,
    error,
  };
}
