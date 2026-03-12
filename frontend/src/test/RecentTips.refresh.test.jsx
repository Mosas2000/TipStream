import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RecentTips from '../components/RecentTips';
import { useTipContext } from '../context/TipContext';
import { fetchTipMessages, clearTipCache } from '../lib/fetchTipDetails';

vi.mock('../context/TipContext', () => ({
    useTipContext: vi.fn(),
}));

vi.mock('../lib/fetchTipDetails', () => ({
    fetchTipMessages: vi.fn(),
    clearTipCache: vi.fn(),
}));

vi.mock('@stacks/connect', () => ({
    openContractCall: vi.fn(),
}));

vi.mock('../utils/stacks', () => ({
    network: {},
    appDetails: { name: 'TipStream', icon: 'http://localhost/logo.svg' },
    userSession: { isUserSignedIn: vi.fn(() => false), loadUserData: vi.fn(() => ({})) },
    getSenderAddress: vi.fn(() => 'SP1SENDER'),
}));

describe('RecentTips refresh behavior', () => {
    const refreshEvents = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        fetchTipMessages.mockResolvedValue(new Map([['1', 'hello']]));
        useTipContext.mockReturnValue({
            events: [
                {
                    event: 'tip-sent',
                    tipId: '1',
                    sender: 'SP1SENDER',
                    recipient: 'SP2RECIPIENT',
                    amount: '1000000',
                    fee: '50000',
                    timestamp: 1700000000,
                    txId: '0xabc',
                },
            ],
            eventsLoading: false,
            eventsError: null,
            eventsMeta: { total: 1, hasMore: false },
            lastEventRefresh: new Date('2026-03-12T12:00:00Z'),
            refreshEvents,
            loadMoreEvents: vi.fn(),
        });
    });

    it('does not clear the tip cache during automatic message enrichment', async () => {
        render(<RecentTips addToast={vi.fn()} />);

        await waitFor(() => {
            expect(fetchTipMessages).toHaveBeenCalledWith(['1']);
        });

        expect(clearTipCache).not.toHaveBeenCalled();
    });

    it('clears the tip cache when user clicks Refresh', async () => {
        render(<RecentTips addToast={vi.fn()} />);

        const refreshButton = await screen.findByLabelText('Refresh tip feed');
        fireEvent.click(refreshButton);

        expect(clearTipCache).toHaveBeenCalledTimes(1);
        expect(refreshEvents).toHaveBeenCalledTimes(1);
    });

    it('clears the tip cache when user clicks Retry in error state', () => {
        useTipContext.mockReturnValue({
            events: [],
            eventsLoading: false,
            eventsError: 'Failed to load events',
            eventsMeta: { total: 0, hasMore: false },
            lastEventRefresh: null,
            refreshEvents,
            loadMoreEvents: vi.fn(),
        });

        render(<RecentTips addToast={vi.fn()} />);
        fireEvent.click(screen.getByText('Retry'));

        expect(clearTipCache).toHaveBeenCalledTimes(1);
        expect(refreshEvents).toHaveBeenCalledTimes(1);
    });
});
