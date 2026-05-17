import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket, WS_STATUS } from './useWebSocket';

// Minimal WebSocket mock that tracks instances and lets tests control events.
class MockWebSocket {
  static instances = [];
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this.sentMessages = [];
    MockWebSocket.instances.push(this);
  }

  send(data) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen();
  }

  simulateMessage(data) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(data) });
  }

  simulateError() {
    if (this.onerror) this.onerror(new Event('error'));
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

function latestSocket() {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1];
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useWebSocket', () => {
  describe('initial state', () => {
    it('starts disconnected when disabled', () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: false })
      );
      expect(result.current.status).toBe(WS_STATUS.DISCONNECTED);
      expect(result.current.isConnected).toBe(false);
    });

    it('starts connecting when enabled with a url', () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );
      expect(result.current.status).toBe(WS_STATUS.CONNECTING);
    });

    it('does not connect when url is null', () => {
      const { result } = renderHook(() =>
        useWebSocket(null, { enabled: true })
      );
      expect(result.current.status).toBe(WS_STATUS.DISCONNECTED);
      expect(MockWebSocket.instances).toHaveLength(0);
    });
  });

  describe('connection lifecycle', () => {
    it('transitions to connected on open', async () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      act(() => latestSocket().simulateOpen());

      expect(result.current.status).toBe(WS_STATUS.CONNECTED);
      expect(result.current.isConnected).toBe(true);
    });

    it('calls onConnect callback when connection opens', async () => {
      const onConnect = vi.fn();
      renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true, onConnect })
      );

      act(() => latestSocket().simulateOpen());

      expect(onConnect).toHaveBeenCalledTimes(1);
    });

    it('transitions to disconnected on close', async () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      act(() => latestSocket().simulateOpen());
      expect(result.current.status).toBe(WS_STATUS.CONNECTED);

      act(() => latestSocket().simulateClose());
      expect(result.current.status).toBe(WS_STATUS.DISCONNECTED);
    });

    it('calls onDisconnect callback when connection closes', () => {
      const onDisconnect = vi.fn();
      renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true, onDisconnect })
      );

      act(() => {
        latestSocket().simulateOpen();
        latestSocket().simulateClose();
      });

      expect(onDisconnect).toHaveBeenCalledTimes(1);
    });

    it('transitions to error state on socket error', () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      act(() => latestSocket().simulateError());

      expect(result.current.status).toBe(WS_STATUS.ERROR);
    });

    it('calls onError callback on socket error', () => {
      const onError = vi.fn();
      renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true, onError })
      );

      act(() => latestSocket().simulateError());

      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('closes socket on unmount', () => {
      const { unmount } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      const ws = latestSocket();
      act(() => ws.simulateOpen());

      unmount();

      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    });
  });

  describe('message handling', () => {
    it('calls onMessage with parsed message data', () => {
      const onMessage = vi.fn();
      renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true, onMessage })
      );

      act(() => {
        latestSocket().simulateOpen();
        latestSocket().simulateMessage({ type: 'tip_event', data: { tipId: '1' } });
      });

      expect(onMessage).toHaveBeenCalledWith({ type: 'tip_event', data: { tipId: '1' } });
    });

    it('does not call onMessage for ping messages', () => {
      const onMessage = vi.fn();
      renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true, onMessage })
      );

      act(() => {
        latestSocket().simulateOpen();
        latestSocket().simulateMessage({ type: 'ping' });
      });

      expect(onMessage).not.toHaveBeenCalled();
    });

    it('silently ignores malformed message data', () => {
      const onMessage = vi.fn();
      renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true, onMessage })
      );

      act(() => {
        latestSocket().simulateOpen();
        // Directly fire with bad JSON
        const ws = latestSocket();
        if (ws.onmessage) ws.onmessage({ data: 'not-json' });
      });

      expect(onMessage).not.toHaveBeenCalled();
    });
  });

  describe('address subscription', () => {
    it('sends subscribe message on open when subscribeAddress is set', () => {
      renderHook(() =>
        useWebSocket('ws://localhost/ws', {
          enabled: true,
          subscribeAddress: 'SP123',
        })
      );

      act(() => latestSocket().simulateOpen());

      const sent = latestSocket().sentMessages.map(m => JSON.parse(m));
      expect(sent).toContainEqual({ type: 'subscribe', address: 'SP123' });
    });

    it('does not send subscribe when no address is set', () => {
      renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      act(() => latestSocket().simulateOpen());

      expect(latestSocket().sentMessages).toHaveLength(0);
    });
  });

  describe('send helper', () => {
    it('returns true and sends data when connected', () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      act(() => latestSocket().simulateOpen());

      let sent;
      act(() => {
        sent = result.current.send({ type: 'test' });
      });

      expect(sent).toBe(true);
      expect(latestSocket().sentMessages).toContain(JSON.stringify({ type: 'test' }));
    });

    it('returns false when not connected', () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      let sent;
      act(() => {
        sent = result.current.send({ type: 'test' });
      });

      expect(sent).toBe(false);
    });
  });

  describe('reconnection', () => {
    it('schedules reconnect after disconnect', async () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      act(() => {
        latestSocket().simulateOpen();
        latestSocket().simulateClose();
      });

      expect(result.current.reconnectAttempts).toBe(1);

      // Advance past reconnect delay
      act(() => vi.advanceTimersByTime(3500));

      // A new socket should have been created
      expect(MockWebSocket.instances).toHaveLength(2);
    });

    it('shows reconnecting status during reconnect attempt', () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      act(() => {
        latestSocket().simulateOpen();
        latestSocket().simulateClose();
      });

      act(() => vi.advanceTimersByTime(3500));

      expect(result.current.status).toBe(WS_STATUS.RECONNECTING);
    });

    it('resets reconnect attempts after successful reconnect', () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      act(() => {
        latestSocket().simulateOpen();
        latestSocket().simulateClose();
      });

      act(() => vi.advanceTimersByTime(3500));
      act(() => latestSocket().simulateOpen());

      expect(result.current.reconnectAttempts).toBe(0);
      expect(result.current.status).toBe(WS_STATUS.CONNECTED);
    });

    it('stops reconnecting after max attempts', () => {
      renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      // Exhaust all 5 reconnect attempts
      for (let i = 0; i <= 5; i++) {
        act(() => {
          if (latestSocket()) latestSocket().simulateClose();
        });
        act(() => vi.advanceTimersByTime(3500));
      }

      const totalSockets = MockWebSocket.instances.length;

      // No more sockets should be created after max attempts
      act(() => vi.advanceTimersByTime(10000));
      expect(MockWebSocket.instances.length).toBe(totalSockets);
    });
  });

  describe('disconnect helper', () => {
    it('closes the socket and resets state', () => {
      const { result } = renderHook(() =>
        useWebSocket('ws://localhost/ws', { enabled: true })
      );

      act(() => latestSocket().simulateOpen());
      expect(result.current.isConnected).toBe(true);

      act(() => result.current.disconnect());

      expect(result.current.status).toBe(WS_STATUS.DISCONNECTED);
      expect(result.current.reconnectAttempts).toBe(0);
    });
  });
});
