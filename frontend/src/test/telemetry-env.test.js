import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TelemetryEnvironment,
  getEnvironment,
  isProduction,
  isLocal,
  isDevelopment,
  getEnvironmentLabel,
  getEnvironmentColor,
  resetEnvironmentCache,
} from '../lib/telemetry-env';

describe('telemetry-env', () => {
  beforeEach(() => {
    resetEnvironmentCache();
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
    });
  });

  describe('getEnvironment', () => {
    it('returns LOCAL for localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      });
      resetEnvironmentCache();
      expect(getEnvironment()).toBe(TelemetryEnvironment.LOCAL);
    });

    it('returns LOCAL for 127.0.0.1', () => {
      vi.stubGlobal('window', {
        location: { hostname: '127.0.0.1' },
      });
      resetEnvironmentCache();
      expect(getEnvironment()).toBe(TelemetryEnvironment.LOCAL);
    });

    it('returns STAGING for staging subdomain', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'staging.tipstream.app' },
      });
      resetEnvironmentCache();
      expect(getEnvironment()).toBe(TelemetryEnvironment.STAGING);
    });

    it('returns STAGING for preview subdomain', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'preview.tipstream.app' },
      });
      resetEnvironmentCache();
      expect(getEnvironment()).toBe(TelemetryEnvironment.STAGING);
    });

    it('caches the environment value', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      });
      resetEnvironmentCache();
      const first = getEnvironment();
      vi.stubGlobal('window', {
        location: { hostname: 'production.com' },
      });
      const second = getEnvironment();
      expect(first).toBe(second);
    });
  });

  describe('isProduction', () => {
    it('returns false for localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      });
      resetEnvironmentCache();
      expect(isProduction()).toBe(false);
    });
  });

  describe('isLocal', () => {
    it('returns true for localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      });
      resetEnvironmentCache();
      expect(isLocal()).toBe(true);
    });

    it('returns false for staging', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'staging.tipstream.app' },
      });
      resetEnvironmentCache();
      expect(isLocal()).toBe(false);
    });
  });

  describe('isDevelopment', () => {
    it('returns true for localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      });
      resetEnvironmentCache();
      expect(isDevelopment()).toBe(true);
    });
  });

  describe('getEnvironmentLabel', () => {
    it('returns Local for localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      });
      resetEnvironmentCache();
      expect(getEnvironmentLabel()).toBe('Local');
    });

    it('returns Staging for staging hostname', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'staging.tipstream.app' },
      });
      resetEnvironmentCache();
      expect(getEnvironmentLabel()).toBe('Staging');
    });
  });

  describe('getEnvironmentColor', () => {
    it('returns gray for local', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      });
      resetEnvironmentCache();
      expect(getEnvironmentColor()).toBe('gray');
    });

    it('returns amber for staging', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'staging.tipstream.app' },
      });
      resetEnvironmentCache();
      expect(getEnvironmentColor()).toBe('amber');
    });
  });
});
