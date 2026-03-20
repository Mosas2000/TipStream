import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getNotificationStorageKey,
  migrateLegacyNotificationState,
  getLastSeenTimestamp,
  setLastSeenTimestamp,
  getAllScopedNotificationKeys,
  clearAllNotificationState,
  getNotificationStateForAddress
} from './notificationStorage';

describe('getNotificationStorageKey', () => {
  it('should generate scoped key for address and network', () => {
    const key = getNotificationStorageKey('SP123ABC', 'mainnet');
    expect(key).toBe('tipstream_last_seen_mainnet_SP123ABC');
  });

  it('should generate different keys for different addresses', () => {
    const key1 = getNotificationStorageKey('SP123ABC', 'mainnet');
    const key2 = getNotificationStorageKey('SP456DEF', 'mainnet');
    expect(key1).not.toBe(key2);
  });

  it('should generate different keys for different networks', () => {
    const key1 = getNotificationStorageKey('SP123ABC', 'mainnet');
    const key2 = getNotificationStorageKey('SP123ABC', 'testnet');
    expect(key1).not.toBe(key2);
  });

  it('should return null for missing address', () => {
    const key = getNotificationStorageKey(null, 'mainnet');
    expect(key).toBeNull();
  });

  it('should return null for missing network', () => {
    const key = getNotificationStorageKey('SP123ABC', null);
    expect(key).toBeNull();
  });
});

describe('getLastSeenTimestamp', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return 0 for new user', () => {
    const timestamp = getLastSeenTimestamp('SP123ABC', 'mainnet');
    expect(timestamp).toBe(0);
  });

  it('should return stored timestamp', () => {
    setLastSeenTimestamp('SP123ABC', 'mainnet', 1234567890);
    const timestamp = getLastSeenTimestamp('SP123ABC', 'mainnet');
    expect(timestamp).toBe(1234567890);
  });

  it('should return 0 for missing address', () => {
    const timestamp = getLastSeenTimestamp(null, 'mainnet');
    expect(timestamp).toBe(0);
  });

  it('should return 0 for missing network', () => {
    const timestamp = getLastSeenTimestamp('SP123ABC', null);
    expect(timestamp).toBe(0);
  });
});

describe('setLastSeenTimestamp', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store timestamp', () => {
    setLastSeenTimestamp('SP123ABC', 'mainnet', 1234567890);
    const stored = localStorage.getItem('tipstream_last_seen_mainnet_SP123ABC');
    expect(stored).toBe('1234567890');
  });

  it('should not store for missing address', () => {
    setLastSeenTimestamp(null, 'mainnet', 1234567890);
    expect(localStorage.length).toBe(0);
  });

  it('should not store for missing network', () => {
    setLastSeenTimestamp('SP123ABC', null, 1234567890);
    expect(localStorage.length).toBe(0);
  });

  it('should isolate storage by address', () => {
    setLastSeenTimestamp('SP123ABC', 'mainnet', 1111111111);
    setLastSeenTimestamp('SP456DEF', 'mainnet', 2222222222);
    
    expect(getLastSeenTimestamp('SP123ABC', 'mainnet')).toBe(1111111111);
    expect(getLastSeenTimestamp('SP456DEF', 'mainnet')).toBe(2222222222);
  });

  it('should isolate storage by network', () => {
    setLastSeenTimestamp('SP123ABC', 'mainnet', 1111111111);
    setLastSeenTimestamp('SP123ABC', 'testnet', 2222222222);
    
    expect(getLastSeenTimestamp('SP123ABC', 'mainnet')).toBe(1111111111);
    expect(getLastSeenTimestamp('SP123ABC', 'testnet')).toBe(2222222222);
  });
});

describe('getAllScopedNotificationKeys', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return all scoped notification keys', () => {
    setLastSeenTimestamp('SP111...', 'mainnet', 1000);
    setLastSeenTimestamp('SP222...', 'mainnet', 2000);
    setLastSeenTimestamp('SP111...', 'testnet', 3000);
    
    const keys = getAllScopedNotificationKeys();
    
    expect(keys).toHaveLength(3);
    expect(keys).toContain('tipstream_last_seen_mainnet_SP111...');
    expect(keys).toContain('tipstream_last_seen_mainnet_SP222...');
    expect(keys).toContain('tipstream_last_seen_testnet_SP111...');
  });

  it('should not include legacy key', () => {
    localStorage.setItem('tipstream_last_seen_tip_ts', '1000');
    setLastSeenTimestamp('SP111...', 'mainnet', 2000);
    
    const keys = getAllScopedNotificationKeys();
    
    expect(keys).toHaveLength(1);
    expect(keys).not.toContain('tipstream_last_seen_tip_ts');
  });

  it('should return empty array for fresh storage', () => {
    const keys = getAllScopedNotificationKeys();
    expect(keys).toHaveLength(0);
  });
});

describe('clearAllNotificationState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should clear all scoped notification state', () => {
    setLastSeenTimestamp('SP111...', 'mainnet', 1000);
    setLastSeenTimestamp('SP222...', 'mainnet', 2000);
    setLastSeenTimestamp('SP111...', 'testnet', 3000);
    
    clearAllNotificationState();
    
    expect(getLastSeenTimestamp('SP111...', 'mainnet')).toBe(0);
    expect(getLastSeenTimestamp('SP222...', 'mainnet')).toBe(0);
    expect(getLastSeenTimestamp('SP111...', 'testnet')).toBe(0);
  });

  it('should not clear other storage keys', () => {
    localStorage.setItem('other_key', 'value');
    setLastSeenTimestamp('SP111...', 'mainnet', 1000);
    
    clearAllNotificationState();
    
    expect(localStorage.getItem('other_key')).toBe('value');
  });
});

describe('getNotificationStateForAddress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should get all states for an address', () => {
    setLastSeenTimestamp('SP111...', 'mainnet', 1000);
    setLastSeenTimestamp('SP111...', 'testnet', 2000);
    
    const states = getNotificationStateForAddress('SP111...');
    
    expect(states['tipstream_last_seen_mainnet_SP111...']).toBe(1000);
    expect(states['tipstream_last_seen_testnet_SP111...']).toBe(2000);
  });

  it('should not include states for other addresses', () => {
    setLastSeenTimestamp('SP111...', 'mainnet', 1000);
    setLastSeenTimestamp('SP222...', 'mainnet', 2000);
    
    const states = getNotificationStateForAddress('SP111...');
    
    expect(Object.keys(states)).toHaveLength(1);
    expect(states['tipstream_last_seen_mainnet_SP111...']).toBe(1000);
  });

  it('should return empty object for address with no state', () => {
    const states = getNotificationStateForAddress('SP999...');
    expect(states).toEqual({});
  });
});
