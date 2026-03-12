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
