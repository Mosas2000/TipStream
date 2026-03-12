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
   */
  const refreshEvents = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      setEventsError(null);
      const result = await fetchAllContractEvents();
      // Discard if a newer fetch has been triggered in the meantime.
      if (id !== fetchIdRef.current) return;
      setEvents(result.events);
      setEventsMeta({ apiOffset: result.apiOffset, total: result.total, hasMore: result.hasMore });
      setLastEventRefresh(new Date());
    } catch (err) {
      if (id !== fetchIdRef.current) return;
      console.error('Shared event fetch failed:', err.message || err);
      const isNet = err.message?.includes('fetch') || err.name === 'TypeError';
      setEventsError(isNet ? 'Unable to reach the Stacks API. Check your connection.' : err.message);
    } finally {
      if (id === fetchIdRef.current) setEventsLoading(false);
    }
  }, []);

  const notifyTipSent = useCallback(() => {
    dispatch({ type: 'TIP_SENT' });
  }, []);

  const triggerRefresh = useCallback(() => {
    dispatch({ type: 'REFRESH' });
  }, []);

  return (
    <TipContext.Provider value={{ ...state, notifyTipSent, triggerRefresh }}>
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
