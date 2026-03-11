import { describe, it, expect } from 'vitest';
import {
  MICRO_STX,
  parseBalance,
  microToStx,
  stxToMicro,
  formatBalance,
  isValidBalance,
} from '../lib/balance-utils';

// ---------------------------------------------------------------------------
// MICRO_STX constant
// ---------------------------------------------------------------------------
describe('MICRO_STX', () => {
  it('equals 1_000_000', () => {
    expect(MICRO_STX).toBe(1_000_000);
  });
});

// ---------------------------------------------------------------------------
// parseBalance
// ---------------------------------------------------------------------------
describe('parseBalance', () => {
  it('parses a numeric string', () => {
    expect(parseBalance('1500000')).toBe(1_500_000);
  });

  it('parses a number', () => {
    expect(parseBalance(42)).toBe(42);
  });

  it('parses zero string', () => {
    expect(parseBalance('0')).toBe(0);
  });

  it('parses zero number', () => {
    expect(parseBalance(0)).toBe(0);
  });

  it('parses a BigInt by coercing through Number()', () => {
    expect(parseBalance(BigInt(999))).toBe(999);
  });

  it('returns null for null', () => {
    expect(parseBalance(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseBalance(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseBalance('')).toBeNull();
  });

  it('returns null for NaN-producing string', () => {
    expect(parseBalance('not-a-number')).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(parseBalance(Infinity)).toBeNull();
  });

  it('returns null for -Infinity', () => {
    expect(parseBalance(-Infinity)).toBeNull();
  });

  it('parses negative numbers', () => {
    expect(parseBalance('-500')).toBe(-500);
  });

  it('parses decimal strings', () => {
    expect(parseBalance('1.5')).toBe(1.5);
  });
});
