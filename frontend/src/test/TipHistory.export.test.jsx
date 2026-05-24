import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TipHistory from '../components/TipHistory';
import { DemoProvider } from '../context/DemoContext';
import * as csvExport from '../lib/csvExport';

vi.mock('@stacks/transactions', () => ({
    fetchCallReadOnlyFunction: vi.fn(),
    cvToJSON: vi.fn(),
    principalCV: vi.fn(),
}));

vi.mock('../utils/stacks', () => ({
    network: {},
}));

vi.mock('../lib/csvExport', () => ({
    generateTipHistoryCSV: vi.fn(),
    downloadCSV: vi.fn(),
    filterTipsByDateRange: vi.fn((tips) => tips),
}));

global.fetch = vi.fn();

describe('TipHistory CSV Export Integration', () => {
    const mockUserAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const mockAddToast = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        csvExport.generateTipHistoryCSV.mockReturnValue('mock,csv,content');
        csvExport.filterTipsByDateRange.mockImplementation((tips) => tips);

        const { fetchCallReadOnlyFunction, cvToJSON } = require('@stacks/transactions');
        fetchCallReadOnlyFunction.mockResolvedValue({});
        cvToJSON.mockReturnValue({
            value: {
                'tips-sent': { value: 5 },
                'tips-received': { value: 3 },
                'total-sent': { value: 5000000 },
                'total-received': { value: 3000000 },
            },
        });

        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [
                    {
                        tx_type: 'contract_call',
                        tx_id: '0x123',
                        sender_address: mockUserAddress,
                        contract_call: {
                            contract_id: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.tipstream',
                            function_args: [
                                { repr: "'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE" },
                                { repr: 'u1000000' },
                                { repr: 'u"Test message"' },
                                { repr: 'u0' },
                            ],
                        },
                        burn_block_time: 1640000000,
                    },
                ],
                total: 1,
            }),
        });
    });

    it('should render export button', async () => {
        render(
            <DemoProvider>
                <TipHistory userAddress={mockUserAddress} addToast={mockAddToast} />
            </DemoProvider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText('Export tip history to CSV')).toBeInTheDocument();
        });
    });

    it('should disable export button when no tips', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [],
                total: 0,
            }),
        });

        render(
            <DemoProvider>
                <TipHistory userAddress={mockUserAddress} addToast={mockAddToast} />
            </DemoProvider>
        );

        await waitFor(() => {
            const exportButton = screen.getByLabelText('Export tip history to CSV');
            expect(exportButton).toBeDisabled();
        });
    });

    it('should open export modal when export button is clicked', async () => {
        render(
            <DemoProvider>
                <TipHistory userAddress={mockUserAddress} addToast={mockAddToast} />
            </DemoProvider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText('Export tip history to CSV')).toBeInTheDocument();
        });

        const exportButton = screen.getByLabelText('Export tip history to CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(screen.getByText('Export Tip History')).toBeInTheDocument();
        });
    });

    it('should close export modal when cancel is clicked', async () => {
        render(
            <DemoProvider>
                <TipHistory userAddress={mockUserAddress} addToast={mockAddToast} />
            </DemoProvider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText('Export tip history to CSV')).toBeInTheDocument();
        });

        const exportButton = screen.getByLabelText('Export tip history to CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(screen.getByText('Export Tip History')).toBeInTheDocument();
        });

        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        await waitFor(() => {
            expect(screen.queryByText('Export Tip History')).not.toBeInTheDocument();
        });
    });

    it('should export all loaded tips', async () => {
        render(
            <DemoProvider>
                <TipHistory userAddress={mockUserAddress} addToast={mockAddToast} />
            </DemoProvider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText('Export tip history to CSV')).toBeInTheDocument();
        });

        const exportButton = screen.getByLabelText('Export tip history to CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(screen.getByText('Export Tip History')).toBeInTheDocument();
        });

        const exportCSVButton = screen.getByText('Export CSV');
        fireEvent.click(exportCSVButton);

        await waitFor(() => {
            expect(csvExport.generateTipHistoryCSV).toHaveBeenCalled();
            expect(csvExport.downloadCSV).toHaveBeenCalled();
        });
    });

    it('should export filtered tips when tab is selected', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [
                    {
                        tx_type: 'contract_call',
                        tx_id: '0x123',
                        sender_address: mockUserAddress,
                        contract_call: {
                            contract_id: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.tipstream',
                            function_args: [
                                { repr: "'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE" },
                                { repr: 'u1000000' },
                                { repr: 'u"Sent tip"' },
                                { repr: 'u0' },
                            ],
                        },
                        burn_block_time: 1640000000,
                    },
                    {
                        tx_type: 'contract_call',
                        tx_id: '0x456',
                        sender_address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
                        contract_call: {
                            contract_id: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.tipstream',
                            function_args: [
                                { repr: `'${mockUserAddress}` },
                                { repr: 'u2000000' },
                                { repr: 'u"Received tip"' },
                                { repr: 'u1' },
                            ],
                        },
                        burn_block_time: 1640100000,
                    },
                ],
                total: 2,
            }),
        });

        render(
            <DemoProvider>
                <TipHistory userAddress={mockUserAddress} addToast={mockAddToast} />
            </DemoProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('Sent tip')).toBeInTheDocument();
        });

        const exportButton = screen.getByLabelText('Export tip history to CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(screen.getByText('Export Tip History')).toBeInTheDocument();
        });

        const exportCSVButton = screen.getByText('Export CSV');
        fireEvent.click(exportCSVButton);

        await waitFor(() => {
            const exportCall = csvExport.generateTipHistoryCSV.mock.calls[0];
            const exportedTips = exportCall[0];
            expect(exportedTips.length).toBe(2);
        });
    });

    it('should work in demo mode', async () => {
        const demoContextValue = {
            demoEnabled: true,
            getDemoData: () => ({
                mockWalletAddress: 'SP_DEMO_ADDRESS',
            }),
            demoTips: [
                {
                    id: 'demo-1',
                    sender: 'SP_DEMO_ADDRESS',
                    recipient: 'SP_OTHER_ADDRESS',
                    amount: 1000000,
                    memo: 'Demo tip',
                    category: 0,
                    timestamp: 1640000000,
                },
            ],
        };

        render(
            <DemoProvider value={demoContextValue}>
                <TipHistory userAddress={null} addToast={mockAddToast} />
            </DemoProvider>
        );

        await waitFor(() => {
            expect(screen.getByLabelText('Export tip history to CSV')).toBeInTheDocument();
        });

        const exportButton = screen.getByLabelText('Export tip history to CSV');
        expect(exportButton).not.toBeDisabled();
    });

    it('should include export button in header with proper styling', async () => {
        render(
            <DemoProvider>
                <TipHistory userAddress={mockUserAddress} addToast={mockAddToast} />
            </DemoProvider>
        );

        await waitFor(() => {
            const exportButton = screen.getByLabelText('Export tip history to CSV');
            expect(exportButton).toHaveClass('px-3', 'py-1.5', 'text-xs');
            expect(exportButton.querySelector('svg')).toBeInTheDocument();
        });
    });
});
