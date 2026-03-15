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
