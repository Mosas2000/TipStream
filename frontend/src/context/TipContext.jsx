/**
 * TipContext -- global state for coordinating tip events across the app.
 *
 * Provides a refresh counter that signals consumers to re-read data,
 * and a shared event cache so that multiple components do not independently
 * poll the same Stacks API endpoint.
 *
 * When a WebSocket URL is configured (VITE_WS_URL), the context connects to
 * the chainhook backend and receives tip events in real time. Polling is kept
 * as a fallback and runs at a reduced frequency while the socket is healthy.
 *
 * @module context/TipContext
 */
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useState,
  useEffect,
  useRef,
} from 'react';
import { fetchAllContractEvents, POLL_INTERVAL_MS } from '../lib/contractEvents';
import { updatePaginationState } from '../lib/eventPageCache';
import { mergeAndDeduplicateEvents, sortEventsStably } from '../lib/eventDeduplication.js';
import { useDemoMode } from './DemoContext';
import { useWebSocket, WS_STATUS } from '../hooks/useWebSocket';
import { WS_URL } from '../config/contracts';

const TipContext = createContext(null);

// Polling interval while WebSocket is healthy (reduced load).
const POLL_INTERVAL_WS_ACTIVE_MS = 120_000;

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
  const { demoEnabled, demoTips, addDemoTip } = useDemoMode();

  // ---- Shared event cache ------------------------------------------------
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);
  const [eventsMeta, setEventsMeta] = useState({ apiOffset: 0, total: 0, hasMore: false });
  const [lastEventRefresh, setLastEventRefresh] = useState(null);
  const fetchIdRef = useRef(0);

  // ---- WebSocket state ---------------------------------------------------
  const [wsConnected, setWsConnected] = useState(false);

  const demoEvents = useCallback(() => {
    return demoTips.map((tip) => ({
      event: 'tip-sent',
      tipId: tip.id,
      sender: tip.sender,
      recipient: tip.recipient,
      amount: String(tip.amount),
      fee: '0',
      message: tip.memo || tip.message || '',
      category: tip.category ?? null,
      timestamp: tip.timestamp ? Math.floor(tip.timestamp / 1000) : Math.floor(Date.now() / 1000),
      txId: tip.txId || tip.id,
    }));
  }, [demoTips]);

  /**
   * Fetch contract events from the Stacks API and update the shared cache.
   * Uses a fetchId counter to discard stale responses when a newer fetch
   * has already been triggered.
   */
  const refreshEvents = useCallback(async () => {
    if (demoEnabled) {
      setEventsLoading(true);
      await new Promise(r => setTimeout(r, 600));
      const demoEventData = demoEvents();
      setEvents(demoEventData);
      setEventsMeta({ apiOffset: demoEventData.length, total: demoEventData.length, hasMore: false });
      setLastEventRefresh(new Date());
      setEventsLoading(false);
      setEventsError(null);
      return;
    }

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
  }, [demoEnabled, demoEvents]);

  /**
   * Handle an incoming tip event pushed over WebSocket.
   * Prepends the event to the local cache without a full API round-trip.
   */
  const handleWsMessage = useCallback((message) => {
    if (message.type !== 'tip_event') return;

    const incoming = message.data;
    if (!incoming) return;

    setEvents(prev => {
      const merged = mergeAndDeduplicateEvents([incoming], prev);
      return sortEventsStably(merged);
    });
    setLastEventRefresh(new Date());
  }, []);

  const handleWsConnect = useCallback(() => {
    setWsConnected(true);
  }, []);

  const handleWsDisconnect = useCallback(() => {
    setWsConnected(false);
  }, []);

  // WebSocket connection — only when a URL is configured and not in demo mode.
  const { status: wsStatus } = useWebSocket(
    !demoEnabled ? WS_URL : null,
    {
      enabled: !demoEnabled && Boolean(WS_URL),
      onMessage: handleWsMessage,
      onConnect: handleWsConnect,
      onDisconnect: handleWsDisconnect,
    }
  );

  /**
   * Load the next batch of events beyond the current apiOffset.
   * Appends new events to the existing cache rather than replacing it.
   */
  const loadMoreEvents = useCallback(async () => {
    if (demoEnabled) return;

    try {
      const result = await fetchAllContractEvents({ startOffset: eventsMeta.apiOffset });
      const merged = mergeAndDeduplicateEvents(events, result.events);
      const sorted = sortEventsStably(merged);
      setEvents(sorted);
      setEventsMeta({ apiOffset: result.apiOffset, total: result.total, hasMore: result.hasMore });
    } catch (err) {
      console.error('Failed to load more events:', err.message || err);
    }
  }, [demoEnabled, eventsMeta.apiOffset, events]);

  const notifyTipSent = useCallback(() => {
    if (demoEnabled) return;
    dispatch({ type: 'TIP_SENT' });
  }, [demoEnabled]);

  const triggerRefresh = useCallback(() => {
    if (demoEnabled) {
      const demoEventData = demoEvents();
      setEvents(demoEventData);
      setEventsMeta({ apiOffset: demoEventData.length, total: demoEventData.length, hasMore: false });
      setLastEventRefresh(new Date());
      return;
    }
    dispatch({ type: 'REFRESH' });
  }, [demoEnabled, demoEvents]);

  const handleDemoTipAdded = useCallback((tipData) => {
    addDemoTip(tipData);
    triggerRefresh();
  }, [addDemoTip, triggerRefresh]);

  // Initial fetch and re-fetch on manual refresh triggers.
  useEffect(() => {
    refreshEvents();
  }, [refreshEvents, state.refreshCounter, demoEnabled, demoEvents]);

  // Polling interval — runs at reduced frequency when WebSocket is healthy.
  useEffect(() => {
    if (demoEnabled) return;

    const interval = wsConnected ? POLL_INTERVAL_WS_ACTIVE_MS : POLL_INTERVAL_MS;
    const id = setInterval(refreshEvents, interval);
    return () => clearInterval(id);
  }, [demoEnabled, refreshEvents, wsConnected]);

  return (
    <TipContext.Provider value={{
      ...state,
      notifyTipSent,
      triggerRefresh,
      addDemoTip: handleDemoTipAdded,
      // Shared event cache
      events,
      eventsLoading,
      eventsError,
      eventsMeta,
      lastEventRefresh,
      refreshEvents,
      loadMoreEvents,
      // WebSocket connection state
      wsStatus,
      wsConnected,
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
