/**
 * TipContext -- global state for coordinating tip events across the app.
 *
 * Provides a refresh counter that signals consumers to re-read data,
 * and a shared event cache so that multiple components do not independently
 * poll the same Stacks API endpoint.
 *
 * @module context/TipContext
 */
import { createContext, useContext, useReducer, useCallback, useState, useEffect, useRef } from 'react';
import { fetchAllContractEvents, POLL_INTERVAL_MS } from '../lib/contractEvents';
import { clearPageCache, updatePaginationState } from '../lib/eventPageCache';

const TipContext = createContext(null);

const initialState = {
  refreshCounter: 0,
  lastTipTimestamp: null,
};

function tipReducer(state, action) {
  switch (action.type) {
    case 'TIP_SENT':
      return {
        ...state,
        refreshCounter: state.refreshCounter + 1,
        lastTipTimestamp: Date.now(),
      };
    case 'REFRESH':
      return {
        ...state,
        refreshCounter: state.refreshCounter + 1,
      };
    default:
      return state;
  }
}

export function TipProvider({ children }) {
  const [state, dispatch] = useReducer(tipReducer, initialState);

  // ---- Shared event cache ------------------------------------------------
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);
  const [eventsMeta, setEventsMeta] = useState({ apiOffset: 0, total: 0, hasMore: false });
  const [lastEventRefresh, setLastEventRefresh] = useState(null);
  const fetchIdRef = useRef(0);

  /**
   * Fetch contract events from the Stacks API and update the shared cache.
   * Uses a fetchId counter to discard stale responses when a newer fetch
   * has already been triggered (e.g. from a rapid manual refresh).
   *
   * Also invalidates page cache to ensure fresh pagination data.
   */
  const refreshEvents = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      setEventsError(null);
      const result = await fetchAllContractEvents();
      if (id !== fetchIdRef.current) return;
      setEvents(result.events);
      setEventsMeta({ apiOffset: result.apiOffset, total: result.total, hasMore: result.hasMore });
      setLastEventRefresh(new Date());
      updatePaginationState(result.total, result.hasMore);
    } catch (err) {
      if (id !== fetchIdRef.current) return;
      console.error('Shared event fetch failed:', err.message || err);
      const isNet = err.message?.includes('fetch') || err.name === 'TypeError';
      setEventsError(isNet ? 'Unable to reach the Stacks API. Check your connection.' : err.message);
    } finally {
      if (id === fetchIdRef.current) setEventsLoading(false);
    }
  }, []);

  /**
   * Load the next batch of events beyond the current apiOffset.
   * Appends new events to the existing cache rather than replacing it.
   */
  const loadMoreEvents = useCallback(async () => {
    try {
      const result = await fetchAllContractEvents({ startOffset: eventsMeta.apiOffset });
      setEvents(prev => [...prev, ...result.events]);
      setEventsMeta({ apiOffset: result.apiOffset, total: result.total, hasMore: result.hasMore });
    } catch (err) {
      console.error('Failed to load more events:', err.message || err);
    }
  }, [eventsMeta.apiOffset]);

  const notifyTipSent = useCallback(() => {
    dispatch({ type: 'TIP_SENT' });
  }, []);

  const triggerRefresh = useCallback(() => {
    dispatch({ type: 'REFRESH' });
  }, []);

  // Fetch events on mount and whenever refreshCounter bumps.
  useEffect(() => { refreshEvents(); }, [refreshEvents, state.refreshCounter]);

  // Single polling interval shared across all consumers.
  useEffect(() => {
    const id = setInterval(refreshEvents, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshEvents]);

  return (
    <TipContext.Provider value={{
      ...state,
      notifyTipSent,
      triggerRefresh,
      // Shared event cache
      events,
      eventsLoading,
      eventsError,
      eventsMeta,
      lastEventRefresh,
      refreshEvents,
      loadMoreEvents,
    }}>
      {children}
    </TipContext.Provider>
  );
}

export function useTipContext() {
  const context = useContext(TipContext);
  if (!context) {
    throw new Error('useTipContext must be used within a TipProvider');
  }
  return context;
}
