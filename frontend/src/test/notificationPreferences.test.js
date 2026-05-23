import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadPreferences,
  savePreferences,
  clearPreferences,
  isEventEnabled,
  isChannelEnabled,
  DEFAULT_PREFERENCES,
  CHANNELS,
  EVENT_TYPES,
} from '../lib/notificationPreferences';

const ADDRESS = 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('loadPreferences', () => {
  it('returns defaults when nothing is stored', () => {
    const prefs = loadPreferences(ADDRESS);
    expect(prefs.channels).toEqual(DEFAULT_PREFERENCES.channels);
    expect(prefs.events).toEqual(DEFAULT_PREFERENCES.events);
    expect(prefs.email).toBeNull();
  });

  it('returns defaults when address is null', () => {
    const prefs = loadPreferences(null);
    expect(prefs.channels).toEqual(DEFAULT_PREFERENCES.channels);
  });

  it('returns stored preferences after savePreferences', () => {
    const custom = {
      channels: { in_app: false, email: true },
      events: { ...DEFAULT_PREFERENCES.events, tip_sent: true },
      email: 'user@example.com',
    };
    savePreferences(ADDRESS, custom);
    const loaded = loadPreferences(ADDRESS);
    expect(loaded.channels.in_app).toBe(false);
    expect(loaded.channels.email).toBe(true);
    expect(loaded.events.tip_sent).toBe(true);
    expect(loaded.email).toBe('user@example.com');
  });

  it('merges stored channels with defaults for missing keys', () => {
    localStorage.setItem(
      `tipstream_notif_prefs_${ADDRESS}`,
      JSON.stringify({ channels: { email: true } })
    );
    const prefs = loadPreferences(ADDRESS);
    expect(prefs.channels.email).toBe(true);
    expect(prefs.channels.in_app).toBe(DEFAULT_PREFERENCES.channels.in_app);
  });

  it('returns defaults when stored JSON is malformed', () => {
    localStorage.setItem(`tipstream_notif_prefs_${ADDRESS}`, 'not-json');
    const prefs = loadPreferences(ADDRESS);
    expect(prefs.channels).toEqual(DEFAULT_PREFERENCES.channels);
  });
});

describe('savePreferences', () => {
  it('persists preferences to localStorage', () => {
    savePreferences(ADDRESS, { ...DEFAULT_PREFERENCES, email: 'a@b.com' });
    const raw = localStorage.getItem(`tipstream_notif_prefs_${ADDRESS}`);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.email).toBe('a@b.com');
  });

  it('does nothing when address is null', () => {
    savePreferences(null, DEFAULT_PREFERENCES);
    expect(localStorage.length).toBe(0);
  });
});

describe('clearPreferences', () => {
  it('removes the stored key', () => {
    savePreferences(ADDRESS, DEFAULT_PREFERENCES);
    clearPreferences(ADDRESS);
    expect(localStorage.getItem(`tipstream_notif_prefs_${ADDRESS}`)).toBeNull();
  });

  it('does nothing when address is null', () => {
    savePreferences(ADDRESS, DEFAULT_PREFERENCES);
    clearPreferences(null);
    expect(localStorage.length).toBe(1);
  });
});

describe('isEventEnabled', () => {
  it('returns the default value when preferences is null', () => {
    expect(isEventEnabled(null, EVENT_TYPES.TIP_RECEIVED)).toBe(
      DEFAULT_PREFERENCES.events[EVENT_TYPES.TIP_RECEIVED]
    );
  });

  it('returns true for tip_received by default', () => {
    expect(isEventEnabled(DEFAULT_PREFERENCES, EVENT_TYPES.TIP_RECEIVED)).toBe(true);
  });

  it('returns false for tip_sent by default', () => {
    expect(isEventEnabled(DEFAULT_PREFERENCES, EVENT_TYPES.TIP_SENT)).toBe(false);
  });

  it('reflects a toggled value', () => {
    const prefs = {
      ...DEFAULT_PREFERENCES,
      events: { ...DEFAULT_PREFERENCES.events, tip_sent: true },
    };
    expect(isEventEnabled(prefs, EVENT_TYPES.TIP_SENT)).toBe(true);
  });

  it('falls back to default when event key is missing from preferences', () => {
    const prefs = { channels: DEFAULT_PREFERENCES.channels, events: {}, email: null };
    expect(isEventEnabled(prefs, EVENT_TYPES.TIP_RECEIVED)).toBe(true);
  });
});

describe('isChannelEnabled', () => {
  it('returns the default value when preferences is null', () => {
    expect(isChannelEnabled(null, CHANNELS.IN_APP)).toBe(
      DEFAULT_PREFERENCES.channels[CHANNELS.IN_APP]
    );
  });

  it('returns true for in_app by default', () => {
    expect(isChannelEnabled(DEFAULT_PREFERENCES, CHANNELS.IN_APP)).toBe(true);
  });

  it('returns false for email by default', () => {
    expect(isChannelEnabled(DEFAULT_PREFERENCES, CHANNELS.EMAIL)).toBe(false);
  });

  it('reflects a toggled value', () => {
    const prefs = {
      ...DEFAULT_PREFERENCES,
      channels: { ...DEFAULT_PREFERENCES.channels, email: true },
    };
    expect(isChannelEnabled(prefs, CHANNELS.EMAIL)).toBe(true);
  });
});

describe('DEFAULT_PREFERENCES shape', () => {
  it('has in_app enabled and email disabled by default', () => {
    expect(DEFAULT_PREFERENCES.channels[CHANNELS.IN_APP]).toBe(true);
    expect(DEFAULT_PREFERENCES.channels[CHANNELS.EMAIL]).toBe(false);
  });

  it('has tip_received enabled by default', () => {
    expect(DEFAULT_PREFERENCES.events[EVENT_TYPES.TIP_RECEIVED]).toBe(true);
  });

  it('has tip_sent disabled by default', () => {
    expect(DEFAULT_PREFERENCES.events[EVENT_TYPES.TIP_SENT]).toBe(false);
  });

  it('has all scheduled and refund events enabled by default', () => {
    expect(DEFAULT_PREFERENCES.events[EVENT_TYPES.SCHEDULED_TIP_EXECUTED]).toBe(true);
    expect(DEFAULT_PREFERENCES.events[EVENT_TYPES.SCHEDULED_TIP_FAILED]).toBe(true);
    expect(DEFAULT_PREFERENCES.events[EVENT_TYPES.REFUND_REQUESTED]).toBe(true);
    expect(DEFAULT_PREFERENCES.events[EVENT_TYPES.REFUND_RESOLVED]).toBe(true);
  });

  it('has null email by default', () => {
    expect(DEFAULT_PREFERENCES.email).toBeNull();
  });
});
