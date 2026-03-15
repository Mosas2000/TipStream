import { describe, it, expect } from 'vitest';

/**
 * TokenTip contract ID parsing logic extracted for testability.
 * Mirrors parseContractId in TokenTip.jsx.
 */
function parseContractId(id) {
    const parts = id.trim().split('.');
    return { address: parts[0], name: parts[1] };
}

function isValidStacksAddress(address) {
    if (!address) return false;
    const trimmed = address.trim();
    if (trimmed.length < 38 || trimmed.length > 41) return false;
    return /^(SP|SM|ST)[0-9A-Z]{33,39}$/i.test(trimmed);
}

function isValidContractId(id) {
    if (!id) return false;
    const parts = id.trim().split('.');
    if (parts.length !== 2) return false;
    return isValidStacksAddress(parts[0]) && parts[1].length > 0;
}

describe('parseContractId', () => {
    it('splits a valid contract ID into address and name', () => {
        const result = parseContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream');
        expect(result.address).toBe('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T');
        expect(result.name).toBe('tipstream');
    });

    it('trims whitespace from input', () => {
        const result = parseContractId('  SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.token  ');
        expect(result.address).toBe('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T');
        expect(result.name).toBe('token');
    });

    it('handles contract names with hyphens', () => {
        const result = parseContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.my-token');
        expect(result.name).toBe('my-token');
    });

    it('handles contract names with underscores', () => {
        const result = parseContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.my_token_v2');
        expect(result.name).toBe('my_token_v2');
    });
});

describe('TokenTip validation flow', () => {
    it('requires a non-empty contract ID', () => {
        expect(isValidContractId('')).toBe(false);
    });

    it('requires exactly one dot separator', () => {
        expect(isValidContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T')).toBe(false);
    });

    it('requires a valid address before the dot', () => {
        expect(isValidContractId('INVALID.tipstream')).toBe(false);
    });

    it('requires a non-empty name after the dot', () => {
        expect(isValidContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.')).toBe(false);
    });

    it('accepts a well-formed contract ID', () => {
        expect(isValidContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream')).toBe(true);
    });

    it('validates the address portion', () => {
        expect(isValidContractId('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.token')).toBe(true);
        expect(isValidContractId('ST31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.token')).toBe(true);
        expect(isValidContractId('SM31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.token')).toBe(true);
    });
});
