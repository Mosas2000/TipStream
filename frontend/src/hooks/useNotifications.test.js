import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotifications } from './useNotifications';
import * as notificationStorage from '../lib/notificationStorage';

vi.mock('../context/TipContext', () => ({
  useTipContext: () => ({
    events: [],
    eventsLoading: false
  })
}));

vi.mock('../config/contracts', () => ({
  NETWORK_NAME: 'mainnet'
}));

describe('useNotifications - multi-account isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should isolate notification state by address', () => {
    const address1 = 'SP111111111111111111111111111111111';
    const address2 = 'SP222222222222222222222222222222222';
    
    notificationStorage.setLastSeenTimestamp(address1, 'mainnet', 1000);
    notificationStorage.setLastSeenTimestamp(address2, 'mainnet', 2000);
    
    const { result: result1 } = renderHook(() => useNotifications(address1));
    const { result: result2 } = renderHook(() => useNotifications(address2));
    
    expect(result1.current.lastSeenTimestamp).toBe(1000);
    expect(result2.current.lastSeenTimestamp).toBe(2000);
  });

  it('should not share state between different addresses', () => {
    const address1 = 'SP111111111111111111111111111111111';
    const address2 = 'SP222222222222222222222222222222222';
    
    const { result: result1 } = renderHook(() => useNotifications(address1));
    
    act(() => {
      result1.current.markAllRead();
    });
    
    const { result: result2 } = renderHook(() => useNotifications(address2));
    
    expect(result2.current.lastSeenTimestamp).toBe(0);
  });

  it('should reset state when address changes', () => {
    const address1 = 'SP111111111111111111111111111111111';
    const address2 = 'SP222222222222222222222222222222222';
    
    notificationStorage.setLastSeenTimestamp(address1, 'mainnet', 1000);
    notificationStorage.setLastSeenTimestamp(address2, 'mainnet', 2000);
    
    const { result, rerender } = renderHook(
      ({ addr }) => useNotifications(addr),
      { initialProps: { addr: address1 } }
    );
    
    expect(result.current.lastSeenTimestamp).toBe(1000);
    
    rerender({ addr: address2 });
    
    expect(result.current.lastSeenTimestamp).toBe(2000);
  });

  it('should reset to zero when disconnecting wallet', () => {
    const address = 'SP111111111111111111111111111111111';
    
    notificationStorage.setLastSeenTimestamp(address, 'mainnet', 1000);
    
    const { result, rerender } = renderHook(
      ({ addr }) => useNotifications(addr),
      { initialProps: { addr: address } }
    );
    
    expect(result.current.lastSeenTimestamp).toBe(1000);
    
    rerender({ addr: null });
    
    expect(result.current.lastSeenTimestamp).toBe(0);
  });
});
