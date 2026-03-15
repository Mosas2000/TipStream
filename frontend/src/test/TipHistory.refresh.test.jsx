import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TipHistory from '../components/TipHistory';
import { fetchCallReadOnlyFunction, cvToJSON } from '@stacks/transactions';

vi.mock('@stacks/transactions', () => ({
    fetchCallReadOnlyFunction: vi.fn(),
    cvToJSON: vi.fn(),
    principalCV: vi.fn(v => v),
}));

vi.mock('../utils/stacks', () => ({
    network: {},
}));

describe('TipHistory refresh behavior', () => {
    const USER = 'SP1SENDER';
    const CONTRACT_ID = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream';

    beforeEach(() => {
        vi.clearAllMocks();

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                total: 1,
                results: [
                    {
                        tx_id: '0xabc',
                        tx_type: 'contract_call',
                        sender_address: USER,
                        burn_block_time: 1700000000,
                        contract_call: {
                            contract_id: CONTRACT_ID,
                            function_args: [
                                { repr: "'SP2RECIPIENT" },
                                { repr: 'u1000000' },
                                { repr: 'u"hello"' },
                                { repr: 'u1' },
                            ],
                        },
                    },
                ],
            }),
        });

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

    it('fetches address-specific transactions on mount', async () => {
        render(<TipHistory userAddress={USER} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`/extended/v1/address/${USER}/transactions?limit=50&offset=0`)
            );
        });
    });

    it('renders parsed transaction details from contract call args', async () => {
        render(<TipHistory userAddress={USER} />);

        expect(await screen.findByText(/\u201chello\u201d/)).toBeInTheDocument();
        expect(screen.getByText(/-1\.00 STX/)).toBeInTheDocument();
    });

    it('refreshes transactions when user clicks Refresh', async () => {
        render(<TipHistory userAddress={USER} />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        const refreshButton = await screen.findByLabelText('Refresh activity');
        fireEvent.click(refreshButton);

        await waitFor(() => {
            expect(global.fetch.mock.calls.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('retries when initial fetch fails', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: false, status: 503 })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ total: 0, results: [] }),
            });

        render(<TipHistory userAddress={USER} />);
        expect(await screen.findByText('Stacks API returned 503')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });
});
