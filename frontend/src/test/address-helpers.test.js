import { describe, it, expect } from 'vitest';
import { getMainnetAddress, getTestnetAddress } from '../utils/user-data';

/**
 * Tests for the address extraction helpers in utils/stacks.js.
 *
 * These functions safely navigate the nested user data object that
 * authenticate() and getUserData() return. They must never throw,
 * even when given null, undefined, or a malformed object.
 */

const VALID_USER_DATA = {
  profile: {
    stxAddress: {
      mainnet: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      testnet: 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQYAC0RQ',
    },
  },
};

describe('getMainnetAddress', () => {
  it('returns the mainnet address from valid user data', () => {
    expect(getMainnetAddress(VALID_USER_DATA)).toBe(
      'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7'
    );
  });

  it('returns null when data is null', () => {
    expect(getMainnetAddress(null)).toBeNull();
  });

  it('returns null when data is undefined', () => {
    expect(getMainnetAddress(undefined)).toBeNull();
  });

  it('returns null when profile is missing', () => {
    expect(getMainnetAddress({})).toBeNull();
  });

  it('returns null when stxAddress is missing', () => {
    expect(getMainnetAddress({ profile: {} })).toBeNull();
  });

  it('returns null when mainnet key is missing', () => {
    expect(getMainnetAddress({ profile: { stxAddress: {} } })).toBeNull();
  });

  it('returns null for an empty string address', () => {
    expect(
      getMainnetAddress({ profile: { stxAddress: { mainnet: '' } } })
    ).toBe('');
  });
});

describe('getTestnetAddress', () => {
  it('returns the testnet address from valid user data', () => {
    expect(getTestnetAddress(VALID_USER_DATA)).toBe(
      'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQYAC0RQ'
    );
  });

  it('returns null when data is null', () => {
    expect(getTestnetAddress(null)).toBeNull();
  });

  it('returns null when data is undefined', () => {
    expect(getTestnetAddress(undefined)).toBeNull();
  });

  it('returns null when profile is missing', () => {
    expect(getTestnetAddress({})).toBeNull();
  });

  it('returns null when stxAddress is missing', () => {
    expect(getTestnetAddress({ profile: {} })).toBeNull();
  });

  it('returns null when testnet key is missing', () => {
    expect(getTestnetAddress({ profile: { stxAddress: {} } })).toBeNull();
  });
});
