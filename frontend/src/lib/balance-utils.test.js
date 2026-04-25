import { describe, it, expect } from 'vitest';
import { 
    toMicroStxBigInt, 
    hasSufficientMicroStx, 
    microToStxDecimalString, 
    formatBalance 
} from './balance-utils';

describe('Balance Utils', () => {
    describe('toMicroStxBigInt', () => {
        it('should handle strings, numbers, and bigints', () => {
            expect(toMicroStxBigInt('1000000')).toBe(1000000n);
            expect(toMicroStxBigInt(1000000)).toBe(1000000n);
            expect(toMicroStxBigInt(1000000n)).toBe(1000000n);
        });

        it('should return null for invalid inputs', () => {
            expect(toMicroStxBigInt('abc')).toBe(null);
            expect(toMicroStxBigInt(-100)).toBe(null);
            expect(toMicroStxBigInt(1.5)).toBe(null);
        });
    });

    describe('hasSufficientMicroStx', () => {
        it('should return true if balance >= required', () => {
            expect(hasSufficientMicroStx(100, 50)).toBe(true);
            expect(hasSufficientMicroStx(100, 100)).toBe(true);
            expect(hasSufficientMicroStx(100, 150)).toBe(false);
        });
    });

    describe('microToStxDecimalString', () => {
        it('should convert micro-STX to a precise decimal string', () => {
            expect(microToStxDecimalString(1234567, 6)).toBe('1.234567');
            expect(microToStxDecimalString(1000000, 2)).toBe('1.00');
            expect(microToStxDecimalString(500, 6)).toBe('0.000500');
        });
    });

    describe('formatBalance', () => {
        it('should format balance for display', () => {
            expect(formatBalance(1000000)).toBe('1.00 STX');
            expect(formatBalance(1234567890, { suffix: false })).toBe('1,234.56789');
        });
    });
});
