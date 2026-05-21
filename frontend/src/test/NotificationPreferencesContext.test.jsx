import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  NotificationPreferencesProvider,
  useNotificationPreferences,
} from '../context/NotificationPreferencesContext';
import {
  DEFAULT_PREFERENCES,
  CHANNELS,
  EVENT_TYPES,
} from '../lib/notificationPreferences';

const ADDRESS = 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE';

function wrapper({ children }) {
  return (
    <NotificationPreferencesProvider userAddress={ADDRESS}>
      {children}
    </NotificationPreferencesProvider>
  );
}

function wrapperNoAddress({ children }) {
  return (
    <NotificationPreferencesProvider>
      {children}
    </NotificationPreferencesProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useNotificationPreferences', () => {
  it('throws when used outside the provider', () => {
    expect(() => {
      renderHook(() => useNotificationPreferences());
    }).toThrow('useNotificationPreferences must be used within');
  });

  it('returns default preferences on first render', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    expect(result.current.preferences.channels).toEqual(DEFAULT_PREFERENCES.channels);
    expect(result.current.preferences.events).toEqual(DEFAULT_PREFERENCES.events);
    expect(result.current.preferences.email).toBeNull();
  });

  it('works without a userAddress prop', () => {
    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper: wrapperNoAddress,
    });
    expect(result.current.preferences.channels).toEqual(DEFAULT_PREFERENCES.channels);
  });
});

describe('toggleChannel', () => {
  it('disables in_app channel', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleChannel(CHANNELS.IN_APP, false);
    });
    expect(result.current.preferences.channels[CHANNELS.IN_APP]).toBe(false);
  });

  it('enables email channel', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleChannel(CHANNELS.EMAIL, true);
    });
    expect(result.current.preferences.channels[CHANNELS.EMAIL]).toBe(true);
  });

  it('does not affect other channels when toggling one', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleChannel(CHANNELS.EMAIL, true);
    });
    expect(result.current.preferences.channels[CHANNELS.IN_APP]).toBe(
      DEFAULT_PREFERENCES.channels[CHANNELS.IN_APP]
    );
  });

  it('persists the change to localStorage', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleChannel(CHANNELS.EMAIL, true);
    });
    const stored = JSON.parse(
      localStorage.getItem(`tipstream_notif_prefs_${ADDRESS}`)
    );
    expect(stored.channels[CHANNELS.EMAIL]).toBe(true);
  });
});

describe('toggleEvent', () => {
  it('disables tip_received event', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleEvent(EVENT_TYPES.TIP_RECEIVED, false);
    });
    expect(result.current.preferences.events[EVENT_TYPES.TIP_RECEIVED]).toBe(false);
  });

  it('enables tip_sent event', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleEvent(EVENT_TYPES.TIP_SENT, true);
    });
    expect(result.current.preferences.events[EVENT_TYPES.TIP_SENT]).toBe(true);
  });

  it('does not affect other events when toggling one', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleEvent(EVENT_TYPES.TIP_SENT, true);
    });
    expect(result.current.preferences.events[EVENT_TYPES.TIP_RECEIVED]).toBe(
      DEFAULT_PREFERENCES.events[EVENT_TYPES.TIP_RECEIVED]
    );
  });

  it('persists the change to localStorage', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleEvent(EVENT_TYPES.TIP_SENT, true);
    });
    const stored = JSON.parse(
      localStorage.getItem(`tipstream_notif_prefs_${ADDRESS}`)
    );
    expect(stored.events[EVENT_TYPES.TIP_SENT]).toBe(true);
  });
});

describe('setEmail', () => {
  it('stores an email address', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.setEmail('user@example.com');
    });
    expect(result.current.preferences.email).toBe('user@example.com');
  });

  it('clears the email when called with empty string', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.setEmail('user@example.com');
    });
    act(() => {
      result.current.setEmail('');
    });
    expect(result.current.preferences.email).toBeNull();
  });

  it('clears the email when called with null', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.setEmail('user@example.com');
    });
    act(() => {
      result.current.setEmail(null);
    });
    expect(result.current.preferences.email).toBeNull();
  });
});

describe('resetToDefaults', () => {
  it('restores all preferences to defaults', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleChannel(CHANNELS.IN_APP, false);
      result.current.toggleEvent(EVENT_TYPES.TIP_RECEIVED, false);
      result.current.setEmail('user@example.com');
    });
    act(() => {
      result.current.resetToDefaults();
    });
    expect(result.current.preferences.channels).toEqual(DEFAULT_PREFERENCES.channels);
    expect(result.current.preferences.events).toEqual(DEFAULT_PREFERENCES.events);
    expect(result.current.preferences.email).toBeNull();
  });

  it('removes the localStorage entry', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleChannel(CHANNELS.EMAIL, true);
    });
    act(() => {
      result.current.resetToDefaults();
    });
    expect(localStorage.getItem(`tipstream_notif_prefs_${ADDRESS}`)).toBeNull();
  });
});

describe('isEventEnabled helper', () => {
  it('returns true for tip_received with default preferences', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    expect(result.current.isEventEnabled(EVENT_TYPES.TIP_RECEIVED)).toBe(true);
  });

  it('returns false for tip_sent with default preferences', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    expect(result.current.isEventEnabled(EVENT_TYPES.TIP_SENT)).toBe(false);
  });

  it('reflects a toggled event', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleEvent(EVENT_TYPES.TIP_SENT, true);
    });
    expect(result.current.isEventEnabled(EVENT_TYPES.TIP_SENT)).toBe(true);
  });
});

describe('isChannelEnabled helper', () => {
  it('returns true for in_app with default preferences', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    expect(result.current.isChannelEnabled(CHANNELS.IN_APP)).toBe(true);
  });

  it('returns false for email with default preferences', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    expect(result.current.isChannelEnabled(CHANNELS.EMAIL)).toBe(false);
  });

  it('reflects a toggled channel', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.toggleChannel(CHANNELS.EMAIL, true);
    });
    expect(result.current.isChannelEnabled(CHANNELS.EMAIL)).toBe(true);
  });
});

describe('updatePreferences', () => {
  it('applies a full preferences update', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.updatePreferences({
        channels: { email: true },
        events: { tip_sent: true },
        email: 'bulk@example.com',
      });
    });
    expect(result.current.preferences.channels.email).toBe(true);
    expect(result.current.preferences.events.tip_sent).toBe(true);
    expect(result.current.preferences.email).toBe('bulk@example.com');
  });

  it('does not overwrite untouched fields in a partial update', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    act(() => {
      result.current.updatePreferences({ channels: { email: true } });
    });
    expect(result.current.preferences.channels.in_app).toBe(
      DEFAULT_PREFERENCES.channels.in_app
    );
    expect(result.current.preferences.events).toEqual(DEFAULT_PREFERENCES.events);
  });
});

describe('reloadFromStorage', () => {
  it('picks up changes written directly to localStorage', () => {
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });
    localStorage.setItem(
      `tipstream_notif_prefs_${ADDRESS}`,
      JSON.stringify({
        channels: { in_app: false, email: true },
        events: DEFAULT_PREFERENCES.events,
        email: 'reload@example.com',
      })
    );
    act(() => {
      result.current.reloadFromStorage();
    });
    expect(result.current.preferences.channels.in_app).toBe(false);
    expect(result.current.preferences.email).toBe('reload@example.com');
  });
});
