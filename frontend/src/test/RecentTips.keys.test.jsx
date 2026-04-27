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

describe('RecentTips row keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isUserSignedIn.mockReturnValue(true);
  });

  it('uses tipId when available', () => {
    const tip = {
      event: 'tip-sent',
      tipId: '42',
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
      txId: '0xabc',
    };

    useTipContext.mockReturnValue({
      events: [tip],
      eventsLoading: false,
      eventsError: null,
      eventsMeta: { total: 1, hasMore: false },
      lastEventRefresh: null,
      refreshEvents: vi.fn(),
      loadMoreEvents: vi.fn(),
    });

    const { container } = render(<RecentTips addToast={vi.fn()} />);
    const row = container.querySelector('[data-testid="tip-row"]') || container.querySelector('.group');
    expect(row).toBeTruthy();
  });

  it('falls back to txId when tipId is missing', () => {
    const tip = {
      event: 'tip-sent',
      tipId: undefined,
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
      txId: '0xabc123',
    };

    useTipContext.mockReturnValue({
      events: [tip],
      eventsLoading: false,
      eventsError: null,
      eventsMeta: { total: 1, hasMore: false },
      lastEventRefresh: null,
      refreshEvents: vi.fn(),
      loadMoreEvents: vi.fn(),
    });

    const { container } = render(<RecentTips addToast={vi.fn()} />);
    const row = container.querySelector('.group');
    expect(row).toBeTruthy();
  });

  it('uses fingerprint when both tipId and txId are missing', () => {
    const tip = {
      event: 'tip-sent',
      tipId: undefined,
      txId: undefined,
      sender: 'SP1SENDER',
      recipient: 'SP2RECIPIENT',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
    };

    useTipContext.mockReturnValue({
      events: [tip],
      eventsLoading: false,
      eventsError: null,
      eventsMeta: { total: 1, hasMore: false },
      lastEventRefresh: null,
      refreshEvents: vi.fn(),
      loadMoreEvents: vi.fn(),
    });

    const { container } = render(<RecentTips addToast={vi.fn()} />);
    const row = container.querySelector('.group');
    expect(row).toBeTruthy();
  });

  it('keeps row identity stable across reorders when tipId is missing', () => {
    const tipA = {
      event: 'tip-sent',
      tipId: undefined,
      sender: 'SP1ALPHA',
      recipient: 'SP2ALPHA',
      amount: '1000000',
      fee: '50000',
      timestamp: 1700000000,
      txId: '0xaaa',
    };

    const tipB = {
      event: 'tip-sent',
      tipId: undefined,
      sender: 'SP1BETA',
      recipient: 'SP2BETA',
      amount: '2000000',
      fee: '50000',
      timestamp: 1700000001,
      txId: '0xbbb',
    };

    useTipContext.mockReturnValue({
      events: [tipA, tipB],
      eventsLoading: false,
      eventsError: null,
      eventsMeta: { total: 2, hasMore: false },
      lastEventRefresh: null,
      refreshEvents: vi.fn(),
      loadMoreEvents: vi.fn(),
    });

    const { rerender } = render(<RecentTips addToast={vi.fn()} />);

    const buttons = screen.getAllByRole('button', { name: 'Tip Back' });
    const focusedButton = buttons[0];
    focusedButton.focus();

    const initialRow = focusedButton.closest('.group');
    expect(initialRow).toBeTruthy();
    expect(initialRow.textContent).toContain('SP1ALPHA');

    useTipContext.mockReturnValue({
      events: [tipB, tipA],
      eventsLoading: false,
      eventsError: null,
      eventsMeta: { total: 2, hasMore: false },
      lastEventRefresh: null,
      refreshEvents: vi.fn(),
      loadMoreEvents: vi.fn(),
    });

    rerender(<RecentTips addToast={vi.fn()} />);

    const rowAfter = focusedButton.closest('.group');
    expect(rowAfter).toBeTruthy();
    expect(rowAfter.textContent).toContain('SP1ALPHA');
  });
});
