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
    });
});
