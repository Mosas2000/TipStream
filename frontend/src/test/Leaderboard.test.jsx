import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Leaderboard from '../components/Leaderboard';
import { useTipContext } from '../context/TipContext';

vi.mock('../context/TipContext', () => ({
    useTipContext: vi.fn(),
}));

const mockEvents = [
    { event: 'tip-sent', sender: 'SP1SENDER', recipient: 'SP2RECV', amount: '5000000', timestamp: 1700000000 },
    { event: 'tip-sent', sender: 'SP3OTHER', recipient: 'SP1SENDER', amount: '3000000', timestamp: 1700000001 },
    { event: 'tip-sent', sender: 'SP1SENDER', recipient: 'SP3OTHER', amount: '2000000', timestamp: 1700000002 },
];

function defaultContext(overrides = {}) {
    return {
        events: mockEvents,
        eventsLoading: false,
        eventsRefreshing: false,
        eventsError: null,
        eventsMeta: { total: 3, hasMore: false },
        lastEventRefresh: new Date('2026-03-12T12:00:00Z'),
        refreshEvents: vi.fn(),
        loadMoreEvents: vi.fn(),
        ...overrides,
    };
}

describe('Leaderboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useTipContext.mockReturnValue(defaultContext());
    });

    it('renders the Leaderboard heading', () => {
        render(<Leaderboard />);
        expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    });

    it('shows loading skeleton when eventsLoading is true', () => {
        useTipContext.mockReturnValue(defaultContext({ eventsLoading: true }));
        const { container } = render(<Leaderboard />);
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows error state with Retry button', () => {
        const refreshEvents = vi.fn();
        useTipContext.mockReturnValue(defaultContext({
            eventsError: 'Something went wrong',
            events: [],
            refreshEvents,
        }));
        render(<Leaderboard />);
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Retry'));
        expect(refreshEvents).toHaveBeenCalledTimes(1);
    });

    it('renders Top Senders and Top Receivers tabs', () => {
        render(<Leaderboard />);
        expect(screen.getByText('Top Senders')).toBeInTheDocument();
        expect(screen.getByText('Top Receivers')).toBeInTheDocument();
    });

    it('switches between tabs', () => {
        render(<Leaderboard />);
        fireEvent.click(screen.getByText('Top Receivers'));
        const items = screen.getAllByText(/tips received/);
        expect(items.length).toBeGreaterThan(0);
    });

    it('shows the Refresh button', () => {
        render(<Leaderboard />);
        expect(screen.getByLabelText('Refresh leaderboard')).toBeInTheDocument();
    });

    it('calls refreshEvents when Refresh is clicked', () => {
        const refreshEvents = vi.fn();
        useTipContext.mockReturnValue(defaultContext({ refreshEvents }));
        render(<Leaderboard />);
        fireEvent.click(screen.getByLabelText('Refresh leaderboard'));
        expect(refreshEvents).toHaveBeenCalledTimes(1);
    });

    it('disables Refresh button when refreshing', () => {
        useTipContext.mockReturnValue(defaultContext({ eventsRefreshing: true }));
        render(<Leaderboard />);
        const btn = screen.getByLabelText('Refresh leaderboard');
        expect(btn).toBeDisabled();
        expect(btn.textContent).toBe('Refreshing...');
    });

    it('shows Refresh text when not refreshing', () => {
        render(<Leaderboard />);
        const btn = screen.getByLabelText('Refresh leaderboard');
        expect(btn).not.toBeDisabled();
        expect(btn.textContent).toBe('Refresh');
    });

    it('shows last refresh timestamp', () => {
        const ts = new Date('2026-03-12T12:00:00Z');
        useTipContext.mockReturnValue(defaultContext({ lastEventRefresh: ts }));
        render(<Leaderboard />);
        const expected = ts.toLocaleTimeString();
        expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it('shows empty state when no events', () => {
        useTipContext.mockReturnValue(defaultContext({ events: [] }));
        render(<Leaderboard />);
        expect(screen.getByText(/No activity yet/)).toBeInTheDocument();
    });

    it('shows Load More button when hasMore is true', () => {
        useTipContext.mockReturnValue(defaultContext({
            eventsMeta: { total: 100, hasMore: true },
        }));
        render(<Leaderboard />);
        expect(screen.getByLabelText('Load more events for accurate rankings')).toBeInTheDocument();
    });

    it('hides Load More button when hasMore is false', () => {
        render(<Leaderboard />);
        expect(screen.queryByLabelText('Load more events for accurate rankings')).not.toBeInTheDocument();
    });

    it('displays ranked users with STX amounts', () => {
        render(<Leaderboard />);
        expect(screen.getByText(/7\.00 STX/)).toBeInTheDocument();
    });

    it('ranks senders by total sent descending', () => {
        render(<Leaderboard />);
        // Default tab is "sent", all addresses with any activity are shown.
        // SP1SENDER sent 5+2=7 STX total (rank 1), so the first entry
        // should display the highest amount.
        const stxAmounts = screen.getAllByText(/STX$/);
        expect(stxAmounts[0].textContent).toContain('7.00');
    });

    it('assigns medal classes to top-3 positions', () => {
        const manyEvents = [
            { event: 'tip-sent', sender: 'SP1A', recipient: 'SP2B', amount: '9000000', timestamp: 1 },
            { event: 'tip-sent', sender: 'SP3C', recipient: 'SP4D', amount: '7000000', timestamp: 2 },
            { event: 'tip-sent', sender: 'SP5E', recipient: 'SP6F', amount: '5000000', timestamp: 3 },
            { event: 'tip-sent', sender: 'SP7G', recipient: 'SP8H', amount: '3000000', timestamp: 4 },
        ];
        useTipContext.mockReturnValue(defaultContext({ events: manyEvents }));
        const { container } = render(<Leaderboard />);
        const medals = container.querySelectorAll('.bg-yellow-100, .bg-gray-100, .bg-orange-100');
        expect(medals.length).toBeGreaterThanOrEqual(2);
    });

    it('hides timestamp when lastEventRefresh is null', () => {
        useTipContext.mockReturnValue(defaultContext({ lastEventRefresh: null }));
        render(<Leaderboard />);
        const ts = new Date('2026-03-12T12:00:00Z').toLocaleTimeString();
        expect(screen.queryByText(ts)).not.toBeInTheDocument();
    });

    it('filters out non-tip-sent events from leaderboard stats', () => {
        const mixed = [
            { event: 'tip-sent', sender: 'SP1A', recipient: 'SP2B', amount: '5000000', timestamp: 1 },
            { event: 'tip-categorized', tipId: '1', category: '3', timestamp: 2 },
            { event: 'tip-sent', sender: 'SP1A', recipient: 'SP2B', amount: '0', timestamp: 3 },
        ];
        useTipContext.mockReturnValue(defaultContext({ events: mixed }));
        render(<Leaderboard />);
        // 5.00 STX shows in both the row and the footer Total
        const matches = screen.getAllByText(/5\.00 STX/);
        expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('shows the total in the footer', () => {
        render(<Leaderboard />);
        expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });

    it('shows user count in footer text', () => {
        render(<Leaderboard />);
        expect(screen.getByText(/Showing top/)).toBeInTheDocument();
    });

    it('calls loadMoreEvents when Load More is clicked', async () => {
        const loadMore = vi.fn().mockResolvedValue();
        useTipContext.mockReturnValue(defaultContext({
            eventsMeta: { total: 100, hasMore: true },
            loadMoreEvents: loadMore,
        }));
        render(<Leaderboard />);
        await act(async () => {
            fireEvent.click(screen.getByLabelText('Load more events for accurate rankings'));
        });
        expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it('switches back to Senders tab from Receivers', () => {
        render(<Leaderboard />);
        fireEvent.click(screen.getByText('Top Receivers'));
        fireEvent.click(screen.getByText('Top Senders'));
        const items = screen.getAllByText(/tips sent/);
        expect(items.length).toBeGreaterThan(0);
    });

    it('applies disabled:opacity-50 class when refreshing', () => {
        useTipContext.mockReturnValue(defaultContext({ eventsRefreshing: true }));
        render(<Leaderboard />);
        const btn = screen.getByLabelText('Refresh leaderboard');
        expect(btn.className).toContain('disabled:opacity-50');
    });

    it('shows event count breakdown in footer when total is available', () => {
        useTipContext.mockReturnValue(defaultContext({
            eventsMeta: { total: 50, hasMore: true },
        }));
        render(<Leaderboard />);
        expect(screen.getByText(/events of 50 total/)).toBeInTheDocument();
    });

    it('limits display to 20 users', () => {
        const events = Array.from({ length: 25 }, (_, i) => ({
            event: 'tip-sent',
            sender: `SP_SENDER_${i}`,
            recipient: `SP_RECV_${i}`,
            amount: String((25 - i) * 1000000),
            timestamp: 1700000000 + i,
        }));
        useTipContext.mockReturnValue(defaultContext({ events }));
        render(<Leaderboard />);
        expect(screen.getByText(/Showing top 20/)).toBeInTheDocument();
    });

    it('renders five skeleton rows during loading', () => {
        useTipContext.mockReturnValue(defaultContext({ eventsLoading: true }));
        const { container } = render(<Leaderboard />);
        const rows = container.querySelectorAll('.h-14');
        expect(rows.length).toBe(5);
    });

    it('renders copy buttons for user addresses', () => {
        render(<Leaderboard />);
        const copyButtons = screen.getAllByTitle('Copy to clipboard');
        expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('shows tip count next to ranked users', () => {
        render(<Leaderboard />);
        const tipCounts = screen.getAllByText(/tips sent/);
        expect(tipCounts.length).toBeGreaterThan(0);
    });
});
