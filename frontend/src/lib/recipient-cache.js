export const RECIPIENT_CACHE = new Map();

export function setCacheEntry(recipient, data, ttlMs = 60000) {
  RECIPIENT_CACHE.set(recipient, {
    data,
    timestamp: Date.now(),
    ttlMs,
  });
}

export function getCacheEntry(recipient) {
  const entry = RECIPIENT_CACHE.get(recipient);
  
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > entry.ttlMs) {
    RECIPIENT_CACHE.delete(recipient);
    return null;
  }
  
  return entry.data;
}

export function isCacheValid(recipient) {
  return getCacheEntry(recipient) !== null;
}

export function clearCache() {
  RECIPIENT_CACHE.clear();
}

export function clearExpiredEntries() {
  const now = Date.now();
  
  for (const [key, entry] of RECIPIENT_CACHE.entries()) {
    const age = now - entry.timestamp;
    if (age > entry.ttlMs) {
      RECIPIENT_CACHE.delete(key);
    }
  }
}

export function getCacheStats() {
  return {
    size: RECIPIENT_CACHE.size,
    entries: Array.from(RECIPIENT_CACHE.entries()).map(([recipient, entry]) => ({
      recipient: recipient.slice(0, 8) + '...' + recipient.slice(-4),
      ageMs: Date.now() - entry.timestamp,
      ttlMs: entry.ttlMs,
    })),
  };
}

export function getCacheHitRate() {
  if (!RECIPIENT_CACHE.size) return 0;
  
  const validEntries = Array.from(RECIPIENT_CACHE.values()).filter(entry => {
    const age = Date.now() - entry.timestamp;
    return age <= entry.ttlMs;
  });
  
  return validEntries.length / RECIPIENT_CACHE.size;
}

export function optimizeCache() {
  clearExpiredEntries();
  
  if (RECIPIENT_CACHE.size > 100) {
    const entries = Array.from(RECIPIENT_CACHE.entries());
    const sorted = entries.sort((a, b) => {
      const ageA = Date.now() - a[1].timestamp;
      const ageB = Date.now() - b[1].timestamp;
      return ageB - ageA;
    });
    
    const toDelete = sorted.slice(100);
    toDelete.forEach(([key]) => RECIPIENT_CACHE.delete(key));
  }
}
