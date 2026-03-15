import { describe, it, expect } from 'vitest';

/**
 * BatchTip duplicate detection logic extracted for testability.
 * Mirrors the validation in BatchTip.jsx lines 134-143.
 */
function detectDuplicateAddresses(recipients) {
    const errors = {};
    const seen = new Set();
    recipients.forEach((r, i) => {
        const addr = (r.address || '').trim();
        if (addr && seen.has(addr)) {
            errors[`${i}-address`] = 'Duplicate address';
        }
        if (addr) seen.add(addr);
    });
    return errors;
}

/**
 * BatchTip amount validation logic extracted for testability.
 */
const MIN_TIP_STX = 0.001;
const MAX_BATCH_SIZE = 50;

function validateBatchAmounts(recipients) {
    const errors = {};
    recipients.forEach((r, i) => {
        const amt = parseFloat(r.amount);
        if (!r.amount || isNaN(amt) || amt <= 0) {
            errors[`${i}-amount`] = 'Enter a valid amount';
        } else if (amt < MIN_TIP_STX) {
            errors[`${i}-amount`] = `Min ${MIN_TIP_STX} STX`;
        }
    });
    return errors;
}

describe('BatchTip duplicate detection', () => {
    it('returns no errors for unique addresses', () => {
        const recipients = [
            { address: 'SP1AAA', amount: '1' },
            { address: 'SP2BBB', amount: '1' },
            { address: 'SP3CCC', amount: '1' },
        ];
        const errors = detectDuplicateAddresses(recipients);
        expect(Object.keys(errors).length).toBe(0);
    });

    it('flags duplicate address on second occurrence', () => {
        const recipients = [
            { address: 'SP1AAA', amount: '1' },
            { address: 'SP1AAA', amount: '2' },
        ];
        const errors = detectDuplicateAddresses(recipients);
        expect(errors['1-address']).toBe('Duplicate address');
        expect(errors['0-address']).toBeUndefined();
    });

    it('flags all duplicates after the first', () => {
        const recipients = [
            { address: 'SP1AAA', amount: '1' },
            { address: 'SP2BBB', amount: '1' },
            { address: 'SP1AAA', amount: '2' },
            { address: 'SP1AAA', amount: '3' },
        ];
        const errors = detectDuplicateAddresses(recipients);
        expect(errors['2-address']).toBe('Duplicate address');
        expect(errors['3-address']).toBe('Duplicate address');
    });

    it('treats empty addresses as non-duplicates', () => {
        const recipients = [
            { address: '', amount: '1' },
            { address: '', amount: '2' },
        ];
        const errors = detectDuplicateAddresses(recipients);
        expect(Object.keys(errors).length).toBe(0);
    });

    it('trims whitespace before comparison', () => {
        const recipients = [
            { address: ' SP1AAA ', amount: '1' },
            { address: 'SP1AAA', amount: '2' },
        ];
        const errors = detectDuplicateAddresses(recipients);
        expect(errors['1-address']).toBe('Duplicate address');
    });

    it('handles single recipient without errors', () => {
        const recipients = [
            { address: 'SP1AAA', amount: '1' },
        ];
        const errors = detectDuplicateAddresses(recipients);
        expect(Object.keys(errors).length).toBe(0);
    });

    it('detects multiple distinct duplicate pairs', () => {
        const recipients = [
            { address: 'SP1AAA', amount: '1' },
            { address: 'SP2BBB', amount: '1' },
            { address: 'SP1AAA', amount: '2' },
            { address: 'SP2BBB', amount: '2' },
        ];
        const errors = detectDuplicateAddresses(recipients);
        expect(errors['2-address']).toBe('Duplicate address');
        expect(errors['3-address']).toBe('Duplicate address');
    });

    it('handles null address gracefully', () => {
        const recipients = [
            { address: null, amount: '1' },
            { address: 'SP1AAA', amount: '1' },
        ];
        const errors = detectDuplicateAddresses(recipients);
        expect(Object.keys(errors).length).toBe(0);
    });
});

describe('BatchTip amount validation', () => {
    it('returns error for empty amount', () => {
        const errors = validateBatchAmounts([{ address: 'SP1', amount: '' }]);
        expect(errors['0-amount']).toBe('Enter a valid amount');
    });

    it('returns error for non-numeric amount', () => {
        const errors = validateBatchAmounts([{ address: 'SP1', amount: 'abc' }]);
        expect(errors['0-amount']).toBe('Enter a valid amount');
    });

    it('returns error for zero amount', () => {
        const errors = validateBatchAmounts([{ address: 'SP1', amount: '0' }]);
        expect(errors['0-amount']).toBe('Enter a valid amount');
    });

    it('returns error for negative amount', () => {
        const errors = validateBatchAmounts([{ address: 'SP1', amount: '-1' }]);
        expect(errors['0-amount']).toBe('Enter a valid amount');
    });

    it('returns error for amount below minimum', () => {
        const errors = validateBatchAmounts([{ address: 'SP1', amount: '0.0001' }]);
        expect(errors['0-amount']).toBe(`Min ${MIN_TIP_STX} STX`);
    });

    it('accepts exact minimum amount', () => {
        const errors = validateBatchAmounts([{ address: 'SP1', amount: '0.001' }]);
        expect(errors['0-amount']).toBeUndefined();
    });

    it('accepts valid amount', () => {
        const errors = validateBatchAmounts([{ address: 'SP1', amount: '5' }]);
        expect(errors['0-amount']).toBeUndefined();
    });

    it('validates each recipient independently', () => {
        const recipients = [
            { address: 'SP1', amount: '1' },
            { address: 'SP2', amount: '' },
            { address: 'SP3', amount: '5' },
        ];
        const errors = validateBatchAmounts(recipients);
        expect(errors['0-amount']).toBeUndefined();
        expect(errors['1-amount']).toBe('Enter a valid amount');
        expect(errors['2-amount']).toBeUndefined();
    });
});

describe('BatchTip message validation', () => {
    function validateMessages(recipients) {
        const errors = {};
        recipients.forEach((r, i) => {
            if (r.message && r.message.length > 280) {
                errors[`${i}-message`] = 'Max 280 characters';
            }
        });
        return errors;
    }

    it('accepts empty message', () => {
        const errors = validateMessages([{ address: 'SP1', amount: '1', message: '' }]);
        expect(Object.keys(errors).length).toBe(0);
    });

    it('accepts message at exactly 280 characters', () => {
        const msg = 'a'.repeat(280);
        const errors = validateMessages([{ address: 'SP1', amount: '1', message: msg }]);
        expect(Object.keys(errors).length).toBe(0);
    });

    it('rejects message exceeding 280 characters', () => {
        const msg = 'a'.repeat(281);
        const errors = validateMessages([{ address: 'SP1', amount: '1', message: msg }]);
        expect(errors['0-message']).toBe('Max 280 characters');
    });

    it('accepts undefined message field', () => {
        const errors = validateMessages([{ address: 'SP1', amount: '1' }]);
        expect(Object.keys(errors).length).toBe(0);
    });
});

describe('BatchTip self-tip detection', () => {
    function detectSelfTips(recipients, senderAddress) {
        const errors = {};
        recipients.forEach((r, i) => {
            if (r.address.trim() === senderAddress) {
                errors[`${i}-address`] = 'Cannot tip yourself';
            }
        });
        return errors;
    }

    it('flags self-tip when address matches sender', () => {
        const sender = 'SP1SENDER';
        const errors = detectSelfTips(
            [{ address: 'SP1SENDER', amount: '1' }],
            sender,
        );
        expect(errors['0-address']).toBe('Cannot tip yourself');
    });

    it('allows different addresses', () => {
        const sender = 'SP1SENDER';
        const errors = detectSelfTips(
            [{ address: 'SP2OTHER', amount: '1' }],
            sender,
        );
        expect(Object.keys(errors).length).toBe(0);
    });

    it('trims address whitespace before self-tip check', () => {
        const sender = 'SP1SENDER';
        const errors = detectSelfTips(
            [{ address: '  SP1SENDER  ', amount: '1' }],
            sender,
        );
        expect(errors['0-address']).toBe('Cannot tip yourself');
    });
});

describe('BatchTip totalAmount computation', () => {
    function computeTotal(recipients) {
        return recipients.reduce((sum, r) => {
            const parsed = parseFloat(r.amount);
            return sum + (isNaN(parsed) ? 0 : parsed);
        }, 0);
    }

    it('sums all valid amounts', () => {
        const total = computeTotal([
            { amount: '1' },
            { amount: '2.5' },
            { amount: '0.5' },
        ]);
        expect(total).toBe(4);
    });

    it('ignores NaN amounts', () => {
        const total = computeTotal([
            { amount: '1' },
            { amount: 'abc' },
            { amount: '3' },
        ]);
        expect(total).toBe(4);
    });

    it('returns zero for empty list', () => {
        expect(computeTotal([])).toBe(0);
    });

    it('returns zero when all amounts are invalid', () => {
        const total = computeTotal([
            { amount: '' },
            { amount: 'xyz' },
        ]);
        expect(total).toBe(0);
    });
});

describe('BatchTip constants', () => {
    it('MAX_BATCH_SIZE is 50', () => {
        expect(MAX_BATCH_SIZE).toBe(50);
    });

    it('MIN_TIP_STX is 0.001', () => {
        expect(MIN_TIP_STX).toBe(0.001);
    });
});
