import { describe, it, expect } from 'vitest';
import {
  toMicroStxBigInt,
  hasSufficientMicroStx,
  microToStxDecimalString,
  microToStx,
  stxToMicro,
  formatBalance,
  isValidBalance,
} from './balance-utils.js';

describe('toMicroStxBigInt', () => {
  it('converts number', () => expect(toMicroStxBigInt(1000000)).toBe(1000000n));
  it('converts string', () => expect(toMicroStxBigInt('1000000')).toBe(1000000n));
  it('converts bigint', () => expect(toMicroStxBigInt(1000000n)).toBe(1000000n));
  it('returns null for negative', () => expect(toMicroStxBigInt(-1)).toBeNull());
  it('returns null for null', () => expect(toMicroStxBigInt(null)).toBeNull());
  it('returns null for decimal string', () => expect(toMicroStxBigInt('1.5')).toBeNull());
});

describe('hasSufficientMicroStx', () => {
  it('returns true when balance >= required', () => {
    expect(hasSufficientMicroStx(5000000, 1000000)).toBe(true);
  });
  it('returns false when balance < required', () => {
    expect(hasSufficientMicroStx(500000, 1000000)).toBe(false);
  });
  it('returns false for null inputs', () => {
    expect(hasSufficientMicroStx(null, 1000000)).toBe(false);
  });
});

describe('microToStxDecimalString', () => {
  it('converts 1 STX', () => expect(microToStxDecimalString(1000000)).toBe('1.000000'));
  it('respects precision', () => expect(microToStxDecimalString(1500000, 2)).toBe('1.50'));
  it('returns null for null', () => expect(microToStxDecimalString(null)).toBeNull());
});

describe('microToStx', () => {
  it('converts micro to STX', () => expect(microToStx(1000000)).toBe(1));
  it('handles decimals', () => expect(microToStx(1500000)).toBe(1.5));
  it('returns null for null', () => expect(microToStx(null)).toBeNull());
});

describe('stxToMicro', () => {
  it('converts STX to micro', () => expect(stxToMicro(1)).toBe(1000000));
  it('floors decimals', () => expect(stxToMicro(1.5)).toBe(1500000));
  it('returns null for null', () => expect(stxToMicro(null)).toBeNull());
});

describe('formatBalance', () => {
  it('formats with STX suffix', () => {
    const result = formatBalance(1000000);
    expect(result).toContain('STX');
    expect(result).toContain('1');
  });
  it('returns fallback for null', () => expect(formatBalance(null)).toBe('--'));
  it('respects custom fallback', () => expect(formatBalance(null, { fallback: 'N/A' })).toBe('N/A'));
  it('omits suffix when suffix=false', () => {
    expect(formatBalance(1000000, { suffix: false })).not.toContain('STX');
  });
});

describe('isValidBalance', () => {
  it('returns true for valid balance', () => expect(isValidBalance(1000000)).toBe(true));
  it('returns true for zero', () => expect(isValidBalance(0)).toBe(true));
  it('returns false for negative', () => expect(isValidBalance(-1)).toBe(false));
  it('returns false for null', () => expect(isValidBalance(null)).toBe(false));
});
