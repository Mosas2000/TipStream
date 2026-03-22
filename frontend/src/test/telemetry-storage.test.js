import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadTelemetryData,
  saveTelemetryData,
  clearTelemetryData,
  appendToHistory,
  getHistoryWindow,
  getStorageUsage,
  clearAllTelemetryData,
} from '../lib/telemetry-storage';
import { resetEnvironmentCache } from '../lib/telemetry-env';

describe('telemetry-storage', () => {
  beforeEach(() => {
    localStorage.clear();
    resetEnvironmentCache();
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
    });
  });

  describe('saveTelemetryData and loadTelemetryData', () => {
    it('saves and loads data correctly', () => {
      const testData = { count: 42, name: 'test' };
      saveTelemetryData('testKey', testData);
      const loaded = loadTelemetryData('testKey');
      expect(loaded).toEqual(testData);
    });

    it('returns null for non-existent key', () => {
      const result = loadTelemetryData('nonexistent');
      expect(result).toBeNull();
    });

    it('handles invalid JSON gracefully', () => {
      localStorage.setItem('tipstream_telemetry_local_badkey', 'not valid json');
      const result = loadTelemetryData('badkey');
      expect(result).toBeNull();
    });
  });

  describe('clearTelemetryData', () => {
    it('removes data for a key', () => {
      saveTelemetryData('toRemove', { value: 1 });
      clearTelemetryData('toRemove');
      const result = loadTelemetryData('toRemove');
      expect(result).toBeNull();
    });
  });

  describe('appendToHistory', () => {
    it('creates new history array if none exists', () => {
      const entry = { event: 'test' };
      const result = appendToHistory('history', entry);
      expect(result).toHaveLength(1);
      expect(result[0].event).toBe('test');
      expect(result[0].timestamp).toBeDefined();
    });

    it('appends to existing history', () => {
      appendToHistory('history', { event: 'first' });
      appendToHistory('history', { event: 'second' });
      const result = loadTelemetryData('history');
      expect(result).toHaveLength(2);
      expect(result[0].event).toBe('first');
      expect(result[1].event).toBe('second');
    });

    it('limits history to max entries', () => {
      for (let i = 0; i < 110; i++) {
        appendToHistory('limitedHistory', { index: i });
      }
      const result = loadTelemetryData('limitedHistory');
      expect(result.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getHistoryWindow', () => {
    it('returns entries within time window', () => {
      const now = Date.now();
      saveTelemetryData('windowTest', [
        { timestamp: now - 60000, event: 'old' },
        { timestamp: now - 30000, event: 'recent' },
        { timestamp: now - 5000, event: 'newest' },
      ]);

      const result = getHistoryWindow('windowTest', 45000);
      expect(result).toHaveLength(2);
      expect(result[0].event).toBe('recent');
      expect(result[1].event).toBe('newest');
    });

    it('returns empty array for non-existent key', () => {
      const result = getHistoryWindow('nonexistent', 60000);
      expect(result).toEqual([]);
    });
  });

  describe('getStorageUsage', () => {
    it('returns storage usage stats', () => {
      saveTelemetryData('usage1', { data: 'test' });
      saveTelemetryData('usage2', { data: 'more test' });

      const usage = getStorageUsage();
      expect(usage.totalBytes).toBeGreaterThan(0);
      expect(usage.telemetryBytes).toBeGreaterThan(0);
    });

    it('counts only telemetry keys for telemetryBytes', () => {
      localStorage.setItem('other_key', 'not telemetry');
      saveTelemetryData('telemetryKey', { data: 'telemetry' });

      const usage = getStorageUsage();
      expect(usage.totalBytes).toBeGreaterThan(usage.telemetryBytes);
    });
  });

  describe('clearAllTelemetryData', () => {
    it('removes all telemetry data', () => {
      saveTelemetryData('key1', { data: 1 });
      saveTelemetryData('key2', { data: 2 });
      localStorage.setItem('other_key', 'keep this');

      const result = clearAllTelemetryData();
      expect(result).toBe(true);
      expect(loadTelemetryData('key1')).toBeNull();
      expect(loadTelemetryData('key2')).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('keep this');
    });
  });
});
