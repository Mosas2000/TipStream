import { describe, it, expect } from 'vitest';
import { validateTipBackAmount, MIN_TIP_STX, MAX_TIP_STX } from '../lib/tipBackValidation';

describe('tipBackValidation constants', () => {
    it('exports MIN_TIP_STX as 0.001', () => {
        expect(MIN_TIP_STX).toBe(0.001);
    });

    it('exports MAX_TIP_STX as 10000', () => {
        expect(MAX_TIP_STX).toBe(10000);
    });
});

describe('validateTipBackAmount', () => {
    it('returns error for empty string', () => {
        expect(validateTipBackAmount('')).toBe('Amount is required');
    });

    it('returns error for whitespace-only string', () => {
        expect(validateTipBackAmount('   ')).toBe('Amount is required');
    });

    it('returns error for null', () => {
        expect(validateTipBackAmount(null)).toBe('Amount is required');
    });

    it('returns error for undefined', () => {
        expect(validateTipBackAmount(undefined)).toBe('Amount is required');
    });

    it('returns error for zero', () => {
        expect(validateTipBackAmount('0')).toBe('Amount must be a positive number');
    });

    it('returns error for negative number', () => {
        expect(validateTipBackAmount('-1')).toBe('Amount must be a positive number');
    });

    it('returns error for non-numeric string', () => {
        expect(validateTipBackAmount('abc')).toBe('Amount must be a positive number');
    });

    it('returns error for amount below minimum', () => {
        expect(validateTipBackAmount('0.0001')).toBe(`Minimum tip is ${MIN_TIP_STX} STX`);
    });

    it('returns empty string for exact minimum', () => {
        expect(validateTipBackAmount('0.001')).toBe('');
    });

    it('returns empty string for valid amount', () => {
        expect(validateTipBackAmount('1.5')).toBe('');
    });

    it('returns empty string for exact maximum', () => {
        expect(validateTipBackAmount('10000')).toBe('');
    });

    it('returns error for amount above maximum', () => {
        expect(validateTipBackAmount('10001')).toContain('Maximum tip');
    });

    it('returns empty string for typical tip amounts', () => {
        expect(validateTipBackAmount('0.5')).toBe('');
        expect(validateTipBackAmount('1')).toBe('');
        expect(validateTipBackAmount('10')).toBe('');
        expect(validateTipBackAmount('100')).toBe('');
    });

    it('handles decimal edge cases', () => {
        expect(validateTipBackAmount('0.001')).toBe('');
        expect(validateTipBackAmount('0.0009')).toBe(`Minimum tip is ${MIN_TIP_STX} STX`);
    });

    it('returns error for NaN string', () => {
        expect(validateTipBackAmount('NaN')).toBe('Amount must be a positive number');
    });

    it('returns error for Infinity string', () => {
        expect(validateTipBackAmount('Infinity')).toContain('Maximum tip');
    });

    it('returns error for negative Infinity', () => {
        expect(validateTipBackAmount('-Infinity')).toBe('Amount must be a positive number');
    });

    it('handles numeric input passed as string', () => {
        expect(validateTipBackAmount('5')).toBe('');
    });

    it('handles very small positive amount just above minimum', () => {
        expect(validateTipBackAmount('0.002')).toBe('');
    });
});
