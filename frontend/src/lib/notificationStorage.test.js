import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getNotificationStorageKey,
  migrateLegacyNotificationState,
  getLastSeenTimestamp,
  setLastSeenTimestamp
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

describe('migrateLegacyNotificationState', () => {
  const legacyKey = 'tipstream_last_seen_tip_ts';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should migrate legacy value to scoped key', () => {
    localStorage.setItem(legacyKey, '1234567890');
    
    const migrated = migrateLegacyNotificationState('SP123ABC', 'mainnet');
    
    expect(migrated).toBe(1234567890);
    expect(getLastSeenTimestamp('SP123ABC', 'mainnet')).toBe(1234567890);
  });

  it('should not overwrite existing scoped value', () => {
    localStorage.setItem(legacyKey, '1111111111');
    setLastSeenTimestamp('SP123ABC', 'mainnet', 2222222222);
    
    const migrated = migrateLegacyNotificationState('SP123ABC', 'mainnet');
    
    expect(migrated).toBeNull();
    expect(getLastSeenTimestamp('SP123ABC', 'mainnet')).toBe(2222222222);
  });

  it('should return null when no legacy value exists', () => {
    const migrated = migrateLegacyNotificationState('SP123ABC', 'mainnet');
    expect(migrated).toBeNull();
  });

  it('should return null for missing address', () => {
    localStorage.setItem(legacyKey, '1234567890');
    const migrated = migrateLegacyNotificationState(null, 'mainnet');
    expect(migrated).toBeNull();
  });

  it('should return null for missing network', () => {
    localStorage.setItem(legacyKey, '1234567890');
    const migrated = migrateLegacyNotificationState('SP123ABC', null);
    expect(migrated).toBeNull();
  });

  it('should migrate once per address-network pair', () => {
    localStorage.setItem(legacyKey, '1234567890');
    
    const migrated1 = migrateLegacyNotificationState('SP123ABC', 'mainnet');
    const migrated2 = migrateLegacyNotificationState('SP123ABC', 'mainnet');
    
    expect(migrated1).toBe(1234567890);
    expect(migrated2).toBeNull();
  });
});
