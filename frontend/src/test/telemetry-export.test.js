import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildExportPayload, exportToJson } from '../lib/telemetry-export';
import { analytics } from '../lib/analytics';
import { resetEnvironmentCache } from '../lib/telemetry-env';

describe('telemetry-export', () => {
  beforeEach(() => {
    localStorage.clear();
    resetEnvironmentCache();
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
      screen: { width: 1920, height: 1080 },
    });
  });

  describe('buildExportPayload', () => {
    it('includes version field', () => {
      const payload = buildExportPayload();
      expect(payload.version).toBeDefined();
      expect(payload.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('includes exportedAt timestamp', () => {
      const payload = buildExportPayload();
      expect(payload.exportedAt).toBeDefined();
      expect(new Date(payload.exportedAt).getTime()).toBeGreaterThan(0);
    });

    it('includes environment info', () => {
      const payload = buildExportPayload();
      expect(payload.environment).toBe('local');
      expect(payload.environmentLabel).toBe('Local');
    });

    it('includes screen resolution', () => {
      const payload = buildExportPayload();
      expect(payload.screenResolution).toEqual({ width: 1920, height: 1080 });
    });

    it('includes storage usage', () => {
      const payload = buildExportPayload();
      expect(payload.storageUsage).toBeDefined();
      expect(typeof payload.storageUsage.totalBytes).toBe('number');
      expect(typeof payload.storageUsage.telemetryBytes).toBe('number');
    });

    it('includes summary from analytics', () => {
      analytics.trackPageView('/test');
      const payload = buildExportPayload();
      expect(payload.summary).toBeDefined();
      expect(payload.summary.totalPageViews).toBeGreaterThan(0);
    });

    it('includes rawMetrics from analytics', () => {
      const payload = buildExportPayload();
      expect(payload.rawMetrics).toBeDefined();
    });

    it('includes allEnvironments when requested', () => {
      const payload = buildExportPayload({ includeAllEnvironments: true });
      expect(payload.allEnvironments).toBeDefined();
      expect(typeof payload.allEnvironments).toBe('object');
    });

    it('excludes allEnvironments by default', () => {
      const payload = buildExportPayload();
      expect(payload.allEnvironments).toBeUndefined();
    });
  });

  describe('exportToJson', () => {
    it('returns valid JSON string', () => {
      const json = exportToJson();
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('produces formatted JSON with indentation', () => {
      const json = exportToJson();
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('can be parsed back to the original payload', () => {
      const json = exportToJson();
      const parsed = JSON.parse(json);
      expect(parsed.version).toBeDefined();
      expect(parsed.environment).toBe('local');
    });
  });
});
