import { describe, it, expect } from 'vitest';
import { isValidUserData } from '../utils/user-data';

/**
 * Tests for isValidUserData -- a predicate that verifies the user data
 * object has the expected shape before components attempt to read
 * address fields from it.
 */

describe('isValidUserData', () => {
  it('returns true for a well-formed user data object', () => {
    const data = {
      profile: {
        stxAddress: {
          mainnet: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
          testnet: 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQYAC0RQ',
        },
      },
    };
    expect(isValidUserData(data)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidUserData(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidUserData(undefined)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isValidUserData({})).toBe(false);
  });

  it('returns false when profile is missing', () => {
    expect(isValidUserData({ foo: 'bar' })).toBe(false);
  });

  it('returns false when stxAddress is missing', () => {
    expect(isValidUserData({ profile: {} })).toBe(false);
  });

  it('returns false when mainnet is missing', () => {
    expect(isValidUserData({ profile: { stxAddress: {} } })).toBe(false);
  });

  it('returns false when mainnet is empty string', () => {
    expect(isValidUserData({ profile: { stxAddress: { mainnet: '' } } })).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isValidUserData(42)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isValidUserData('SP2J6ZY...')).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isValidUserData([])).toBe(false);
  });

  it('returns true regardless of extra properties', () => {
    const data = {
      profile: {
        stxAddress: {
          mainnet: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        },
        name: 'Alice',
      },
      extra: true,
    };
    expect(isValidUserData(data)).toBe(true);
  });
});
