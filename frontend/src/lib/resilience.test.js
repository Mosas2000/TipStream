import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setDebugMode,
  setOperationLogging,
  logResilienceEvent,
  logCacheOperation,
  getDiagnosticReport,
  printDiagnostics,
  exportDiagnostics,
} from './resilience';
import * as persistentCache from './persistentCache';

describe('Resilience Monitoring Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setDebugMode(false);
    setOperationLogging(false);
  });

  describe('Debug mode', () => {
    it('enables and disables debug logging', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      setDebugMode(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockClear();
      setDebugMode(false);
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Operation logging', () => {
    it('enables and disables operation logging', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      setOperationLogging(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('logs cache operations when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      setOperationLogging(true);

      logCacheOperation('hit', 'test_key');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache:hit')
      );

      consoleSpy.mockRestore();
    });

    it('skips logging when disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      setOperationLogging(false);

      logCacheOperation('hit', 'test_key');
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Event logging', () => {
    it('logs resilience events when debug enabled', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      setDebugMode(true);

      logResilienceEvent('cache', 'info', 'Test message', { data: 'test' });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Resilience:cache:INFO'),
        expect.objectContaining({ data: 'test' })
      );

      consoleSpy.mockRestore();
    });

    it('uses correct log levels', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const errorSpy = vi.spyOn(console, 'error');
      setDebugMode(true);

      logResilienceEvent('api', 'warn', 'Warning message');
      expect(warnSpy).toHaveBeenCalled();

      logResilienceEvent('api', 'error', 'Error message');
      expect(errorSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('getDiagnosticReport', () => {
    it('includes cache statistics', () => {
      persistentCache.setCacheEntry('test', { data: 'value' });

      const report = getDiagnosticReport();
      expect(report.cache).toBeDefined();
      expect(report.cache.entries).toBeGreaterThan(0);
      expect(report.cache.sizeBytes).toBeGreaterThan(0);
    });

    it('includes timestamp', () => {
      const report = getDiagnosticReport();
      expect(report.timestamp).toBeDefined();
      expect(new Date(report.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('includes navigator info', () => {
      const report = getDiagnosticReport();
      expect(report.navigator).toBeDefined();
      expect(report.navigator.onLine).toBeDefined();
    });

    it('includes storage info', () => {
      const report = getDiagnosticReport();
      expect(report.storage).toBeDefined();
      expect(report.storage.localStorage).toBeDefined();
    });

    it('warns when storage quota high', () => {
      const largeData = { array: Array(100000).fill('x') };
      persistentCache.setCacheEntry('large', largeData);

      const report = getDiagnosticReport();
      expect(report.cache.quota).toBeDefined();
      expect(report.cache.quota.usagePercent).toBeDefined();
    });
  });

  describe('printDiagnostics', () => {
    it('prints diagnostic report', () => {
      const groupSpy = vi.spyOn(console, 'group');
      const logSpy = vi.spyOn(console, 'log');
      const groupEndSpy = vi.spyOn(console, 'groupEnd');

      printDiagnostics();

      expect(groupSpy).toHaveBeenCalledWith('[Resilience Diagnostics]');
      expect(logSpy).toHaveBeenCalled();
      expect(groupEndSpy).toHaveBeenCalled();

      groupSpy.mockRestore();
      logSpy.mockRestore();
      groupEndSpy.mockRestore();
    });
  });

  describe('exportDiagnostics', () => {
    it('exports as valid JSON', () => {
      persistentCache.setCacheEntry('test', { data: 'value' });

      const json = exportDiagnostics();
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed.cache).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
    });

    it('includes all report fields', () => {
      const json = exportDiagnostics();
      const parsed = JSON.parse(json);

      expect(parsed.timestamp).toBeDefined();
      expect(parsed.cache).toBeDefined();
      expect(parsed.navigator).toBeDefined();
      expect(parsed.storage).toBeDefined();
    });
  });
});
