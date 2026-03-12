import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TipHistory from '../components/TipHistory';
import { useTipContext } from '../context/TipContext';
import { fetchTipMessages, clearTipCache } from '../lib/fetchTipDetails';
import { fetchCallReadOnlyFunction, cvToJSON } from '@stacks/transactions';

vi.mock('../context/TipContext', () => ({
    useTipContext: vi.fn(),
}));

vi.mock('../lib/fetchTipDetails', () => ({
    fetchTipMessages: vi.fn(),
    clearTipCache: vi.fn(),
}));

vi.mock('@stacks/transactions', () => ({
    fetchCallReadOnlyFunction: vi.fn(),
    cvToJSON: vi.fn(),
    principalCV: vi.fn(v => v),
}));

vi.mock('../utils/stacks', () => ({
    network: {},
}));

describe('TipHistory refresh behavior', () => {
    const refreshEvents = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

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

        fetchTipMessages.mockResolvedValue(new Map([['1', 'hello']]));
        fetchCallReadOnlyFunction.mockResolvedValue({});
        cvToJSON.mockReturnValue({
            value: {
                'tips-sent': { value: '1' },
                'tips-received': { value: '2' },
                'total-sent': { value: '1000000' },
                'total-received': { value: '2000000' },
            },
        });
    });

    it('does not clear the tip cache during automatic message enrichment', async () => {
        render(<TipHistory userAddress="SP1SENDER" />);

        await waitFor(() => {
            expect(fetchTipMessages).toHaveBeenCalledWith(['1']);
        });

        expect(clearTipCache).not.toHaveBeenCalled();
    });

    it('deduplicates repeated tip IDs before message enrichment fetch', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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
                    txId: '0xaaa',
                },
                {
                    event: 'tip-sent',
                    tipId: '1',
                    sender: 'SP1SENDER',
                    recipient: 'SP2RECIPIENT',
                    amount: '1000000',
                    fee: '50000',
                    timestamp: 1700000001,
                    txId: '0xbbb',
                },
            ],
            eventsLoading: false,
            eventsError: null,
            eventsMeta: { total: 2, hasMore: false },
            lastEventRefresh: new Date('2026-03-12T12:00:00Z'),
            refreshEvents,
            loadMoreEvents: vi.fn(),
        });

        render(<TipHistory userAddress="SP1SENDER" />);

        await waitFor(() => {
            expect(fetchTipMessages).toHaveBeenCalledWith(['1']);
        });

        consoleSpy.mockRestore();
    });

    it('clears the tip cache when user clicks Refresh', async () => {
        render(<TipHistory userAddress="SP1SENDER" />);

        const refreshButton = await screen.findByLabelText('Refresh activity');
        fireEvent.click(refreshButton);

        expect(clearTipCache).toHaveBeenCalledTimes(1);
        expect(refreshEvents).toHaveBeenCalledTimes(1);
        expect(clearTipCache.mock.invocationCallOrder[0]).toBeLessThan(refreshEvents.mock.invocationCallOrder[0]);
    });

    it('clears the tip cache when user clicks Retry in error state', async () => {
        useTipContext.mockReturnValue({
            events: [],
            eventsLoading: false,
            eventsError: 'Failed to load events',
            eventsMeta: { total: 0, hasMore: false },
            lastEventRefresh: null,
            refreshEvents,
            loadMoreEvents: vi.fn(),
        });

        render(<TipHistory userAddress="SP1SENDER" />);
        const retryButton = await screen.findByText('Retry');
        fireEvent.click(retryButton);

        expect(clearTipCache).toHaveBeenCalledTimes(1);
        expect(refreshEvents).toHaveBeenCalledTimes(1);
        expect(clearTipCache.mock.invocationCallOrder[0]).toBeLessThan(refreshEvents.mock.invocationCallOrder[0]);
    });
});
