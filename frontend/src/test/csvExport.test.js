import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateTipHistoryCSV, downloadCSV, filterTipsByDateRange } from '../lib/csvExport';

describe('csvExport', () => {
    describe('generateTipHistoryCSV', () => {
        it('should generate CSV with correct headers', () => {
            const tips = [];
            const csv = generateTipHistoryCSV(tips);
            const lines = csv.split('\n');
            
            expect(lines[0]).toBe('Transaction ID,Direction,Sender,Recipient,Amount (STX),Amount (microSTX),Message,Category,Timestamp,Date');
        });

        it('should generate CSV rows for tip data', () => {
            const tips = [
                {
                    txId: '0x123abc',
                    direction: 'sent',
                    sender: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
                    recipient: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
                    amount: '1000000',
                    message: 'Great work',
                    category: 1,
                    timestamp: 1640000000,
                },
            ];
            
            const csv = generateTipHistoryCSV(tips);
            const lines = csv.split('\n');
            
            expect(lines.length).toBe(2);
            expect(lines[1]).toContain('0x123abc');
            expect(lines[1]).toContain('sent');
            expect(lines[1]).toContain('1.000000');
            expect(lines[1]).toContain('1000000');
            expect(lines[1]).toContain('Great work');
            expect(lines[1]).toContain('Content Creation');
        });

        it('should escape CSV fields with commas', () => {
            const tips = [
                {
                    txId: '0x123',
                    direction: 'sent',
                    sender: 'SP123',
                    recipient: 'SP456',
                    amount: '1000000',
                    message: 'Hello, world',
                    category: 0,
                    timestamp: 1640000000,
                },
            ];
            
            const csv = generateTipHistoryCSV(tips);
            expect(csv).toContain('"Hello, world"');
        });

        it('should escape CSV fields with quotes', () => {
            const tips = [
                {
                    txId: '0x123',
                    direction: 'sent',
                    sender: 'SP123',
                    recipient: 'SP456',
                    amount: '1000000',
                    message: 'He said "hello"',
                    category: 0,
                    timestamp: 1640000000,
                },
            ];
            
            const csv = generateTipHistoryCSV(tips);
            expect(csv).toContain('"He said ""hello"""');
        });

        it('should handle empty messages', () => {
            const tips = [
                {
                    txId: '0x123',
                    direction: 'sent',
                    sender: 'SP123',
                    recipient: 'SP456',
                    amount: '1000000',
                    message: '',
                    category: 0,
                    timestamp: 1640000000,
                },
            ];
            
            const csv = generateTipHistoryCSV(tips);
            const lines = csv.split('\n');
            expect(lines[1].split(',')[6]).toBe('');
        });

        it('should handle null category', () => {
            const tips = [
                {
                    txId: '0x123',
                    direction: 'sent',
                    sender: 'SP123',
                    recipient: 'SP456',
                    amount: '1000000',
                    message: 'Test',
                    category: null,
                    timestamp: 1640000000,
                },
            ];
            
            const csv = generateTipHistoryCSV(tips);
            const lines = csv.split('\n');
            expect(lines[1].split(',')[7]).toBe('');
        });

        it('should format timestamp as ISO date', () => {
            const tips = [
                {
                    txId: '0x123',
                    direction: 'sent',
                    sender: 'SP123',
                    recipient: 'SP456',
                    amount: '1000000',
                    message: 'Test',
                    category: 0,
                    timestamp: 1640000000,
                },
            ];
            
            const csv = generateTipHistoryCSV(tips);
            expect(csv).toContain('2021-12-20T13:33:20.000Z');
        });

        it('should handle multiple tips', () => {
            const tips = [
                {
                    txId: '0x123',
                    direction: 'sent',
                    sender: 'SP123',
                    recipient: 'SP456',
                    amount: '1000000',
                    message: 'First',
                    category: 0,
                    timestamp: 1640000000,
                },
                {
                    txId: '0x456',
                    direction: 'received',
                    sender: 'SP789',
                    recipient: 'SP123',
                    amount: '2000000',
                    message: 'Second',
                    category: 1,
                    timestamp: 1640100000,
                },
            ];
            
            const csv = generateTipHistoryCSV(tips);
            const lines = csv.split('\n');
            
            expect(lines.length).toBe(3);
            expect(lines[1]).toContain('0x123');
            expect(lines[2]).toContain('0x456');
        });

        it('should handle large amounts correctly', () => {
            const tips = [
                {
                    txId: '0x123',
                    direction: 'sent',
                    sender: 'SP123',
                    recipient: 'SP456',
                    amount: '100000000',
                    message: 'Large tip',
                    category: 0,
                    timestamp: 1640000000,
                },
            ];
            
            const csv = generateTipHistoryCSV(tips);
            expect(csv).toContain('100.000000');
            expect(csv).toContain('100000000');
        });
    });

    describe('downloadCSV', () => {
        let createElementSpy;
        let createObjectURLSpy;
        let revokeObjectURLSpy;

        beforeEach(() => {
            const mockLink = {
                href: '',
                download: '',
                click: vi.fn(),
            };

            createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
            createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
            revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should create and download CSV file', () => {
            const csvContent = 'header1,header2\nvalue1,value2';
            const filename = 'test.csv';

            downloadCSV(csvContent, filename);

            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(createObjectURLSpy).toHaveBeenCalled();
            expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
        });

        it('should set correct filename', () => {
            const csvContent = 'test';
            const filename = 'my-export.csv';
            const mockLink = createElementSpy.mock.results[0].value;

            downloadCSV(csvContent, filename);

            expect(mockLink.download).toBe(filename);
        });

        it('should trigger download', () => {
            const csvContent = 'test';
            const filename = 'test.csv';
            const mockLink = createElementSpy.mock.results[0].value;

            downloadCSV(csvContent, filename);

            expect(mockLink.click).toHaveBeenCalled();
        });
    });

    describe('filterTipsByDateRange', () => {
        const tips = [
            {
                txId: '0x1',
                timestamp: new Date('2024-01-15').getTime() / 1000,
            },
            {
                txId: '0x2',
                timestamp: new Date('2024-02-15').getTime() / 1000,
            },
            {
                txId: '0x3',
                timestamp: new Date('2024-03-15').getTime() / 1000,
            },
            {
                txId: '0x4',
                timestamp: null,
            },
        ];

        it('should return all tips when no date range specified', () => {
            const filtered = filterTipsByDateRange(tips, null, null);
            expect(filtered.length).toBe(4);
        });

        it('should filter by start date only', () => {
            const startDate = new Date('2024-02-01');
            const filtered = filterTipsByDateRange(tips, startDate, null);
            
            expect(filtered.length).toBe(2);
            expect(filtered[0].txId).toBe('0x2');
            expect(filtered[1].txId).toBe('0x3');
        });

        it('should filter by end date only', () => {
            const endDate = new Date('2024-02-20');
            const filtered = filterTipsByDateRange(tips, null, endDate);
            
            expect(filtered.length).toBe(2);
            expect(filtered[0].txId).toBe('0x1');
            expect(filtered[1].txId).toBe('0x2');
        });

        it('should filter by both start and end date', () => {
            const startDate = new Date('2024-02-01');
            const endDate = new Date('2024-02-28');
            const filtered = filterTipsByDateRange(tips, startDate, endDate);
            
            expect(filtered.length).toBe(1);
            expect(filtered[0].txId).toBe('0x2');
        });

        it('should exclude tips without timestamp', () => {
            const startDate = new Date('2024-01-01');
            const filtered = filterTipsByDateRange(tips, startDate, null);
            
            expect(filtered.every(tip => tip.timestamp !== null)).toBe(true);
        });

        it('should include tips on the start date', () => {
            const startDate = new Date('2024-01-15');
            const filtered = filterTipsByDateRange(tips, startDate, null);
            
            expect(filtered.some(tip => tip.txId === '0x1')).toBe(true);
        });

        it('should include tips on the end date', () => {
            const endDate = new Date('2024-03-15');
            const filtered = filterTipsByDateRange(tips, null, endDate);
            
            expect(filtered.some(tip => tip.txId === '0x3')).toBe(true);
        });

        it('should handle same start and end date', () => {
            const date = new Date('2024-02-15');
            const filtered = filterTipsByDateRange(tips, date, date);
            
            expect(filtered.length).toBe(1);
            expect(filtered[0].txId).toBe('0x2');
        });

        it('should return empty array when no tips match range', () => {
            const startDate = new Date('2025-01-01');
            const endDate = new Date('2025-12-31');
            const filtered = filterTipsByDateRange(tips, startDate, endDate);
            
            expect(filtered.length).toBe(0);
        });
    });
});
