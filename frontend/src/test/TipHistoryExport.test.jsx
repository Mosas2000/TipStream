import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TipHistoryExport from '../components/TipHistoryExport';
import * as csvExport from '../lib/csvExport';

vi.mock('../lib/csvExport', () => ({
    generateTipHistoryCSV: vi.fn(),
    downloadCSV: vi.fn(),
    filterTipsByDateRange: vi.fn((tips) => tips),
}));

describe('TipHistoryExport', () => {
    const mockTips = [
        {
            txId: '0x123',
            direction: 'sent',
            sender: 'SP123',
            recipient: 'SP456',
            amount: '1000000',
            message: 'Test tip',
            category: 0,
            timestamp: 1640000000,
        },
        {
            txId: '0x456',
            direction: 'received',
            sender: 'SP789',
            recipient: 'SP123',
            amount: '2000000',
            message: 'Another tip',
            category: 1,
            timestamp: 1640100000,
        },
    ];

    const mockOnClose = vi.fn();
    const mockUserAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

    beforeEach(() => {
        vi.clearAllMocks();
        csvExport.generateTipHistoryCSV.mockReturnValue('mock,csv,content');
        csvExport.filterTipsByDateRange.mockImplementation((tips) => tips);
    });

    it('should render export modal', () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        expect(screen.getByText('Export Tip History')).toBeInTheDocument();
        expect(screen.getByText(/Export your tip history as a CSV file/)).toBeInTheDocument();
    });

    it('should display date range inputs', () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });

    it('should display CSV content information', () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        expect(screen.getByText('CSV will include:')).toBeInTheDocument();
        expect(screen.getByText(/Transaction ID/)).toBeInTheDocument();
        expect(screen.getByText(/Direction/)).toBeInTheDocument();
        expect(screen.getByText(/Sender and recipient addresses/)).toBeInTheDocument();
    });

    it('should call onClose when cancel button is clicked', () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when X button is clicked', () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const closeButton = screen.getByLabelText('Close export dialog');
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should export CSV without date filter', async () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const exportButton = screen.getByText('Export CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(csvExport.generateTipHistoryCSV).toHaveBeenCalledWith(mockTips);
            expect(csvExport.downloadCSV).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('should generate filename with user address', async () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const exportButton = screen.getByText('Export CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            const downloadCall = csvExport.downloadCSV.mock.calls[0];
            const filename = downloadCall[1];
            expect(filename).toContain('tip-history_SP2J6ZY4');
            expect(filename).toContain('.csv');
        });
    });

    it('should update start date input', () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const startDateInput = screen.getByLabelText('Start Date');
        fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

        expect(startDateInput.value).toBe('2024-01-01');
    });

    it('should update end date input', () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const endDateInput = screen.getByLabelText('End Date');
        fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });

        expect(endDateInput.value).toBe('2024-12-31');
    });

    it('should show clear dates button when dates are set', () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const startDateInput = screen.getByLabelText('Start Date');
        fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

        expect(screen.getByText('Clear date filters')).toBeInTheDocument();
    });

    it('should clear dates when clear button is clicked', () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const startDateInput = screen.getByLabelText('Start Date');
        fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

        const clearButton = screen.getByText('Clear date filters');
        fireEvent.click(clearButton);

        expect(startDateInput.value).toBe('');
    });

    it('should show error when start date is after end date', async () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const startDateInput = screen.getByLabelText('Start Date');
        const endDateInput = screen.getByLabelText('End Date');

        fireEvent.change(startDateInput, { target: { value: '2024-12-31' } });
        fireEvent.change(endDateInput, { target: { value: '2024-01-01' } });

        const exportButton = screen.getByText('Export CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(screen.getByText('Start date must be before end date')).toBeInTheDocument();
        });

        expect(csvExport.downloadCSV).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show error when no tips match date range', async () => {
        csvExport.filterTipsByDateRange.mockReturnValue([]);

        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const startDateInput = screen.getByLabelText('Start Date');
        fireEvent.change(startDateInput, { target: { value: '2025-01-01' } });

        const exportButton = screen.getByText('Export CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(screen.getByText('No tips found in the selected date range')).toBeInTheDocument();
        });

        expect(csvExport.downloadCSV).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should filter tips by date range before export', async () => {
        const filteredTips = [mockTips[0]];
        csvExport.filterTipsByDateRange.mockReturnValue(filteredTips);

        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const startDateInput = screen.getByLabelText('Start Date');
        const endDateInput = screen.getByLabelText('End Date');

        fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
        fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });

        const exportButton = screen.getByText('Export CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(csvExport.filterTipsByDateRange).toHaveBeenCalled();
            expect(csvExport.generateTipHistoryCSV).toHaveBeenCalledWith(filteredTips);
        });
    });

    it('should include date range in filename when dates are set', async () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const startDateInput = screen.getByLabelText('Start Date');
        const endDateInput = screen.getByLabelText('End Date');

        fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
        fireEvent.change(endDateInput, { target: { value: '2024-12-31' } });

        const exportButton = screen.getByText('Export CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            const downloadCall = csvExport.downloadCSV.mock.calls[0];
            const filename = downloadCall[1];
            expect(filename).toContain('2024-01-01');
            expect(filename).toContain('2024-12-31');
        });
    });

    it('should clear error when date is changed', async () => {
        render(
            <TipHistoryExport
                tips={mockTips}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        const startDateInput = screen.getByLabelText('Start Date');
        const endDateInput = screen.getByLabelText('End Date');

        fireEvent.change(startDateInput, { target: { value: '2024-12-31' } });
        fireEvent.change(endDateInput, { target: { value: '2024-01-01' } });

        const exportButton = screen.getByText('Export CSV');
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(screen.getByText('Start date must be before end date')).toBeInTheDocument();
        });

        fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

        expect(screen.queryByText('Start date must be before end date')).not.toBeInTheDocument();
    });

    it('should handle empty tips array', () => {
        render(
            <TipHistoryExport
                tips={[]}
                onClose={mockOnClose}
                userAddress={mockUserAddress}
            />
        );

        expect(screen.getByText('Export Tip History')).toBeInTheDocument();
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });
});
