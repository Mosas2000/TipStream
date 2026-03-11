import { describe, it, expect } from 'vitest';
import { getNetworkAddress } from '../utils/user-data';

const MAINNET_ADDR = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
const TESTNET_ADDR = 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQYAC0RQ';

const validData = {
  profile: {
    stxAddress: {
      mainnet: MAINNET_ADDR,
      testnet: TESTNET_ADDR,
    },
  },
};

describe('getNetworkAddress', () => {
  it('returns mainnet address by default', () => {
    expect(getNetworkAddress(validData)).toBe(MAINNET_ADDR);
  });

  it('returns mainnet address when network is "mainnet"', () => {
    expect(getNetworkAddress(validData, 'mainnet')).toBe(MAINNET_ADDR);
  });

  it('returns testnet address when network is "testnet"', () => {
    expect(getNetworkAddress(validData, 'testnet')).toBe(TESTNET_ADDR);
  });

  it('returns testnet address when network is "devnet"', () => {
    expect(getNetworkAddress(validData, 'devnet')).toBe(TESTNET_ADDR);
  });

  it('falls back to mainnet for unrecognised network names', () => {
    expect(getNetworkAddress(validData, 'something')).toBe(MAINNET_ADDR);
  });

  it('returns null when data is null', () => {
    expect(getNetworkAddress(null, 'mainnet')).toBeNull();
  });

  it('returns null when data is undefined', () => {
    expect(getNetworkAddress(undefined, 'testnet')).toBeNull();
  });

  it('returns null when profile is missing', () => {
    expect(getNetworkAddress({}, 'mainnet')).toBeNull();
  });

  it('returns null when stxAddress is missing', () => {
    expect(getNetworkAddress({ profile: {} }, 'testnet')).toBeNull();
  });

  it('returns null when requested network key is missing', () => {
    const partial = { profile: { stxAddress: { mainnet: MAINNET_ADDR } } };
    expect(getNetworkAddress(partial, 'testnet')).toBeNull();
  });

  it('handles empty string address correctly', () => {
    const empty = { profile: { stxAddress: { mainnet: '', testnet: '' } } };
    expect(getNetworkAddress(empty, 'mainnet')).toBe('');
    expect(getNetworkAddress(empty, 'testnet')).toBe('');
  });
});
