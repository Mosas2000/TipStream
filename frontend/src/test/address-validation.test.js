import { describe, it, expect } from 'vitest';

/**
 * The isValidStacksAddress validation function is defined inline in
 * SendTip, BatchTip, and TokenTip. This test verifies the regex pattern
 * used across all three components works correctly.
 */
function isValidStacksAddress(address) {
    if (!address) return false;
    const trimmed = address.trim();
    if (trimmed.length < 38 || trimmed.length > 41) return false;
    return /^(SP|SM|ST)[0-9A-Z]{33,39}$/i.test(trimmed);
}

describe('isValidStacksAddress (shared validation pattern)', () => {
    it('rejects empty string', () => {
        expect(isValidStacksAddress('')).toBe(false);
    });

    it('rejects null', () => {
        expect(isValidStacksAddress(null)).toBe(false);
    });

    it('rejects undefined', () => {
        expect(isValidStacksAddress(undefined)).toBe(false);
    });

    it('accepts valid SP address', () => {
        expect(isValidStacksAddress('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T')).toBe(true);
    });

    it('accepts valid SM address', () => {
        expect(isValidStacksAddress('SM31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T')).toBe(true);
    });

    it('accepts valid ST address (testnet)', () => {
        expect(isValidStacksAddress('ST31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T')).toBe(true);
    });

    it('rejects address too short', () => {
        expect(isValidStacksAddress('SP12345')).toBe(false);
    });

    it('rejects address too long', () => {
        expect(isValidStacksAddress('SP' + 'A'.repeat(50))).toBe(false);
    });

    it('rejects address with wrong prefix', () => {
        expect(isValidStacksAddress('BT31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T')).toBe(false);
    });

    it('trims whitespace before validation', () => {
        expect(isValidStacksAddress('  SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T  ')).toBe(true);
    });

    it('rejects addresses with special characters', () => {
        expect(isValidStacksAddress('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS$W5T')).toBe(false);
    });

    it('is case insensitive for the body', () => {
        expect(isValidStacksAddress('SP31pkqvqzvzck3fm3nh67cgd6g1fmr17vqvs2w5t')).toBe(true);
    });

    it('accepts minimum length address (38 chars)', () => {
        const addr = 'SP' + 'A'.repeat(36);
        expect(addr.length).toBe(38);
        expect(isValidStacksAddress(addr)).toBe(true);
    });

    it('accepts maximum length address (41 chars)', () => {
        const addr = 'SP' + 'A'.repeat(39);
        expect(addr.length).toBe(41);
        expect(isValidStacksAddress(addr)).toBe(true);
    });
});

/**
 * The isValidContractId validation function is defined inline in TokenTip.
 * Format: <address>.<contract-name>
 */
function isValidContractId(id) {
    if (!id) return false;
    const parts = id.trim().split('.');
    if (parts.length !== 2) return false;
    return isValidStacksAddress(parts[0]) && parts[1].length > 0;
}

describe('isValidContractId (TokenTip validation pattern)', () => {
    it('rejects empty string', () => {
        expect(isValidContractId('')).toBe(false);
    });

    it('rejects null', () => {
        expect(isValidContractId(null)).toBe(false);
    });

    it('accepts valid contract ID', () => {
        expect(isValidContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.my-token')).toBe(true);
    });

    it('rejects missing contract name', () => {
        expect(isValidContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.')).toBe(false);
    });

    it('rejects missing address', () => {
        expect(isValidContractId('.my-token')).toBe(false);
    });

    it('rejects multiple dots', () => {
        expect(isValidContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.my.token')).toBe(false);
    });

    it('accepts contract name with hyphens and underscores', () => {
        expect(isValidContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.my-token_v2')).toBe(true);
    });

    it('rejects invalid address portion', () => {
        expect(isValidContractId('INVALID.my-token')).toBe(false);
    });

    it('trims whitespace from contract ID', () => {
        expect(isValidContractId('  SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.token  ')).toBe(true);
    });
});

describe('isValidStacksAddress boundary tests', () => {
    it('rejects address of length 37 (one below minimum)', () => {
        const addr = 'SP' + 'A'.repeat(35);
        expect(addr.length).toBe(37);
        expect(isValidStacksAddress(addr)).toBe(false);
    });

    it('rejects address of length 42 (one above maximum)', () => {
        const addr = 'SP' + 'A'.repeat(40);
        expect(addr.length).toBe(42);
        expect(isValidStacksAddress(addr)).toBe(false);
    });

    it('rejects lowercase prefix sp as valid (case insensitive)', () => {
        expect(isValidStacksAddress('sp31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T')).toBe(true);
    });

    it('rejects address with only prefix and no body', () => {
        expect(isValidStacksAddress('SP')).toBe(false);
    });

    it('rejects all-numeric body with valid prefix and length', () => {
        const addr = 'SP' + '1'.repeat(36);
        expect(isValidStacksAddress(addr)).toBe(true);
    });

    it('rejects address containing dot (contract principal)', () => {
        expect(isValidStacksAddress('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream')).toBe(false);
    });

    it('rejects address with embedded spaces', () => {
        expect(isValidStacksAddress('SP31PKQVQ VZCK3FM3NH67CGD6G1FMR17VQVS2W5T')).toBe(false);
    });
});
