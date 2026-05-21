import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { DEFAULT_PREFERENCES, CHANNELS, EVENT_TYPES } from '../lib/notificationPreferences';

vi.mock('../context/TipContext', () => ({
  useTipContext: vi.fn(() => ({
    events: [],
    eventsLoading: false,
  })),
}));

vi.mock('../config/contracts', () => ({
  NETWORK_NAME: 'mainnet',
}));

import { useNotifications } from '../hooks/useNotifications';
import { useTipContext } from '../context/TipContext';

const USER_ADDRESS = 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE';

function makeTipEvent(overrides = {}) {
  return {
    event: 'tip-sent',
    sender: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
    recipient: USER_ADDRESS,
    amount: '1000000',
    timestamp: Math.floor(Date.now() / 1000) + 100,
    txId: '0x' + Math.random().toString(16).slice(2, 18),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useNotifications with preferences', () => {
  it('returns notifications when in_app channel is enabled (default)', () => {
    useTipContext.mockReturnValue({
      events: [makeTipEvent()],
      eventsLoading: false,
    });
    const { result } = renderHook(() =>
      useNotifications(USER_ADDRESS, DEFAULT_PREFERENCES)
    );
    expect(result.current.notifications.length).toBe(1);
  });

  it('returns empty notifications when in_app channel is disabled', () => {
    useTipContext.mockReturnValue({
      events: [makeTipEvent()],
      eventsLoading: false,
    });
    const prefs = {
      ...DEFAULT_PREFERENCES,
      channels: { ...DEFAULT_PREFERENCES.channels, [CHANNELS.IN_APP]: false },
    };
    const { result } = renderHook(() => useNotifications(USER_ADDRESS, prefs));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('returns empty notifications when tip_received event is disabled', () => {
    useTipContext.mockReturnValue({
      events: [makeTipEvent()],
      eventsLoading: false,
    });
    const prefs = {
      ...DEFAULT_PREFERENCES,
      events: { ...DEFAULT_PREFERENCES.events, [EVENT_TYPES.TIP_RECEIVED]: false },
    };
    const { result } = renderHook(() => useNotifications(USER_ADDRESS, prefs));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('returns empty notifications when both in_app and tip_received are disabled', () => {
    useTipContext.mockReturnValue({
      events: [makeTipEvent(), makeTipEvent()],
      eventsLoading: false,
    });
    const prefs = {
      ...DEFAULT_PREFERENCES,
      channels: { ...DEFAULT_PREFERENCES.channels, [CHANNELS.IN_APP]: false },
      events: { ...DEFAULT_PREFERENCES.events, [EVENT_TYPES.TIP_RECEIVED]: false },
    };
    const { result } = renderHook(() => useNotifications(USER_ADDRESS, prefs));
    expect(result.current.notifications).toEqual([]);
  });

  it('returns notifications when preferences is null (backward compat)', () => {
    useTipContext.mockReturnValue({
      events: [makeTipEvent()],
      eventsLoading: false,
    });
    const { result } = renderHook(() => useNotifications(USER_ADDRESS, null));
    expect(result.current.notifications.length).toBe(1);
  });

  it('returns notifications when preferences is undefined (backward compat)', () => {
    useTipContext.mockReturnValue({
      events: [makeTipEvent()],
      eventsLoading: false,
    });
    const { result } = renderHook(() => useNotifications(USER_ADDRESS));
    expect(result.current.notifications.length).toBe(1);
  });

  it('unread count is 0 when in_app is disabled even with new events', () => {
    useTipContext.mockReturnValue({
      events: [makeTipEvent()],
      eventsLoading: false,
    });
    const prefs = {
      ...DEFAULT_PREFERENCES,
      channels: { ...DEFAULT_PREFERENCES.channels, [CHANNELS.IN_APP]: false },
    };
    const { result } = renderHook(() => useNotifications(USER_ADDRESS, prefs));
    expect(result.current.unreadCount).toBe(0);
  });

  it('unread count is 0 when tip_received is disabled even with new events', () => {
    useTipContext.mockReturnValue({
      events: [makeTipEvent()],
      eventsLoading: false,
    });
    const prefs = {
      ...DEFAULT_PREFERENCES,
      events: { ...DEFAULT_PREFERENCES.events, [EVENT_TYPES.TIP_RECEIVED]: false },
    };
    const { result } = renderHook(() => useNotifications(USER_ADDRESS, prefs));
    expect(result.current.unreadCount).toBe(0);
  });

  it('re-enables notifications when preferences change back to enabled', () => {
    const event = makeTipEvent();
    useTipContext.mockReturnValue({
      events: [event],
      eventsLoading: false,
    });

    const disabledPrefs = {
      ...DEFAULT_PREFERENCES,
      channels: { ...DEFAULT_PREFERENCES.channels, [CHANNELS.IN_APP]: false },
    };

    const { result, rerender } = renderHook(
      ({ prefs }) => useNotifications(USER_ADDRESS, prefs),
      { initialProps: { prefs: disabledPrefs } }
    );
    expect(result.current.notifications).toEqual([]);

    rerender({ prefs: DEFAULT_PREFERENCES });
    expect(result.current.notifications.length).toBe(1);
  });

  it('other event types in preferences do not affect tip_received notifications', () => {
    useTipContext.mockReturnValue({
      events: [makeTipEvent()],
      eventsLoading: false,
    });
    const prefs = {
      ...DEFAULT_PREFERENCES,
      events: {
        ...DEFAULT_PREFERENCES.events,
        [EVENT_TYPES.TIP_SENT]: false,
        [EVENT_TYPES.REFUND_REQUESTED]: false,
      },
    };
    const { result } = renderHook(() => useNotifications(USER_ADDRESS, prefs));
    expect(result.current.notifications.length).toBe(1);
  });
});
