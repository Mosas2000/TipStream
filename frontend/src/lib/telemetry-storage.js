import { getEnvironment, TelemetryEnvironment } from './telemetry-env';

const STORAGE_PREFIX = 'tipstream_telemetry_';
const MAX_HISTORY_ENTRIES = 100;

function getStorageKey(key) {
  const env = getEnvironment();
  return `${STORAGE_PREFIX}${env}_${key}`;
}

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function loadTelemetryData(key) {
  const storageKey = getStorageKey(key);
  const raw = safeGetItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveTelemetryData(key, data) {
  const storageKey = getStorageKey(key);
  const serialized = JSON.stringify(data);
  return safeSetItem(storageKey, serialized);
}

export function clearTelemetryData(key) {
  const storageKey = getStorageKey(key);
  return safeRemoveItem(storageKey);
}

export function appendToHistory(key, entry) {
  const history = loadTelemetryData(key) || [];
  history.push({
    ...entry,
    timestamp: Date.now(),
  });
  while (history.length > MAX_HISTORY_ENTRIES) {
    history.shift();
  }
  saveTelemetryData(key, history);
  return history;
}

export function getHistoryWindow(key, windowMs) {
  const history = loadTelemetryData(key) || [];
  const cutoff = Date.now() - windowMs;
  return history.filter(entry => entry.timestamp >= cutoff);
}

export function getAllEnvironmentData() {
  const result = {};
  const environments = Object.values(TelemetryEnvironment);

  for (const env of environments) {
    result[env] = {};
    const prefix = `${STORAGE_PREFIX}${env}_`;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const shortKey = key.slice(prefix.length);
          const raw = localStorage.getItem(key);
          try {
            result[env][shortKey] = JSON.parse(raw);
          } catch {
            result[env][shortKey] = raw;
          }
        }
      }
    } catch {
      continue;
    }
  }

  return result;
}

export function getStorageUsage() {
  let totalBytes = 0;
  let telemetryBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        const bytes = (key.length + value.length) * 2;
        totalBytes += bytes;
        if (key.startsWith(STORAGE_PREFIX)) {
          telemetryBytes += bytes;
        }
      }
    }
  } catch {
    return { totalBytes: 0, telemetryBytes: 0 };
  }

  return { totalBytes, telemetryBytes };
}

export function clearAllTelemetryData() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}
