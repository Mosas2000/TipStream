import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { TipProvider, useTipContext } from '../context/TipContext';

// ---------------------------------------------------------------------------
// Mock contractEvents so the provider never hits the network.
// ---------------------------------------------------------------------------
const mockFetchAll = vi.fn();
vi.mock('../lib/contractEvents', () => ({
    POLL_INTERVAL_MS: 30_000,
    fetchAllContractEvents: (...args) => mockFetchAll(...args),
}));

// ---------------------------------------------------------------------------
// Test consumer that exposes context values to the DOM.
// ---------------------------------------------------------------------------
function TestConsumer() {
    const ctx = useTipContext();
    return (
        <div>
            <span data-testid="events-count">{ctx.events.length}</span>
            <span data-testid="events-loading">{String(ctx.eventsLoading)}</span>
            <span data-testid="events-error">{ctx.eventsError ?? 'none'}</span>
            <span data-testid="has-more">{String(ctx.eventsMeta.hasMore)}</span>
            <span data-testid="total">{ctx.eventsMeta.total}</span>
            <span data-testid="refresh-counter">{ctx.refreshCounter}</span>
            <button data-testid="refresh-btn" onClick={ctx.refreshEvents}>Refresh</button>
            <button data-testid="load-more-btn" onClick={ctx.loadMoreEvents}>Load More</button>
            <button data-testid="trigger-refresh-btn" onClick={ctx.triggerRefresh}>Trigger</button>
            <button data-testid="notify-tip-sent-btn" onClick={ctx.notifyTipSent}>Notify</button>
        </div>
    );
}

function renderWithProvider() {
    return render(
        <TipProvider><TestConsumer /></TipProvider>
    );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TipContext shared event cache', () => {
    beforeEach(() => {
        mockFetchAll.mockReset();
    });

    it('starts in a loading state', () => {
        mockFetchAll.mockReturnValue(new Promise(() => {})); // never resolves
        renderWithProvider();
        expect(screen.getByTestId('events-loading').textContent).toBe('true');
        expect(screen.getByTestId('events-count').textContent).toBe('0');
    });

    it('populates events after initial fetch resolves', async () => {
        const fakeEvents = [
            { event: 'tip-sent', tipId: '1', sender: 'SP1A', recipient: 'SP2B', amount: '1000000' },
            { event: 'tip-sent', tipId: '2', sender: 'SP3C', recipient: 'SP4D', amount: '2000000' },
        ];
        mockFetchAll.mockResolvedValue({ events: fakeEvents, apiOffset: 2, total: 10, hasMore: true });

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('events-loading').textContent).toBe('false');
        });

        expect(screen.getByTestId('events-count').textContent).toBe('2');
        expect(screen.getByTestId('has-more').textContent).toBe('true');
        expect(screen.getByTestId('total').textContent).toBe('10');
    });

    it('displays error state when fetch fails', async () => {
        mockFetchAll.mockRejectedValue(new Error('Network down'));

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('events-loading').textContent).toBe('false');
        });

        expect(screen.getByTestId('events-error').textContent).toBe('Network down');
    });

    it('classifies network errors with a user-friendly message', async () => {
        const netErr = new TypeError('Failed to fetch');
        mockFetchAll.mockRejectedValue(netErr);

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('events-error').textContent).toContain('Unable to reach the Stacks API');
        });
    });

    it('appends events when loadMoreEvents is called', async () => {
        const initial = [{ event: 'tip-sent', tipId: '1', sender: 'SP1', recipient: 'SP2', amount: '100' }];
        const more = [{ event: 'tip-sent', tipId: '2', sender: 'SP3', recipient: 'SP4', amount: '200' }];

        mockFetchAll
            .mockResolvedValueOnce({ events: initial, apiOffset: 50, total: 100, hasMore: true })
            .mockResolvedValueOnce({ events: more, apiOffset: 100, total: 100, hasMore: false });

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('events-count').textContent).toBe('1');
        });

        await act(async () => {
            screen.getByTestId('load-more-btn').click();
        });

        await waitFor(() => {
            expect(screen.getByTestId('events-count').textContent).toBe('2');
        });
        expect(screen.getByTestId('has-more').textContent).toBe('false');
    });

    it('refreshes when triggerRefresh is called', async () => {
        const events1 = [{ event: 'tip-sent', tipId: '1', sender: 'SP1', recipient: 'SP2', amount: '100' }];
        const events2 = [
            { event: 'tip-sent', tipId: '1', sender: 'SP1', recipient: 'SP2', amount: '100' },
            { event: 'tip-sent', tipId: '2', sender: 'SP3', recipient: 'SP4', amount: '200' },
        ];

        mockFetchAll
            .mockResolvedValueOnce({ events: events1, apiOffset: 1, total: 1, hasMore: false })
            .mockResolvedValueOnce({ events: events2, apiOffset: 2, total: 2, hasMore: false });

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('events-count').textContent).toBe('1');
        });

        await act(async () => {
            screen.getByTestId('trigger-refresh-btn').click();
        });

        await waitFor(() => {
            expect(screen.getByTestId('events-count').textContent).toBe('2');
        });
    });

    it('provides notifyTipSent that bumps refreshCounter', async () => {
        mockFetchAll.mockResolvedValue({ events: [], apiOffset: 0, total: 0, hasMore: false });

        renderWithProvider();

        await waitFor(() => {
            expect(screen.getByTestId('refresh-counter').textContent).toBe('0');
        });

        await act(async () => {
            screen.getByTestId('notify-tip-sent-btn').click();
        });

        expect(screen.getByTestId('refresh-counter').textContent).toBe('1');
    });

    it('throws when useTipContext is used outside the provider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<TestConsumer />)).toThrow('useTipContext must be used within a TipProvider');
        spy.mockRestore();
    });
});
