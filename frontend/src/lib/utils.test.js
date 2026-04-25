import { describe, it, expect } from 'vitest';
import { formatSTX, toMicroSTX, formatAddress, cn } from './utils';

describe('Frontend Utils', () => {
    describe('formatSTX', () => {
        it('should correctly format micro-STX to STX', () => {
            expect(formatSTX(1000000)).toBe('1.000000');
            expect(formatSTX(500000, 2)).toBe('0.50');
            expect(formatSTX(0)).toBe('0.000000');
            expect(formatSTX(100)).toBe('0.000100');
        });

        it('should handle large amounts', () => {
            expect(formatSTX(1000000000)).toBe('1000.000000');
        });
    });

    describe('toMicroSTX', () => {
        it('should correctly convert STX to micro-STX', () => {
            expect(toMicroSTX(1)).toBe(1000000);
            expect(toMicroSTX('0.5')).toBe(500000);
            expect(toMicroSTX(0.000001)).toBe(1);
        });
    });

    describe('formatAddress', () => {
        it('should truncate long addresses', () => {
            const addr = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
            expect(formatAddress(addr, 6, 4)).toBe('SP31PK...2W5T');
        });

        it('should return short addresses as is', () => {
            expect(formatAddress('abc')).toBe('abc');
            expect(formatAddress('')).toBe('');
        });
    });

    describe('cn', () => {
        it('should merge tailwind classes correctly', () => {
            expect(cn('p-4', 'bg-red-500', 'p-2')).toBe('bg-red-500 p-2');
        });
    });
});
