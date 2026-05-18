import { describe, it, expect } from 'vitest';
import {
  isValidStacksAddress,
  isContractPrincipal,
  isValidStacksPrincipal,
  formatAddress,
} from './stacks-principal.js';

describe('isValidStacksAddress', () => {
  it('accepts valid mainnet address', () => {
    expect(isValidStacksAddress('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ')).toBe(true);
  });
  it('accepts valid testnet address', () => {
    expect(isValidStacksAddress('ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKPVKG2CE')).toBe(true);
  });
  it('rejects contract principal', () => {
    expect(isValidStacksAddress('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ.my-contract')).toBe(false);
  });
  it('rejects empty string', () => {
    expect(isValidStacksAddress('')).toBe(false);
  });
  it('rejects null', () => {
    expect(isValidStacksAddress(null)).toBe(false);
  });
  it('rejects random string', () => {
    expect(isValidStacksAddress('not-an-address')).toBe(false);
  });
});

describe('isContractPrincipal', () => {
  it('accepts valid contract principal', () => {
    expect(isContractPrincipal('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ.my-contract')).toBe(true);
  });
  it('rejects standard address', () => {
    expect(isContractPrincipal('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ')).toBe(false);
  });
});

describe('isValidStacksPrincipal', () => {
  it('accepts both address and contract principal', () => {
    expect(isValidStacksPrincipal('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ')).toBe(true);
    expect(isValidStacksPrincipal('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ.contract')).toBe(true);
  });
});

describe('formatAddress', () => {
  it('truncates long addresses', () => {
    const addr = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ';
    expect(formatAddress(addr)).toBe('SP2J6Z...V9EJ');
  });
  it('returns short addresses unchanged', () => {
    expect(formatAddress('SP123')).toBe('SP123');
  });
  it('handles null gracefully', () => {
    expect(formatAddress(null)).toBe('');
  });
});
