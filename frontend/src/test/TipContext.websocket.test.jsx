import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { TipProvider, useTipContext } from '../context/TipContext';

// ---------------------------------------------------------------------------
// Mock DemoContext
// ---------------------------------------------------------------------------
vi.mock('../context/DemoContext', () => ({
  useDemoMode: () => ({
    demoEnabled: false,
    demoTips: [],
    addDemoTip: vi.fn(),
    demoNotifications: [],
    markNotificationRead: vi.fn(),
  }),
  DemoProvider: ({ children }) => children,
}));

// ---------------------------------------------------------------------------
// Mock contractEvents
// ---------------------------------------------------------------------------
const mockFetchAll = vi.fn();
vi.mock('../lib/contractEvents', () => ({
  POLL_INTERVAL_MS: 30_000,
  fetchAllContractEvents: (...args) => mockFetchAll(...args),
}));

// ---------------------------------------------------------------------------
// Mock useWebSocket
// ---------------------------------------------------------------------------
let wsOptions = {};

vi.mock('../hooks/useWebSocket', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useWebSocket: (_url, opts) => {
      wsOptions = opts ?? {};
      return {
        status: actual.WS_STATUS.DISCONNECTED,
        isConnected: false,
        reconnectAttempts: 0,
        send: vi.fn(),
        disconnect: vi.fn(),
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        connect: vi.fn(),
      };
    },
  };
});

// ---------------------------------------------------------------------------
// Mock WS_URL
// ---------------------------------------------------------------------------
vi.mock('../config/contracts', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, WS_URL: 'ws://localhost:3001/ws' };
});

// ---------------------------------------------------------------------------
// Test consumer
// ---------------------------------------------------------------------------
function TestConsumer() {
  const ctx = useTipContext();
  return (
    <div>
      <span data-testid="events-count">{ctx.events.length}</span>
      <span data-testid="ws-connected">{String(ctx.wsConnected)}</span>
      <span data-testid="first-tip-id">{ctx.events[0]?.tipId ?? 'none'}</span>
    </div>
  );
}

function renderWithProvider() {
  return render(<TipProvider><TestConsumer /></TipProvider>);
}

const SAMPLE_TIP = {
  event: 'tip-sent',
  tipId: 'ws-tip-1',
  sender: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  recipient: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
  amount: '1000000',
  fee: '5000',
  tx_id: '0xabc123',
  timestamp: 1700000000,
  block_height: 150,
  event_index: 0,
};

describe('TipContext WebSocket integration', () => {
  beforeEach(() => {
    wsOptions = {};
    mockFetchAll.mockReset();
    mockFetchAll.mockResolvedValue({ events: [], apiOffset: 0, total: 0, hasMore: false });
  });

  it('exposes wsConnected as false initially', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('ws-connected')).toBeInTheDocument();
    });
    expect(screen.getByTestId('ws-connected').textContent).toBe('false');
  });

  it('registers an onMessage handler with useWebSocket', () => {
    renderWithProvider();
    expect(typeof wsOptions.onMessage).toBe('function');
  });

  it('registers onConnect and onDisconnect handlers', () => {
    renderWithProvider();
    expect(typeof wsOptions.onConnect).toBe('function');
    expect(typeof wsOptions.onDisconnect).toBe('function');
  });

  it('injects a tip_event message into the event cache', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('events-count')).toBeInTheDocument();
    });

    expect(screen.getByTestId('events-count').textContent).toBe('0');

    act(() => {
      wsOptions.onMessage({ type: 'tip_event', data: SAMPLE_TIP });
    });

    await waitFor(() => {
      expect(screen.getByTestId('events-count').textContent).toBe('1');
    });
  });

  it('ignores messages with unknown type', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('events-count')).toBeInTheDocument();
    });

    act(() => {
      wsOptions.onMessage({ type: 'unknown', data: SAMPLE_TIP });
    });

    expect(screen.getByTestId('events-count').textContent).toBe('0');
  });

  it('ignores tip_event messages with no data', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('events-count')).toBeInTheDocument();
    });

    act(() => {
      wsOptions.onMessage({ type: 'tip_event', data: null });
    });

    expect(screen.getByTestId('events-count').textContent).toBe('0');
  });

  it('deduplicates a tip that already exists in the cache', async () => {
    const tipWithIndex = { ...SAMPLE_TIP, event_index: 0 };
    mockFetchAll.mockResolvedValue({
      events: [tipWithIndex],
      apiOffset: 1,
      total: 1,
      hasMore: false,
    });

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('events-count').textContent).toBe('1');
    });

    act(() => {
      wsOptions.onMessage({ type: 'tip_event', data: tipWithIndex });
    });

    // Still 1 — duplicate was merged away.
    expect(screen.getByTestId('events-count').textContent).toBe('1');
  });

  it('prepends new ws tip ahead of existing polled events', async () => {
    const existingTip = { 
      event: 'tip-sent',
      tipId: 'old-tip', 
      timestamp: 1699000000,
      block_height: 100,
      tx_id: '0xold',
      event_index: 0,
      sender: 'SPA',
      recipient: 'SPB',
      amount: '100',
    };
    mockFetchAll.mockResolvedValue({
      events: [existingTip],
      apiOffset: 1,
      total: 1,
      hasMore: false,
    });

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('events-count').textContent).toBe('1');
    });

    const newTip = { 
      event: 'tip-sent',
      tipId: 'new-tip', 
      timestamp: 1701000000,
      block_height: 200,
      tx_id: '0xnew',
      event_index: 0,
      sender: 'SPC',
      recipient: 'SPD',
      amount: '200',
    };
    act(() => {
      wsOptions.onMessage({ type: 'tip_event', data: newTip });
    });

    await waitFor(() => {
      expect(screen.getByTestId('events-count').textContent).toBe('2');
    });
  });

  it('sets wsConnected to true when onConnect fires', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('ws-connected')).toBeInTheDocument();
    });

    act(() => {
      wsOptions.onConnect();
    });

    expect(screen.getByTestId('ws-connected').textContent).toBe('true');
  });

  it('sets wsConnected to false when onDisconnect fires', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('ws-connected')).toBeInTheDocument();
    });

    act(() => { wsOptions.onConnect(); });
    expect(screen.getByTestId('ws-connected').textContent).toBe('true');

    act(() => { wsOptions.onDisconnect(); });
    expect(screen.getByTestId('ws-connected').textContent).toBe('false');
  });
});
