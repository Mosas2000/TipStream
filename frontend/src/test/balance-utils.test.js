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

// ---------------------------------------------------------------------------
// microToStx
// ---------------------------------------------------------------------------
describe('microToStx', () => {
  it('converts 1_000_000 micro-STX to 1 STX', () => {
    expect(microToStx(1_000_000)).toBe(1);
  });

  it('converts a string balance from the API', () => {
    expect(microToStx('2500000')).toBe(2.5);
  });

  it('converts zero', () => {
    expect(microToStx(0)).toBe(0);
    expect(microToStx('0')).toBe(0);
  });

  it('returns null for null', () => {
    expect(microToStx(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(microToStx(undefined)).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(microToStx('abc')).toBeNull();
  });

  it('handles sub-micro amounts correctly', () => {
    expect(microToStx(500_000)).toBeCloseTo(0.5);
  });

  it('handles very large balances', () => {
    // 9 billion STX = 9_000_000_000_000_000 micro-STX
    expect(microToStx('9000000000000000')).toBe(9_000_000_000);
  });
});
