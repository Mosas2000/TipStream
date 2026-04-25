import { describe, it, expect } from 'vitest';
import { isValidStacksAddress, isContractPrincipal, isValidStacksPrincipal } from './stacks-principal';

describe('Stacks Principal Utils', () => {
    describe('isValidStacksAddress', () => {
        it('should validate standard Stacks addresses', () => {
            expect(isValidStacksAddress('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T')).toBe(true);
            expect(isValidStacksAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')).toBe(true);
            expect(isValidStacksAddress('invalid')).toBe(false);
            expect(isValidStacksAddress('')).toBe(false);
        });
    });

    describe('isContractPrincipal', () => {
        it('should validate contract principals', () => {
            expect(isContractPrincipal('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream')).toBe(true);
            expect(isContractPrincipal('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.a')).toBe(true);
            expect(isContractPrincipal('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T')).toBe(false);
        });
    });

    describe('isValidStacksPrincipal', () => {
        it('should validate both addresses and contracts', () => {
            expect(isValidStacksPrincipal('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T')).toBe(true);
            expect(isValidStacksPrincipal('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream')).toBe(true);
            expect(isValidStacksPrincipal('invalid')).toBe(false);
        });
    });
});
