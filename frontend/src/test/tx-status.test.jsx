import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import TxStatus from '../components/ui/tx-status';
import { POLL_INTERVAL, MAX_POLLS, POLL_TIMEOUT_MS } from '../components/ui/tx-status';

// ---------------------------------------------------------------------------
// Mock fetch so we never hit a real network during tests.
// ---------------------------------------------------------------------------
const MOCK_TX_ID = '0xabc123def456789012345678901234567890abcd';

let fetchResponse;

function mockFetchWith(data) {
    fetchResponse = data;
}

beforeEach(() => {
    fetchResponse = { tx_status: 'pending' };
    global.fetch = vi.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve(fetchResponse),
        }),
    );
    vi.useFakeTimers();
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('TxStatus', () => {
    describe('initial render', () => {
        it('renders the component with pending status', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });
            expect(screen.getByTestId('tx-status')).toBeInTheDocument();
            expect(screen.getByText('Pending confirmation...')).toBeInTheDocument();
        });

        it('displays a truncated transaction ID', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });
            const link = screen.getByRole('link');
            expect(link.textContent).toContain(MOCK_TX_ID.slice(0, 10));
            expect(link.textContent).toContain(MOCK_TX_ID.slice(-8));
        });

        it('links to the Hiro explorer', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });
            const link = screen.getByRole('link');
            expect(link.href).toContain('explorer.hiro.so');
            expect(link.href).toContain(MOCK_TX_ID);
        });
    });

    // -- Accessibility ----------------------------------------------------

    describe('accessibility', () => {
        it('has role=status for assistive technology', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });
            expect(screen.getByRole('status')).toBeInTheDocument();
        });

        it('has aria-live=polite', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });
            const el = screen.getByTestId('tx-status');
            expect(el).toHaveAttribute('aria-live', 'polite');
        });

        it('hides the status dot from the accessibility tree', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });
            const dot = screen.getByTestId('tx-status').querySelector('span[aria-hidden]');
            expect(dot).toHaveAttribute('aria-hidden', 'true');
        });

        it('opens the explorer link in a new tab securely', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });
            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('target', '_blank');
            expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
        });
    });

    // -- Callback behavior ------------------------------------------------

    describe('callbacks', () => {
        it('invokes onConfirmed when the transaction succeeds', async () => {
            const onConfirmed = vi.fn();
            mockFetchWith({ tx_status: 'success', tx_id: MOCK_TX_ID });

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} onConfirmed={onConfirmed} />);
            });

            expect(onConfirmed).toHaveBeenCalledTimes(1);
            expect(onConfirmed).toHaveBeenCalledWith(
                expect.objectContaining({ tx_status: 'success' }),
            );
        });

        it('shows Confirmed on-chain after success', async () => {
            mockFetchWith({ tx_status: 'success', tx_id: MOCK_TX_ID });

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            expect(screen.getByText('Confirmed on-chain')).toBeInTheDocument();
        });

        it('invokes onFailed when the transaction aborts', async () => {
            const onFailed = vi.fn();
            mockFetchWith({ tx_status: 'abort_by_response' });

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} onFailed={onFailed} />);
            });

            expect(onFailed).toHaveBeenCalledTimes(1);
            expect(onFailed).toHaveBeenCalledWith('abort_by_response');
        });

        it('shows Transaction failed after abort', async () => {
            mockFetchWith({ tx_status: 'abort_by_response' });

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            expect(screen.getByText('Transaction failed')).toBeInTheDocument();
        });

        it('handles abort_by_post_condition as a failure', async () => {
            const onFailed = vi.fn();
            mockFetchWith({ tx_status: 'abort_by_post_condition' });

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} onFailed={onFailed} />);
            });

            expect(onFailed).toHaveBeenCalledWith('abort_by_post_condition');
        });
    });

    // -- Polling ----------------------------------------------------------

    describe('polling', () => {
        it('fires an immediate fetch on mount', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            expect(global.fetch).toHaveBeenCalled();
            expect(global.fetch.mock.calls[0][0]).toContain(MOCK_TX_ID);
        });

        it('polls again after the interval elapses', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            const callsBefore = global.fetch.mock.calls.length;

            await act(async () => {
                vi.advanceTimersByTime(POLL_INTERVAL);
            });

            expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore);
        });

        it('does not fire callbacks when status is still pending', async () => {
            const onConfirmed = vi.fn();
            const onFailed = vi.fn();

            await act(async () => {
                render(
                    <TxStatus txId={MOCK_TX_ID} onConfirmed={onConfirmed} onFailed={onFailed} />,
                );
            });

            expect(onConfirmed).not.toHaveBeenCalled();
            expect(onFailed).not.toHaveBeenCalled();
        });
    });

    // -- Ref stability (Issue #232 core fix) ------------------------------

    describe('callback ref stability', () => {
        it('does not restart polling when callback references change', async () => {
            const onConfirmedA = vi.fn();
            const onConfirmedB = vi.fn();

            const { rerender } = render(
                <TxStatus txId={MOCK_TX_ID} onConfirmed={onConfirmedA} />,
            );
            await act(async () => {});

            const callsAfterMount = global.fetch.mock.calls.length;

            // Re-render with a new callback reference -- should NOT trigger
            // an extra fetch because checkStatus no longer depends on it.
            await act(async () => {
                rerender(<TxStatus txId={MOCK_TX_ID} onConfirmed={onConfirmedB} />);
            });

            expect(global.fetch.mock.calls.length).toBe(callsAfterMount);
        });

        it('invokes the latest callback even after reference change', async () => {
            const onConfirmedA = vi.fn();
            const onConfirmedB = vi.fn();

            const { rerender } = render(
                <TxStatus txId={MOCK_TX_ID} onConfirmed={onConfirmedA} />,
            );
            await act(async () => {});

            // Swap callback
            await act(async () => {
                rerender(<TxStatus txId={MOCK_TX_ID} onConfirmed={onConfirmedB} />);
            });

            // Now simulate a success poll
            mockFetchWith({ tx_status: 'success', tx_id: MOCK_TX_ID });
            await act(async () => {
                vi.advanceTimersByTime(POLL_INTERVAL);
            });

            // The latest callback (B) should be called, not A.
            expect(onConfirmedB).toHaveBeenCalledTimes(1);
            expect(onConfirmedA).not.toHaveBeenCalled();
        });
    });

    // -- Error handling ---------------------------------------------------

    describe('error handling', () => {
        it('continues polling after a network error', async () => {
            // First fetch succeeds (pending), then a network error, then recover.
            global.fetch = vi.fn()
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ tx_status: 'pending' }) })
                .mockRejectedValueOnce(new Error('Network failure'))
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ tx_status: 'pending' }) });

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            // Advance through one poll cycle (network error silently caught).
            await act(async () => {
                vi.advanceTimersByTime(POLL_INTERVAL);
            });

            // Advance through another cycle (recovery).
            await act(async () => {
                vi.advanceTimersByTime(POLL_INTERVAL);
            });

            // Should still be pending -- not crashed.
            expect(screen.getByText('Pending confirmation...')).toBeInTheDocument();
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        it('keeps polling when response is not ok', async () => {
            global.fetch = vi.fn(() =>
                Promise.resolve({ ok: false }),
            );

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            await act(async () => {
                vi.advanceTimersByTime(POLL_INTERVAL);
            });

            expect(screen.getByText('Pending confirmation...')).toBeInTheDocument();
        });
    });

    // -- Timeout ----------------------------------------------------------

    describe('timeout', () => {
        /**
         * Advance fake timers through enough poll cycles to exhaust MAX_POLLS.
         * Each cycle requires: advancing the clock by POLL_INTERVAL, then
         * flushing the resulting microtask queue so the fetch promise resolves
         * and React re-renders before the next cycle begins.
         */
        async function exhaustPolls() {
            for (let i = 0; i < MAX_POLLS; i++) {
                await act(async () => {
                    vi.advanceTimersByTime(POLL_INTERVAL);
                });
            }
        }

        it('transitions to timed_out after MAX_POLLS attempts', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            await exhaustPolls();

            expect(screen.getByTestId('tx-status')).toHaveAttribute('data-status', 'timed_out');
            expect(screen.getByText('Confirmation timed out')).toBeInTheDocument();
        });

        it('stops fetching after timeout', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            await exhaustPolls();

            const callsAtTimeout = global.fetch.mock.calls.length;

            await act(async () => {
                vi.advanceTimersByTime(POLL_INTERVAL * 5);
            });

            expect(global.fetch.mock.calls.length).toBe(callsAtTimeout);
        });

        it('invokes onTimeout with the txId when polling expires', async () => {
            const onTimeout = vi.fn();

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} onTimeout={onTimeout} />);
            });

            await exhaustPolls();

            expect(onTimeout).toHaveBeenCalledTimes(1);
            expect(onTimeout).toHaveBeenCalledWith(MOCK_TX_ID);
        });

        it('does not invoke onTimeout when transaction confirms before limit', async () => {
            const onTimeout = vi.fn();
            mockFetchWith({ tx_status: 'success', tx_id: MOCK_TX_ID });

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} onTimeout={onTimeout} />);
            });

            expect(onTimeout).not.toHaveBeenCalled();
        });

        it('does not invoke onTimeout when transaction fails before limit', async () => {
            const onTimeout = vi.fn();
            mockFetchWith({ tx_status: 'abort_by_response' });

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} onTimeout={onTimeout} />);
            });

            expect(onTimeout).not.toHaveBeenCalled();
        });

        it('shows a timeout message with the correct duration', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            await exhaustPolls();

            const expectedMinutes = Math.round(POLL_TIMEOUT_MS / 60000);
            expect(screen.getByText(new RegExp(`${expectedMinutes} minutes`))).toBeInTheDocument();
        });

        it('shows a retry button after timeout', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            await exhaustPolls();

            expect(screen.getByRole('button', { name: /retry polling/i })).toBeInTheDocument();
        });

        it('shows an explorer link after timeout', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            await exhaustPolls();

            const links = screen.getAllByRole('link');
            const explorerLinks = links.filter((l) => l.href.includes('explorer.hiro.so'));
            expect(explorerLinks.length).toBeGreaterThan(0);
        });

        it('POLL_TIMEOUT_MS equals MAX_POLLS multiplied by POLL_INTERVAL', () => {
            expect(POLL_TIMEOUT_MS).toBe(MAX_POLLS * POLL_INTERVAL);
        });
    });

    // -- Retry ------------------------------------------------------------

    describe('retry', () => {
        async function exhaustPolls() {
            for (let i = 0; i < MAX_POLLS; i++) {
                await act(async () => {
                    vi.advanceTimersByTime(POLL_INTERVAL);
                });
            }
        }

        async function renderTimedOut() {
            render(<TxStatus txId={MOCK_TX_ID} />);
            await act(async () => {});
            await exhaustPolls();
        }

        it('returns to pending state when retry is clicked', async () => {
            await renderTimedOut();

            expect(screen.getByTestId('tx-status')).toHaveAttribute('data-status', 'timed_out');

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /retry polling/i }));
            });

            expect(screen.getByTestId('tx-status')).toHaveAttribute('data-status', 'pending');
            expect(screen.getByText('Pending confirmation...')).toBeInTheDocument();
        });

        it('resumes polling after retry', async () => {
            await renderTimedOut();

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /retry polling/i }));
            });

            const callsAfterRetry = global.fetch.mock.calls.length;

            await act(async () => {
                vi.advanceTimersByTime(POLL_INTERVAL);
            });

            expect(global.fetch.mock.calls.length).toBeGreaterThan(callsAfterRetry);
        });

        it('confirms successfully after retry', async () => {
            const onConfirmed = vi.fn();

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} onConfirmed={onConfirmed} />);
            });

            await exhaustPolls();

            mockFetchWith({ tx_status: 'success', tx_id: MOCK_TX_ID });

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /retry polling/i }));
            });

            await act(async () => {
                vi.advanceTimersByTime(POLL_INTERVAL);
            });

            expect(onConfirmed).toHaveBeenCalledTimes(1);
            expect(screen.getByTestId('tx-status')).toHaveAttribute('data-status', 'confirmed');
        });

        it('hides the retry button while polling is active', async () => {
            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            expect(screen.queryByRole('button', { name: /retry polling/i })).not.toBeInTheDocument();
        });

        it('does not show retry button in confirmed state', async () => {
            mockFetchWith({ tx_status: 'success', tx_id: MOCK_TX_ID });

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            expect(screen.queryByRole('button', { name: /retry polling/i })).not.toBeInTheDocument();
        });

        it('does not show retry button in failed state', async () => {
            mockFetchWith({ tx_status: 'abort_by_response' });

            await act(async () => {
                render(<TxStatus txId={MOCK_TX_ID} />);
            });

            expect(screen.queryByRole('button', { name: /retry polling/i })).not.toBeInTheDocument();
        });
    });
});
