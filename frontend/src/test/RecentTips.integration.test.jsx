import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecentTips from '../components/RecentTips';
import { useTipContext } from '../context/TipContext';

const { isUserSignedIn } = vi.hoisted(() => ({
  isUserSignedIn: vi.fn(() => true),
}));

vi.mock('../context/TipContext', () => ({
  useTipContext: vi.fn(),
}));

vi.mock('../context/DemoContext', () => ({
  useDemoMode: vi.fn(() => ({
    demoEnabled: false,
    setDemoBalance: vi.fn(),
  })),
}));

vi.mock('../lib/fetchTipDetails', () => ({
  fetchTipMessages: vi.fn(() => Promise.resolve(new Map())),
  clearTipCache: vi.fn(),
}));

vi.mock('@stacks/connect', () => ({
  openContractCall: vi.fn(),
}));

vi.mock('../utils/stacks', () => ({
  network: {},
  appDetails: { name: 'TipStream', icon: 'http://localhost/logo.svg' },
  userSession: { isUserSignedIn, loadUserData: vi.fn(() => ({})) },
  getSenderAddress: vi.fn(() => 'SP1SENDER'),
}));

describe('RecentTips integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isUserSignedIn.mockReturnValue(true);
  });

  it('renders multiple tips with stable keys', () => {
    const tips = [
      {
        event: 'tip-sent',
        tipId: '1',
        sender: 'SP1SENDER1',
        recipient: 'SP2RECIPIENT1',
        amount: '1000000',
        fee: '50000',
        timestamp: 1700000000,
        txId: '0xaaa',
      },
      {
        event: 'tip-sent',
        tipId: '2',
        sender: 'SP1SENDER2',
        recipient: 'SP2RECIPIENT2',
        amount: '2000000',
        fee: '50000',
        timestamp: 1700000001,
        txId: '0xbbb',
      },
    ];

    useTipContext.mockReturnValue({
      events: tips,
      eventsLoading: false,
      eventsError: null,
      eventsMeta: { total: 2, hasMore: false },
      lastEventRefresh: null,
      refreshEvents: vi.fn(),
      loadMoreEvents: vi.fn(),
    });

    const { container } = render(<RecentTips addToast={vi.fn()} />);
    const rows = container.querySelectorAll('.group');
    expect(rows.length).toBe(2);
  });

  it('handles mixed tip types with different key strategies', () => {
    const tips = [
      {
        event: 'tip-sent',
        tipId: '1',
        sender: 'SP1SENDER1',
        recipient: 'SP2RECIPIENT1',
        amount: '1000000',
        fee: '50000',
        timestamp: 1700000000,
        txId: '0xaaa',
      },
      {
        event: 'tip-sent',
        tipId: undefined,
        sender: 'SP1SENDER2',
        recipient: 'SP2RECIPIENT2',
        amount: '2000000',
        fee: '50000',
        timestamp: 1700000001,
        txId: '0xbbb',
      },
      {
        event: 'tip-sent',
        tipId: undefined,
        txId: undefined,
        sender: 'SP1SENDER3',
        recipient: 'SP2RECIPIENT3',
        amount: '3000000',
        fee: '50000',
        timestamp: 1700000002,
      },
    ];

    useTipContext.mockReturnValue({
      events: tips,
      eventsLoading: false,
      eventsError: null,
      eventsMeta: { total: 3, hasMore: false },
      lastEventRefresh: null,
      refreshEvents: vi.fn(),
      loadMoreEvents: vi.fn(),
    });

    const { container } = render(<RecentTips addToast={vi.fn()} />);
    const rows = container.querySelectorAll('.group');
    expect(rows.length).toBe(3);
  });
});
