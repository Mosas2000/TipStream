export function getNotificationStorageKey(address, network) {
  if (!address || !network) {
    return null;
  }
  
  if (typeof address !== 'string' || typeof network !== 'string') {
    return null;
  }
  
  return `tipstream_last_seen_${network}_${address}`;
}

export function getAllScopedNotificationKeys() {
  const keys = [];
  const legacyKeyPrefix = 'tipstream_last_seen_tip_ts';
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('tipstream_last_seen_') && key !== legacyKeyPrefix) {
      keys.push(key);
    }
  }
  return keys;
}

export function clearAllNotificationState() {
  const keys = getAllScopedNotificationKeys();
  keys.forEach(key => {
    localStorage.removeItem(key);
  });
}

export function getNotificationStateForAddress(address) {
  const states = {};
  const keys = getAllScopedNotificationKeys();
  
  keys.forEach(key => {
    if (key.includes(`_${address}`)) {
      const value = localStorage.getItem(key);
      states[key] = value ? parseInt(value, 10) : 0;
    }
  });
  
  return states;
}

export function migrateLegacyNotificationState(address, network) {
  const legacyKey = 'tipstream_last_seen_tip_ts';
  const legacyValue = localStorage.getItem(legacyKey);
  
  if (!legacyValue || !address || !network) {
    return null;
  }
  
  const newKey = getNotificationStorageKey(address, network);
  const existingValue = localStorage.getItem(newKey);
  
  if (!existingValue) {
    localStorage.setItem(newKey, legacyValue);
    return parseInt(legacyValue, 10);
  }
  
  return null;
}

export function getLastSeenTimestamp(address, network) {
  const key = getNotificationStorageKey(address, network);
  if (!key) {
    return 0;
  }
  
  try {
    const value = localStorage.getItem(key);
    if (!value) {
      return 0;
    }
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    console.error('Error reading notification timestamp:', error);
    return 0;
  }
}

export function setLastSeenTimestamp(address, network, timestamp) {
  const key = getNotificationStorageKey(address, network);
  if (!key) {
    return;
  }
  
  if (typeof timestamp !== 'number' || timestamp < 0) {
    console.warn('Invalid timestamp for notification storage:', timestamp);
    return;
  }
  
  localStorage.setItem(key, String(timestamp));
}
