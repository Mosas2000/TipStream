const STORAGE_KEY_PREFIX = 'tipstream_notif_prefs_';

export const CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
};

export const EVENT_TYPES = {
  TIP_RECEIVED: 'tip_received',
  TIP_SENT: 'tip_sent',
  SCHEDULED_TIP_EXECUTED: 'scheduled_tip_executed',
  SCHEDULED_TIP_FAILED: 'scheduled_tip_failed',
  REFUND_REQUESTED: 'refund_requested',
  REFUND_RESOLVED: 'refund_resolved',
};

export const DEFAULT_PREFERENCES = {
  channels: {
    [CHANNELS.IN_APP]: true,
    [CHANNELS.EMAIL]: false,
  },
  events: {
    [EVENT_TYPES.TIP_RECEIVED]: true,
    [EVENT_TYPES.TIP_SENT]: false,
    [EVENT_TYPES.SCHEDULED_TIP_EXECUTED]: true,
    [EVENT_TYPES.SCHEDULED_TIP_FAILED]: true,
    [EVENT_TYPES.REFUND_REQUESTED]: true,
    [EVENT_TYPES.REFUND_RESOLVED]: true,
  },
  email: null,
};

export const EVENT_LABELS = {
  [EVENT_TYPES.TIP_RECEIVED]: 'Tip received',
  [EVENT_TYPES.TIP_SENT]: 'Tip sent confirmation',
  [EVENT_TYPES.SCHEDULED_TIP_EXECUTED]: 'Scheduled tip executed',
  [EVENT_TYPES.SCHEDULED_TIP_FAILED]: 'Scheduled tip failed',
  [EVENT_TYPES.REFUND_REQUESTED]: 'Refund requested',
  [EVENT_TYPES.REFUND_RESOLVED]: 'Refund resolved',
};

export const CHANNEL_LABELS = {
  [CHANNELS.IN_APP]: 'In-app notifications',
  [CHANNELS.EMAIL]: 'Email notifications',
};

function storageKey(address) {
  return `${STORAGE_KEY_PREFIX}${address}`;
}

export function loadPreferences(address) {
  if (!address) return { ...DEFAULT_PREFERENCES };
  try {
    const raw = localStorage.getItem(storageKey(address));
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    return {
      channels: { ...DEFAULT_PREFERENCES.channels, ...(parsed.channels || {}) },
      events: { ...DEFAULT_PREFERENCES.events, ...(parsed.events || {}) },
      email: parsed.email || null,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(address, preferences) {
  if (!address) return;
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(preferences));
  } catch {
    // localStorage may be unavailable
  }
}

export function clearPreferences(address) {
  if (!address) return;
  try {
    localStorage.removeItem(storageKey(address));
  } catch {
    // localStorage may be unavailable
  }
}

export function isEventEnabled(preferences, eventType) {
  if (!preferences) return DEFAULT_PREFERENCES.events[eventType] ?? true;
  return preferences.events?.[eventType] ?? DEFAULT_PREFERENCES.events[eventType] ?? true;
}

export function isChannelEnabled(preferences, channel) {
  if (!preferences) return DEFAULT_PREFERENCES.channels[channel] ?? false;
  return preferences.channels?.[channel] ?? DEFAULT_PREFERENCES.channels[channel] ?? false;
}
