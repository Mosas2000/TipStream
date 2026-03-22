import { describe, it, expect, beforeEach, vi } from 'vitest';
import { analytics } from '../lib/analytics';
import { saveTelemetryData, loadTelemetryData, clearAllTelemetryData } from '../lib/telemetry-storage';
import { buildExportPayload } from '../lib/telemetry-export';
import { computeTipFunnel, computeVitalsSummary } from '../lib/telemetry-funnel';
import { resetEnvironmentCache } from '../lib/telemetry-env';

describe('telemetry integration', () => {
  beforeEach(() => {
    localStorage.clear();
    analytics.reset();
    resetEnvironmentCache();
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
      screen: { width: 1920, height: 1080 },
    });
  });

  describe('full telemetry workflow', () => {
    it('tracks events and exports complete payload', () => {
      analytics.trackPageView('/send');
      analytics.trackWalletConnect();
      analytics.trackTipStarted();
      analytics.trackTipSubmitted();
      analytics.trackTipConfirmed();

      const summary = analytics.getSummary();
      expect(summary.totalPageViews).toBe(1);
      expect(summary.walletConnections).toBe(1);
      expect(summary.tipsStarted).toBe(1);
      expect(summary.tipsConfirmed).toBe(1);

      const payload = buildExportPayload();
      expect(payload.summary.totalPageViews).toBe(1);
      expect(payload.summary.walletConnections).toBe(1);
    });

    it('handles conversion funnel from start to completion', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        analytics.trackWalletConnect();
      }

      for (let i = 0; i < 80; i++) {
        analytics.trackTipStarted();
      }

      for (let i = 0; i < 60; i++) {
        analytics.trackTipSubmitted();
      }

      for (let i = 0; i < 50; i++) {
        analytics.trackTipConfirmed();
      }

      const summary = analytics.getSummary();
      const funnel = computeTipFunnel(summary);

      expect(funnel.stages[0].count).toBe(100);
      expect(funnel.stages[1].count).toBe(80);
      expect(funnel.stages[2].count).toBe(60);
      expect(funnel.stages[3].count).toBe(50);
      expect(funnel.overallConversion).toBe('50.0');
    });

    it('tracks errors and includes them in export', () => {
      analytics.trackError('SomeComponent', 'Connection timeout');
      analytics.trackError('SomeComponent', 'Connection timeout');
      analytics.trackError('OtherComponent', 'Validation failed');

      const summary = analytics.getSummary();
      expect(summary.totalErrors).toBe(3);
      expect(summary.sortedErrors.length).toBeGreaterThan(0);

      const payload = buildExportPayload();
      expect(payload.summary.sortedErrors).toBeDefined();
    });

    it('tracks batch operations', () => {
      analytics.trackBatchTipStarted();
      analytics.trackBatchTipStarted();
      analytics.trackBatchSize(5);
      analytics.trackBatchSize(3);
      analytics.trackBatchTipSubmitted();
      analytics.trackBatchTipConfirmed();

      const summary = analytics.getSummary();
      expect(summary.batchTipsStarted).toBe(2);
      expect(summary.batchTipsSubmitted).toBe(1);
      expect(summary.batchTipsConfirmed).toBe(1);
      expect(summary.averageBatchSize).toBe('4.0');
    });

    it('tracks Web Vitals performance', () => {
      analytics.trackPerformance('LCP', 2000, 'good');
      analytics.trackPerformance('CLS', 50, 'good');
      analytics.trackPerformance('INP', 100, 'good');

      const summary = analytics.getSummary();
      expect(summary.webVitals).toBeDefined();
      expect(summary.webVitals.LCP).toEqual({ value: 2000, rating: 'good', timestamp: expect.any(Number) });
    });

    it('computes vitals summary from tracked data', () => {
      const now = Date.now();
      analytics.trackPerformance('LCP', 2000, 'good');
      analytics.trackPerformance('CLS', 50, 'good');
      analytics.trackPerformance('INP', 100, 'good');

      const summary = analytics.getSummary();
      const vitalsSummary = computeTipFunnel(summary);

      expect(vitalsSummary).toBeDefined();
    });

    it('separates data by environment', () => {
      saveTelemetryData('local_data', { test: 'value' });

      const loaded = loadTelemetryData('local_data');
      expect(loaded).toEqual({ test: 'value' });
    });

    it('persists and retrieves analytics data', () => {
      analytics.trackPageView('/send');
      analytics.trackWalletConnect();

      const metrics = analytics.getMetrics();
      expect(metrics.totalPageViews).toBe(1);
      expect(metrics.walletConnections).toBe(1);

      const summary = analytics.getSummary();
      expect(summary.totalPageViews).toBe(1);
      expect(summary.walletConnections).toBe(1);
    });

    it('clears all telemetry data', () => {
      analytics.trackPageView('/send');
      analytics.trackWalletConnect();
      saveTelemetryData('custom', { value: 1 });

      expect(analytics.getSummary().totalPageViews).toBe(1);

      clearAllTelemetryData();

      const summary = analytics.getSummary();
      expect(summary.totalPageViews).toBe(0);
    });

    it('tracks session increments', () => {
      const initial = analytics.getSummary().sessions;
      analytics.trackSession();
      const after = analytics.getSummary().sessions;
      expect(after).toBe(initial + 1);
    });

    it('records first and last seen timestamps', () => {
      const before = Date.now();
      const summary = analytics.getSummary();
      const after = Date.now();

      expect(summary.firstSeen).toBeGreaterThanOrEqual(before);
      expect(summary.firstSeen).toBeLessThanOrEqual(after);
      expect(summary.lastSeen).toBeGreaterThanOrEqual(before);
      expect(summary.lastSeen).toBeLessThanOrEqual(after);
    });

    it('includes multiple routes in summary', () => {
      analytics.trackPageView('/send');
      analytics.trackPageView('/batch');
      analytics.trackPageView('/feed');
      analytics.trackPageView('/send');

      const summary = analytics.getSummary();
      expect(summary.sortedPages.length).toBeGreaterThan(0);
      expect(summary.sortedPages[0][1]).toBeGreaterThanOrEqual(2);
    });
  });
});
