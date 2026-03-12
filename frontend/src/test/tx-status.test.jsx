import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import TxStatus from '../components/ui/tx-status';

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
});
