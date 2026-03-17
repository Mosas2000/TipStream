import { describe, it, expect } from 'vitest';
import {
  MICRO_STX,
  parseBalance,
  microToStx,
  stxToMicro,
  formatBalance,
  isValidBalance,
  toMicroStxBigInt,
  hasSufficientMicroStx,
  microToStxDecimalString,
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
// toMicroStxBigInt
// ---------------------------------------------------------------------------
describe('toMicroStxBigInt', () => {
  it('normalizes a digit string to bigint', () => {
    expect(toMicroStxBigInt('1500000')).toBe(1500000n);
  });

  it('normalizes a non-negative integer number to bigint', () => {
    expect(toMicroStxBigInt(42)).toBe(42n);
  });

  it('returns null for decimal strings', () => {
    expect(toMicroStxBigInt('1.5')).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(toMicroStxBigInt('-5')).toBeNull();
    expect(toMicroStxBigInt(-5)).toBeNull();
    expect(toMicroStxBigInt(-5n)).toBeNull();
  });

  it('returns null for scientific notation strings', () => {
    expect(toMicroStxBigInt('1e6')).toBeNull();
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

// ---------------------------------------------------------------------------
// stxToMicro
// ---------------------------------------------------------------------------
describe('stxToMicro', () => {
  it('converts 1 STX to 1_000_000 micro-STX', () => {
    expect(stxToMicro(1)).toBe(1_000_000);
  });

  it('converts a string amount', () => {
    expect(stxToMicro('2.5')).toBe(2_500_000);
  });

  it('floors fractional micro-STX', () => {
    // 0.0000001 STX = 0.1 micro-STX -> floor to 0
    expect(stxToMicro('0.0000001')).toBe(0);
  });

  it('converts zero', () => {
    expect(stxToMicro(0)).toBe(0);
    expect(stxToMicro('0')).toBe(0);
  });

  it('returns null for null', () => {
    expect(stxToMicro(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(stxToMicro(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(stxToMicro('')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(stxToMicro('xyz')).toBeNull();
  });

  it('handles small amounts correctly', () => {
    expect(stxToMicro('0.001')).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// formatBalance
// ---------------------------------------------------------------------------
describe('formatBalance', () => {
  it('formats a basic micro-STX value with suffix', () => {
    const result = formatBalance(1_500_000);
    expect(result).toContain('STX');
    // 1.5 STX -- locale-dependent separator, so just check the number part
    expect(result).toMatch(/1[.,]5/);
  });

  it('formats a string balance from the API', () => {
    const result = formatBalance('2000000');
    expect(result).toContain('STX');
    expect(result).toMatch(/2[.,]0/);
  });

  it('returns fallback for null', () => {
    expect(formatBalance(null)).toBe('--');
  });

  it('returns fallback for undefined', () => {
    expect(formatBalance(undefined)).toBe('--');
  });

  it('returns fallback for empty string', () => {
    expect(formatBalance('')).toBe('--');
  });

  it('returns fallback for non-numeric string', () => {
    expect(formatBalance('abc')).toBe('--');
  });

  it('accepts a custom fallback', () => {
    expect(formatBalance(null, { fallback: 'N/A' })).toBe('N/A');
  });

  it('can omit the STX suffix', () => {
    const result = formatBalance(1_000_000, { suffix: false });
    expect(result).not.toContain('STX');
    expect(result).toMatch(/1[.,]0/);
  });

  it('formats zero balance', () => {
    const result = formatBalance(0);
    expect(result).toContain('STX');
    expect(result).toMatch(/0[.,]0/);
  });

  it('formats zero string balance', () => {
    const result = formatBalance('0');
    expect(result).toContain('STX');
  });

  it('respects custom decimal options', () => {
    const result = formatBalance(1_500_000, {
      minDecimals: 0,
      maxDecimals: 1,
      suffix: false,
    });
    expect(result).toMatch(/1[.,]5/);
  });
});

// ---------------------------------------------------------------------------
// isValidBalance
// ---------------------------------------------------------------------------
describe('isValidBalance', () => {
  it('returns true for a positive number', () => {
    expect(isValidBalance(1000)).toBe(true);
  });

  it('returns true for a positive string', () => {
    expect(isValidBalance('1500000')).toBe(true);
  });

  it('returns true for zero', () => {
    expect(isValidBalance(0)).toBe(true);
    expect(isValidBalance('0')).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidBalance(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidBalance(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidBalance('')).toBe(false);
  });

  it('returns false for non-numeric string', () => {
    expect(isValidBalance('abc')).toBe(false);
  });

  it('returns false for negative numbers', () => {
    expect(isValidBalance(-1)).toBe(false);
    expect(isValidBalance('-500')).toBe(false);
  });

  it('returns false for Infinity', () => {
    expect(isValidBalance(Infinity)).toBe(false);
  });

  it('returns false for NaN', () => {
    expect(isValidBalance(NaN)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Roundtrip: micro -> STX -> micro
// ---------------------------------------------------------------------------
describe('micro/STX roundtrip', () => {
  it('converts micro to STX and back for whole numbers', () => {
    expect(stxToMicro(microToStx(5_000_000))).toBe(5_000_000);
  });

  it('converts micro to STX and back for fractional amounts', () => {
    expect(stxToMicro(microToStx(1_500_000))).toBe(1_500_000);
  });

  it('converts STX to micro and back for small amounts', () => {
    expect(microToStx(stxToMicro(0.001))).toBeCloseTo(0.001);
  });
});
