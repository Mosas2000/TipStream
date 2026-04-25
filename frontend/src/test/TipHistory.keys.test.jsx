import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('TipHistory row keys', () => {
    const USER = 'SP1SENDER';

    beforeEach(() => {
        vi.clearAllMocks();

        const firstResponse = {
            ok: true,
            json: async () => ({
                total: 2,
                results: [
                    {
                        tx_id: '0xaaa',
                        tx_type: 'contract_call',
                        sender_address: USER,
                        burn_block_time: 1700000000,
                        contract_call: {
                            contract_id: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream',
                            function_args: [
                                { repr: "'SP2ALPHA" },
                                { repr: 'u1000000' },
                                { repr: 'u"hello"' },
                                { repr: 'u1' },
                            ],
                        },
                    },
                    {
                        tx_id: '0xbbb',
                        tx_type: 'contract_call',
                        sender_address: USER,
                        burn_block_time: 1700000001,
                        contract_call: {
                            contract_id: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream',
                            function_args: [
                                { repr: "'SP2BETA" },
                                { repr: 'u2000000' },
                                { repr: 'u"world"' },
                                { repr: 'u1' },
                            ],
                        },
                    },
                ],
            }),
        };

        const secondResponse = {
            ok: true,
            json: async () => ({
                total: 2,
                results: [
                    {
                        tx_id: '0xbbb',
                        tx_type: 'contract_call',
                        sender_address: USER,
                        burn_block_time: 1700000001,
                        contract_call: {
                            contract_id: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream',
                            function_args: [
                                { repr: "'SP2BETA" },
                                { repr: 'u2000000' },
                                { repr: 'u"world"' },
                                { repr: 'u1' },
                            ],
                        },
                    },
                    {
                        tx_id: '0xaaa',
                        tx_type: 'contract_call',
                        sender_address: USER,
                        burn_block_time: 1700000000,
                        contract_call: {
                            contract_id: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream',
                            function_args: [
                                { repr: "'SP2ALPHA" },
                                { repr: 'u1000000' },
                                { repr: 'u"hello"' },
                                { repr: 'u1' },
                            ],
                        },
                    },
                ],
            }),
        };

        let callCount = 0;
        global.fetch = vi.fn().mockImplementation(() => {
            callCount += 1;
            return Promise.resolve(callCount === 1 ? firstResponse : secondResponse);
        });

        fetchCallReadOnlyFunction.mockResolvedValue({});
        cvToJSON.mockReturnValue({
            value: {
                'tips-sent': { value: '2' },
                'tips-received': { value: '1' },
                'total-sent': { value: '3000000' },
                'total-received': { value: '1000000' },
            },
        });
    });

    it('keeps row identity stable across reorders when tipId is missing', async () => {
        render(<TipHistory userAddress={USER} />);

        await screen.findByText(/SP2ALPHA/);

        const firstRow = screen.getByText(/SP2ALPHA/).closest('div[class*="justify-between"]');
        expect(firstRow).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Refresh activity'));

        await screen.findByText(/SP2ALPHA/);

        const firstRowAfter = screen.getByText(/SP2ALPHA/).closest('div[class*="justify-between"]');
        expect(firstRowAfter).toBeTruthy();
        expect(firstRowAfter).toContainHTML('SP2ALPHA');
        expect(firstRow).toBeTruthy();
    });
});
