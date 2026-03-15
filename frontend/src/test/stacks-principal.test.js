import { describe, it, expect } from 'vitest';
import { isValidStacksAddress, isContractPrincipal, isValidStacksPrincipal } from '../lib/stacks-principal';

describe('stacks principal helpers', () => {
    const STANDARD = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
    const CONTRACT = `${STANDARD}.tipstream`;

    it('validates standard addresses', () => {
        expect(isValidStacksAddress(STANDARD)).toBe(true);
        expect(isValidStacksPrincipal(STANDARD)).toBe(true);
        expect(isContractPrincipal(STANDARD)).toBe(false);
    });

    it('validates contract principals', () => {
        expect(isValidStacksAddress(CONTRACT)).toBe(false);
        expect(isContractPrincipal(CONTRACT)).toBe(true);
        expect(isValidStacksPrincipal(CONTRACT)).toBe(true);
    });

    it('rejects malformed principals', () => {
        expect(isValidStacksPrincipal('SP12345')).toBe(false);
        expect(isValidStacksPrincipal(`${STANDARD}.`)).toBe(false);
        expect(isValidStacksPrincipal(`${STANDARD}.123bad`)).toBe(false);
        expect(isValidStacksPrincipal('not-an-address')).toBe(false);
    });
});
