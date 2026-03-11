import { describe, it, expect } from 'vitest';
import { parseClarityValue } from '../lib/admin-contract';

describe('parseClarityValue', () => {
    describe('null and invalid inputs', () => {
        it('returns null for null input', () => {
            expect(parseClarityValue(null)).toBeNull();
        });

        it('returns null for undefined input', () => {
            expect(parseClarityValue(undefined)).toBeNull();
        });

        it('returns null for empty string', () => {
            expect(parseClarityValue('')).toBeNull();
        });

        it('returns null for non-string input', () => {
            expect(parseClarityValue(123)).toBeNull();
        });
    });

    describe('primitive types', () => {
        it('decodes true (0x03)', () => {
            expect(parseClarityValue('03')).toBe(true);
        });

        it('decodes false (0x04)', () => {
            expect(parseClarityValue('04')).toBe(false);
        });

        it('decodes uint zero', () => {
            // 0x01 + 16 bytes of 0
            expect(parseClarityValue('0100000000000000000000000000000000')).toBe(0);
        });

        it('decodes uint 144', () => {
            // 0x01 + u144 = 0x90
            expect(parseClarityValue('0100000000000000000000000000000090')).toBe(144);
        });

        it('decodes uint 50', () => {
            // 0x01 + u50 = 0x32
            expect(parseClarityValue('0100000000000000000000000000000032')).toBe(50);
        });

        it('decodes none (0x09)', () => {
            expect(parseClarityValue('09')).toBeNull();
        });
    });

    describe('optional values', () => {
        it('decodes some(true)', () => {
            // 0x0a + 0x03
            expect(parseClarityValue('0a03')).toBe(true);
        });

        it('decodes some(false)', () => {
            // 0x0a + 0x04
            expect(parseClarityValue('0a04')).toBe(false);
        });

        it('decodes some(uint)', () => {
            // 0x0a + uint 200 = 0xC8
            expect(parseClarityValue('0a0100000000000000000000000000c8')).toBe(200);
        });
    });

    describe('response values', () => {
        it('decodes ok(true)', () => {
            // 0x07 + 0x03
            expect(parseClarityValue('0703')).toBe(true);
        });

        it('decodes ok(uint)', () => {
            // 0x07 + uint 50
            expect(parseClarityValue('070100000000000000000000000000000032')).toBe(50);
        });

        it('decodes err as null', () => {
            // 0x08 + any value
            expect(parseClarityValue('0803')).toBeNull();
        });
    });

    describe('with 0x prefix', () => {
        it('handles 0x prefix on values', () => {
            expect(parseClarityValue('0x03')).toBe(true);
        });

        it('handles 0x prefix on none', () => {
            expect(parseClarityValue('0x09')).toBeNull();
        });
    });
});
