import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSessionSync } from './useSessionSync';
import * as stacksUtils from '../utils/stacks';

vi.mock('../utils/stacks', () => ({
  userSession: {
    isUserSignedIn: vi.fn(),
    loadUserData: vi.fn(),
  },
}));

describe('useSessionSync', () => {
  let mockCallback;
  let addEventListenerSpy;
  let removeEventListenerSpy;

  beforeEach(() => {
    mockCallback = vi.fn();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    vi.clearAllMocks();
    stacksUtils.userSession.isUserSignedIn.mockReturnValue(false);
    stacksUtils.userSession.loadUserData.mockReturnValue(null);
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('registers storage event listener on mount', () => {
    renderHook(() => useSessionSync(mockCallback));

    expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('unregisters storage event listener on unmount', () => {
    const { unmount } = renderHook(() => useSessionSync(mockCallback));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
  });

  it('does not call callback when callback is not provided', () => {
    renderHook(() => useSessionSync(null));

    // Should not crash, and no callback to call
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('detects session logout from another tab', () => {
    const { rerender } = renderHook(() => useSessionSync(mockCallback));

    // Simulate other tab logging out
    stacksUtils.userSession.isUserSignedIn.mockReturnValue(false);

    const storageEvent = new StorageEvent('storage', {
      key: 'blockstack-session',
      newValue: null,
    });
    window.dispatchEvent(storageEvent);

    expect(mockCallback).toHaveBeenCalledWith({
      isSignedIn: false,
      userData: null,
    });
  });

  it('detects session login from another tab', () => {
    renderHook(() => useSessionSync(mockCallback));

    const mockUserData = {
      profile: {
        stxAddress: { mainnet: 'SP2R...' },
      },
    };

    // Simulate other tab logging in
    stacksUtils.userSession.isUserSignedIn.mockReturnValue(true);
    stacksUtils.userSession.loadUserData.mockReturnValue(mockUserData);

    const storageEvent = new StorageEvent('storage', {
      key: 'blockstack-session',
      newValue: JSON.stringify({ userData: mockUserData }),
    });
    window.dispatchEvent(storageEvent);

    expect(mockCallback).toHaveBeenCalledWith({
      isSignedIn: true,
      userData: mockUserData,
    });
  });

  it('ignores storage events for other keys', () => {
    renderHook(() => useSessionSync(mockCallback));

    const storageEvent = new StorageEvent('storage', {
      key: 'some-other-key',
      newValue: 'some value',
    });
    window.dispatchEvent(storageEvent);

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('ignores storage events where key is null (full clear)', () => {
    renderHook(() => useSessionSync(mockCallback));

    // Full localStorage clear emits event with key=null
    const storageEvent = new StorageEvent('storage', {
      key: null,
    });
    window.dispatchEvent(storageEvent);

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('handles wallet provider account change events', () => {
    const mockProvider = {
      on: vi.fn(),
      removeListener: vi.fn(),
    };
    window.StacksProvider = mockProvider;

    const mockUserData = {
      profile: {
        stxAddress: { mainnet: 'SP3XY...' },
      },
    };

    renderHook(() => useSessionSync(mockCallback));

    // Get the registered callback
    const accountChangeCallback = mockProvider.on.mock.calls[0]?.[1];
    expect(accountChangeCallback).toBeDefined();

    // Simulate account change event
    stacksUtils.userSession.isUserSignedIn.mockReturnValue(true);
    stacksUtils.userSession.loadUserData.mockReturnValue(mockUserData);
    accountChangeCallback();

    expect(mockCallback).toHaveBeenCalledWith({
      isSignedIn: true,
      userData: mockUserData,
    });

    // Cleanup
    delete window.StacksProvider;
  });

  it('handles Leather provider account changes', () => {
    const mockProvider = {
      on: vi.fn(),
      removeListener: vi.fn(),
    };
    window.LeatherProvider = mockProvider;

    const mockUserData = {
      profile: {
        stxAddress: { mainnet: 'SP4AB...' },
      },
    };

    renderHook(() => useSessionSync(mockCallback));

    const accountChangeCallback = mockProvider.on.mock.calls[0]?.[1];
    expect(accountChangeCallback).toBeDefined();

    stacksUtils.userSession.isUserSignedIn.mockReturnValue(true);
    stacksUtils.userSession.loadUserData.mockReturnValue(mockUserData);
    accountChangeCallback();

    expect(mockCallback).toHaveBeenCalledWith({
      isSignedIn: true,
      userData: mockUserData,
    });

    // Cleanup
    delete window.LeatherProvider;
  });

  it('removes provider listeners on unmount', () => {
    const mockProvider = {
      on: vi.fn(),
      removeListener: vi.fn(),
    };
    window.StacksProvider = mockProvider;

    const { unmount } = renderHook(() => useSessionSync(mockCallback));

    const accountChangeCallback = mockProvider.on.mock.calls[0]?.[1];

    unmount();

    expect(mockProvider.removeListener).toHaveBeenCalledWith(
      'accountsChanged',
      accountChangeCallback
    );

    // Cleanup
    delete window.StacksProvider;
  });

  it('handles rapid successive storage events', () => {
    renderHook(() => useSessionSync(mockCallback));

    const mockUserData1 = {
      profile: { stxAddress: { mainnet: 'SP1...' } },
    };
    const mockUserData2 = {
      profile: { stxAddress: { mainnet: 'SP2...' } },
    };

    // Simulate rapid account switches
    stacksUtils.userSession.isUserSignedIn.mockReturnValue(true);
    stacksUtils.userSession.loadUserData.mockReturnValue(mockUserData1);

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'blockstack-session' })
    );

    stacksUtils.userSession.loadUserData.mockReturnValue(mockUserData2);
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'blockstack-session' })
    );

    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenNthCalledWith(1, {
      isSignedIn: true,
      userData: mockUserData1,
    });
    expect(mockCallback).toHaveBeenNthCalledWith(2, {
      isSignedIn: true,
      userData: mockUserData2,
    });
  });

  it('works with callback updates', () => {
    const { rerender } = renderHook(
      ({ cb }) => useSessionSync(cb),
      { initialProps: { cb: mockCallback } }
    );

    const newCallback = vi.fn();
    rerender({ cb: newCallback });

    stacksUtils.userSession.isUserSignedIn.mockReturnValue(true);
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'blockstack-session' })
    );

    // New callback should be called
    expect(newCallback).toHaveBeenCalled();
    expect(mockCallback).not.toHaveBeenCalled();
  });
});
