import { describe, it, expect } from 'vitest';
import {
    validateTipBackAmount,
    MIN_TIP_STX,
    MAX_TIP_STX,
} from '../components/RecentTips';

// ---------------------------------------------------------------------------
// Unit tests for the exported validateTipBackAmount function and constants.
// These cover the client-side validation that was added to prevent invalid
// tip-back values from reaching the wallet prompt (Issue #233).
// ---------------------------------------------------------------------------

describe('validateTipBackAmount', () => {
    describe('boundary constants', () => {
        it('exports MIN_TIP_STX as 0.001', () => {
            expect(MIN_TIP_STX).toBe(0.001);
        });

        it('exports MAX_TIP_STX as 10000', () => {
            expect(MAX_TIP_STX).toBe(10000);
        });
    describe('empty and missing values', () => {
        it('rejects an empty string', () => {
            expect(validateTipBackAmount('')).toBe('Amount is required');
        });

        it('rejects a whitespace-only string', () => {
            expect(validateTipBackAmount('   ')).toBe('Amount is required');
        });

        it('rejects undefined', () => {
            expect(validateTipBackAmount(undefined)).toBe('Amount is required');
        });

        it('rejects null', () => {
            expect(validateTipBackAmount(null)).toBe('Amount is required');
        });
    describe('non-numeric and non-positive values', () => {
        it('rejects non-numeric input', () => {
            expect(validateTipBackAmount('abc')).toBe('Amount must be a positive number');
        });

        it('rejects zero', () => {
            expect(validateTipBackAmount('0')).toBe('Amount must be a positive number');
        });

        it('rejects negative values', () => {
            expect(validateTipBackAmount('-5')).toBe('Amount must be a positive number');
        });
    describe('minimum amount boundary', () => {
        it('rejects a value below MIN_TIP_STX', () => {
            expect(validateTipBackAmount('0.0001')).toMatch(/minimum tip/i);
        });

        it('accepts the exact MIN_TIP_STX value', () => {
            expect(validateTipBackAmount(String(MIN_TIP_STX))).toBe('');
        });

        it('accepts a value just above MIN_TIP_STX', () => {
            expect(validateTipBackAmount('0.002')).toBe('');
        });
    });

    describe('maximum amount boundary', () => {
        it('rejects a value above MAX_TIP_STX', () => {
            expect(validateTipBackAmount('10001')).toMatch(/maximum tip/i);
        });

        it('accepts the exact MAX_TIP_STX value', () => {
            expect(validateTipBackAmount(String(MAX_TIP_STX))).toBe('');
        });

        it('accepts a value just below MAX_TIP_STX', () => {
            expect(validateTipBackAmount('9999')).toBe('');
        });
    describe('valid amounts', () => {
        it('accepts a typical tip amount', () => {
            expect(validateTipBackAmount('0.5')).toBe('');
        });

        it('accepts a whole-number amount', () => {
            expect(validateTipBackAmount('10')).toBe('');
        });

        it('accepts a small fractional amount', () => {
            expect(validateTipBackAmount('0.005')).toBe('');
        });

        it('accepts the default tip-back amount of 0.5', () => {
            expect(validateTipBackAmount('0.5')).toBe('');
        });
    });
});
