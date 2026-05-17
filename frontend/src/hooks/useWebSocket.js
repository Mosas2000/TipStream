import { useEffect, useRef, useState, useCallback } from 'react';

const WS_RECONNECT_DELAY_MS = 3000;
const WS_MAX_RECONNECT_ATTEMPTS = 5;
const WS_HEARTBEAT_TIMEOUT_MS = 35000;

export const WS_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  RECONNECTING: 'reconnecting',
};

/**
 * Low-level WebSocket hook. Manages connection lifecycle, automatic
 * reconnection with backoff, heartbeat monitoring, and address-based
 * subscription messages.
 *
 * @param {string|null} url - WebSocket URL to connect to.
 * @param {object} options
 * @param {boolean}  [options.enabled=true]         - Whether to connect at all.
 * @param {function} [options.onMessage]            - Called with each parsed message.
 * @param {function} [options.onConnect]            - Called when connection opens.
 * @param {function} [options.onDisconnect]         - Called when connection closes.
 * @param {function} [options.onError]              - Called on socket error.
 * @param {string|null} [options.subscribeAddress]  - STX address to subscribe to.
 */
export function useWebSocket(url, options = {}) {
  const {
    enabled = true,
    onMessage = null,
    onConnect = null,
    onDisconnect = null,
    onError = null,
    subscribeAddress = null,
  } = options;

  const [status, setStatus] = useState(WS_STATUS.DISCONNECTED);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const currentAddressRef = useRef(subscribeAddress);
  const enabledRef = useRef(enabled);

  // Keep refs in sync so closures always see current values.
  enabledRef.current = enabled;

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const resetHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
    }
    heartbeatTimerRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    }, WS_HEARTBEAT_TIMEOUT_MS);
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((address) => {
    currentAddressRef.current = address;
    return send({ type: 'subscribe', address });
  }, [send]);

  const unsubscribe = useCallback(() => {
    currentAddressRef.current = null;
    return send({ type: 'unsubscribe' });
  }, [send]);

  // connect is defined without reconnectAttempts in deps to avoid re-creating
  // it on every attempt increment. It reads the ref instead.
  const connect = useCallback(() => {
    if (!enabledRef.current || !url) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    clearTimers();

    const attempts = reconnectAttemptsRef.current;
    setStatus(attempts > 0 ? WS_STATUS.RECONNECTING : WS_STATUS.CONNECTING);

    let ws;
    try {
      ws = new WebSocket(url);
    } catch {
      setStatus(WS_STATUS.ERROR);
      if (onError) onError(new Error('Failed to create WebSocket'));
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setStatus(WS_STATUS.CONNECTED);
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      resetHeartbeat();

      if (currentAddressRef.current) {
        ws.send(JSON.stringify({ type: 'subscribe', address: currentAddressRef.current }));
      }

      if (onConnect) onConnect();
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      resetHeartbeat();

      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      // Server-side pings are handled by the heartbeat reset above.
      if (message.type === 'ping') return;

      if (onMessage) onMessage(message);
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setStatus(WS_STATUS.ERROR);
      if (onError) onError(new Error('WebSocket connection error'));
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      clearTimers();
      setStatus(WS_STATUS.DISCONNECTED);
      if (onDisconnect) onDisconnect();

      if (enabledRef.current && reconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current += 1;
        setReconnectAttempts(reconnectAttemptsRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, WS_RECONNECT_DELAY_MS);
      }
    };
  }, [url, onMessage, onConnect, onDisconnect, onError, clearTimers, resetHeartbeat]);

  const disconnect = useCallback(() => {
    clearTimers();
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus(WS_STATUS.DISCONNECTED);
  }, [clearTimers]);

  // Connect / disconnect when enabled or url changes.
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && url) {
      connect();
    } else if (!enabled) {
      disconnect();
    }

    return () => {
      mountedRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // connect / disconnect are stable; url and enabled are the real triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, url]);

  // Re-subscribe when the address prop changes while connected.
  useEffect(() => {
    if (subscribeAddress === currentAddressRef.current) return;

    if (subscribeAddress) {
      subscribe(subscribeAddress);
    } else if (currentAddressRef.current) {
      unsubscribe();
    }
  }, [subscribeAddress, subscribe, unsubscribe]);

  return {
    status,
    isConnected: status === WS_STATUS.CONNECTED,
    reconnectAttempts,
    send,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
  };
}
