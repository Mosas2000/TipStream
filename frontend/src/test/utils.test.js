import { describe, it, expect } from 'vitest';
import { formatSTX, toMicroSTX, cn, formatAddress, formatNumber, MICRO_STX } from '../lib/utils';

describe('formatSTX', () => {
  it('converts micro-STX to STX string', () => {
    expect(formatSTX(1000000)).toBe('1.000000');
  });

  it('handles zero', () => {
    expect(formatSTX(0)).toBe('0.000000');
  });

  it('respects custom decimal places', () => {
    expect(formatSTX(1500000, 2)).toBe('1.50');
  });

  it('formats small amounts correctly', () => {
    expect(formatSTX(1000, 6)).toBe('0.001000');
  });

  it('formats large amounts', () => {
    expect(formatSTX(10000000000, 2)).toBe('10000.00');
  });
});

describe('toMicroSTX', () => {
  it('converts STX to micro-STX', () => {
    expect(toMicroSTX(1)).toBe(1000000);
  });

  it('handles decimal values', () => {
    expect(toMicroSTX(0.5)).toBe(500000);
  });

  it('floors fractional micro-STX', () => {
    expect(toMicroSTX(0.0000001)).toBe(0);
  });

  it('handles string input', () => {
    expect(toMicroSTX('2.5')).toBe(2500000);
  });

  it('handles zero', () => {
    expect(toMicroSTX(0)).toBe(0);
  });
});

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toContain('px-4');
    expect(result).toContain('py-2');
  });

  it('handles conditional classes', () => {
    // eslint-disable-next-line no-constant-binary-expression
    const result = cn('base', false && 'hidden', 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });
});

describe('formatAddress', () => {
  it('truncates a standard Stacks address', () => {
    const addr = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
    expect(formatAddress(addr)).toBe('SP31PK...2W5T');
  });

  it('uses custom start and end lengths', () => {
    const addr = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
    expect(formatAddress(addr, 8, 6)).toBe('SP31PKQV...VS2W5T');
  });

  it('returns short addresses unmodified', () => {
    expect(formatAddress('SP123')).toBe('SP123');
  });

  it('handles empty or null input', () => {
    expect(formatAddress('')).toBe('');
    expect(formatAddress(null)).toBe('');
    expect(formatAddress(undefined)).toBe('');
  });
});

describe('formatNumber', () => {
  it('formats a number with locale separators', () => {
    const result = formatNumber(1234567);
    expect(result).toContain('1');
    expect(result.length).toBeGreaterThan(3);
  });

  it('formats with decimal options', () => {
    const result = formatNumber(1234.5, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    expect(result).toContain('34');
    expect(result).toContain('50');
  });

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('handles string input', () => {
    const result = formatNumber('999');
    expect(result).toContain('999');
  });
});

describe('MICRO_STX re-export', () => {
  it('re-exports MICRO_STX from balance-utils', () => {
    expect(MICRO_STX).toBe(1_000_000);
  });

  it('is the same reference as balance-utils.MICRO_STX', async () => {
    const { MICRO_STX: original } = await import('../lib/balance-utils');
    expect(MICRO_STX).toBe(original);
  });
});
