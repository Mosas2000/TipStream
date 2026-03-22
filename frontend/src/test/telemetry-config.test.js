import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeTelemetrySink,
  getTelemetryConfig,
  TELEMETRY_CONFIG,
} from '../config/telemetry';
import { resetSink, isSinkEnabled } from '../lib/telemetry-sink';

describe('telemetry config', () => {
  beforeEach(() => {
    resetSink();
  });

  describe('TELEMETRY_CONFIG', () => {
    it('has default configuration structure', () => {
      expect(TELEMETRY_CONFIG.sinkEndpoint).toBeDefined();
      expect(TELEMETRY_CONFIG.sinkApiKey).toBeDefined();
      expect(TELEMETRY_CONFIG.sinkEnabled).toBeDefined();
      expect(TELEMETRY_CONFIG.batchSize).toBeDefined();
      expect(TELEMETRY_CONFIG.flushIntervalMs).toBeDefined();
      expect(TELEMETRY_CONFIG.retryAttempts).toBeDefined();
      expect(TELEMETRY_CONFIG.retryDelayMs).toBeDefined();
    });

    it('reads from environment variables', () => {
      expect(TELEMETRY_CONFIG.sinkEnabled).toBe(false);
    });
  });

  describe('getTelemetryConfig', () => {
    it('returns configuration with production flag', () => {
      const config = getTelemetryConfig();
      expect(config).toHaveProperty('isProduction');
      expect(typeof config.isProduction).toBe('boolean');
    });

    it('includes sink endpoint in returned config', () => {
      const config = getTelemetryConfig();
      expect(config).toHaveProperty('sinkEndpoint');
    });

    it('includes all batch configuration settings', () => {
      const config = getTelemetryConfig();
      expect(config.batchSize).toBeGreaterThan(0);
      expect(config.flushIntervalMs).toBeGreaterThan(0);
      expect(config.retryAttempts).toBeGreaterThan(0);
    });
  });

  describe('initializeTelemetrySink', () => {
    it('returns false when sink not enabled', () => {
      const result = initializeTelemetrySink();
      expect(result).toBe(false);
    });

    it('does not enable sink without endpoint', () => {
      initializeTelemetrySink();
      expect(isSinkEnabled()).toBe(false);
    });
  });
});
