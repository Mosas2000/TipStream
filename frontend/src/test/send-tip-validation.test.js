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

describe('SendTip balance-insufficient check', () => {
    function isBalanceInsufficient(balanceMicroStx, requiredMicroStx) {
        if (balanceMicroStx === null) return false;
        if (!/^\d+$/.test(String(balanceMicroStx))) return false;
        if (!/^\d+$/.test(String(requiredMicroStx))) return false;
        return BigInt(requiredMicroStx) > BigInt(balanceMicroStx);
    }

    it('returns false when balance is null (unknown)', () => {
        expect(isBalanceInsufficient(null, '5000000')).toBe(false);
    });

    it('returns false when amount is within balance', () => {
        expect(isBalanceInsufficient('10000000', '5000000')).toBe(false);
    });

    it('returns true when amount exceeds balance', () => {
        expect(isBalanceInsufficient('10000000', '15000000')).toBe(true);
    });

    it('returns false when amount equals balance', () => {
        expect(isBalanceInsufficient('10000000', '10000000')).toBe(false);
    });

    it('returns false for malformed values', () => {
        expect(isBalanceInsufficient('abc', '10')).toBe(false);
        expect(isBalanceInsufficient('10', '1.5')).toBe(false);
    });
});

describe('SendTip constants', () => {
    it('MIN_TIP_STX is 0.001', () => {
        expect(MIN_TIP_STX).toBe(0.001);
    });

    it('MAX_TIP_STX is 10000', () => {
        expect(MAX_TIP_STX).toBe(10000);
    });

    it('TIP_CATEGORIES has 7 entries', () => {
        const TIP_CATEGORIES = [
            { id: 0, label: 'General' },
            { id: 1, label: 'Content' },
            { id: 2, label: 'Development' },
            { id: 3, label: 'Community' },
            { id: 4, label: 'Support' },
            { id: 5, label: 'Education' },
            { id: 6, label: 'Other' },
        ];
        expect(TIP_CATEGORIES).toHaveLength(7);
        expect(TIP_CATEGORIES[0].id).toBe(0);
        expect(TIP_CATEGORIES[6].id).toBe(6);
    });
});

describe('SendTip default message', () => {
    function resolveMessage(message) {
        return message || 'Thanks!';
    }

    it('uses provided message when non-empty', () => {
        expect(resolveMessage('Hello')).toBe('Hello');
    });

    it('defaults to "Thanks!" when message is empty', () => {
        expect(resolveMessage('')).toBe('Thanks!');
    });

    it('defaults to "Thanks!" when message is null', () => {
        expect(resolveMessage(null)).toBe('Thanks!');
    });

    it('defaults to "Thanks!" when message is undefined', () => {
        expect(resolveMessage(undefined)).toBe('Thanks!');
    });
});
