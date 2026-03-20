export function getNotificationStorageKey(address, network) {
  if (!address || !network) {
    return null;
  }
  return `tipstream_last_seen_${network}_${address}`;
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
  
  const value = localStorage.getItem(key);
  return value ? parseInt(value, 10) : 0;
}

export function setLastSeenTimestamp(address, network, timestamp) {
  const key = getNotificationStorageKey(address, network);
  if (!key) {
    return;
  }
  
  localStorage.setItem(key, String(timestamp));
}
