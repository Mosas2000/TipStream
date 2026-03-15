import { describe, it, expect } from 'vitest';

/**
 * SendTip amount validation logic extracted for testability.
 * Mirrors handleAmountChange in SendTip.jsx lines 106-128.
 */
const MIN_TIP_STX = 0.001;
const MAX_TIP_STX = 10000;

function validateSendTipAmount(value, balanceSTX = null) {
    if (!value) return '';
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) return 'Amount must be a positive number';
    if (parsed < MIN_TIP_STX) return `Minimum tip is ${MIN_TIP_STX} STX`;
    if (parsed > MAX_TIP_STX) return `Maximum tip is ${MAX_TIP_STX.toLocaleString()} STX`;
    return '';
}

describe('SendTip amount validation', () => {
    it('returns empty string for empty value', () => {
        expect(validateSendTipAmount('')).toBe('');
    });

    it('returns empty string for null value', () => {
        expect(validateSendTipAmount(null)).toBe('');
    });

    it('returns error for zero', () => {
        expect(validateSendTipAmount('0')).toBe('Amount must be a positive number');
    });

    it('returns error for negative value', () => {
        expect(validateSendTipAmount('-5')).toBe('Amount must be a positive number');
    });

    it('returns error for non-numeric input', () => {
        expect(validateSendTipAmount('abc')).toBe('Amount must be a positive number');
    });

    it('returns error for amount below minimum', () => {
        expect(validateSendTipAmount('0.0005')).toBe(`Minimum tip is ${MIN_TIP_STX} STX`);
    });

    it('accepts exact minimum amount', () => {
        expect(validateSendTipAmount('0.001')).toBe('');
    });

    it('accepts valid amount', () => {
        expect(validateSendTipAmount('5')).toBe('');
    });

    it('returns error for amount above maximum', () => {
        expect(validateSendTipAmount('10001')).toContain('Maximum tip');
    });

    it('accepts exact maximum amount', () => {
        expect(validateSendTipAmount('10000')).toBe('');
    });

    it('accepts various decimal amounts', () => {
        expect(validateSendTipAmount('0.5')).toBe('');
        expect(validateSendTipAmount('1.234')).toBe('');
        expect(validateSendTipAmount('999.99')).toBe('');
    });
});

/**
 * SendTip self-tip validation extracted from validateAndConfirm.
 */
function isSelfTip(recipient, senderAddress) {
    return recipient.trim() === senderAddress;
}

describe('SendTip self-tip check', () => {
    const sender = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';

    it('detects self-tip when addresses match', () => {
        expect(isSelfTip(sender, sender)).toBe(true);
    });

    it('returns false for different addresses', () => {
        expect(isSelfTip('SP_OTHER_ADDRESS_12345678901234567890', sender)).toBe(false);
    });

    it('trims whitespace before comparison', () => {
        expect(isSelfTip(`  ${sender}  `, sender)).toBe(true);
    });
});
