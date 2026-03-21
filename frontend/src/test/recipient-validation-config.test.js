import { describe, it, expect } from 'vitest';
import {
  BLOCK_CHECK_CONFIG,
  RECIPIENT_VALIDATION_CONFIG,
  UI_FEEDBACK_CONFIG,
  ANALYTICS_CONFIG,
  ERROR_RECOVERY_CONFIG,
  isBlockCheckConfigValid,
  isValidationConfigValid,
  getEffectiveTimeout,
  shouldTrackEvent,
} from '../config/recipient-validation';

describe('recipient-validation config', () => {
  describe('block check config', () => {
    it('defines timeout in milliseconds', () => {
      expect(BLOCK_CHECK_CONFIG.TIMEOUT_MS).toBeGreaterThan(0);
    });

    it('defines retry attempts', () => {
      expect(BLOCK_CHECK_CONFIG.RETRY_ATTEMPTS).toBeGreaterThanOrEqual(0);
    });

    it('defines retry delay', () => {
      expect(BLOCK_CHECK_CONFIG.RETRY_DELAY_MS).toBeGreaterThanOrEqual(0);
    });

    it('defines cache TTL', () => {
      expect(BLOCK_CHECK_CONFIG.CACHE_TTL_MS).toBeGreaterThan(0);
    });
  });

  describe('recipient validation config', () => {
    it('defines minimum address length', () => {
      expect(RECIPIENT_VALIDATION_CONFIG.MIN_ADDRESS_LENGTH).toBeGreaterThan(0);
    });

    it('defines maximum address length', () => {
      expect(RECIPIENT_VALIDATION_CONFIG.MAX_ADDRESS_LENGTH).toBeGreaterThan(0);
    });

    it('defines contract separator', () => {
      expect(RECIPIENT_VALIDATION_CONFIG.CONTRACT_SEPARATOR).toBe('.');
    });

    it('defines valid prefixes', () => {
      expect(RECIPIENT_VALIDATION_CONFIG.VALID_PREFIXES).toContain('SP');
      expect(RECIPIENT_VALIDATION_CONFIG.VALID_PREFIXES).toContain('SM');
      expect(RECIPIENT_VALIDATION_CONFIG.VALID_PREFIXES).toContain('ST');
    });
  });

  describe('UI feedback config', () => {
    it('defines error display duration', () => {
      expect(UI_FEEDBACK_CONFIG.ERROR_DISPLAY_DURATION_MS).toBeGreaterThan(0);
    });

    it('defines block check debounce', () => {
      expect(UI_FEEDBACK_CONFIG.BLOCK_CHECK_DEBOUNCE_MS).toBeGreaterThan(0);
    });

    it('defines message max length', () => {
      expect(UI_FEEDBACK_CONFIG.VALIDATION_MESSAGE_MAX_LENGTH).toBeGreaterThan(0);
    });
  });

  describe('analytics config', () => {
    it('defines tracking enabled', () => {
      expect(typeof ANALYTICS_CONFIG.ENABLE_TRACKING).toBe('boolean');
    });

    it('defines track failed checks setting', () => {
      expect(typeof ANALYTICS_CONFIG.TRACK_FAILED_CHECKS).toBe('boolean');
    });

    it('defines sample rate between 0 and 1', () => {
      expect(ANALYTICS_CONFIG.SAMPLE_RATE).toBeGreaterThan(0);
      expect(ANALYTICS_CONFIG.SAMPLE_RATE).toBeLessThanOrEqual(1);
    });

    it('defines batch size', () => {
      expect(ANALYTICS_CONFIG.BATCH_SIZE).toBeGreaterThan(0);
    });

    it('defines flush interval', () => {
      expect(ANALYTICS_CONFIG.FLUSH_INTERVAL_MS).toBeGreaterThan(0);
    });
  });

  describe('error recovery config', () => {
    it('defines allow retry setting', () => {
      expect(typeof ERROR_RECOVERY_CONFIG.ALLOW_RETRY).toBe('boolean');
    });

    it('defines auto retry setting', () => {
      expect(typeof ERROR_RECOVERY_CONFIG.AUTO_RETRY_FAILED_CHECKS).toBe('boolean');
    });

    it('defines show retry button setting', () => {
      expect(typeof ERROR_RECOVERY_CONFIG.SHOW_RETRY_BUTTON).toBe('boolean');
    });

    it('defines retry button delay', () => {
      expect(ERROR_RECOVERY_CONFIG.RETRY_BUTTON_DELAY_MS).toBeGreaterThanOrEqual(0);
    });
  });

  describe('config validation', () => {
    it('validates block check config', () => {
      expect(isBlockCheckConfigValid()).toBe(true);
    });

    it('validates recipient validation config', () => {
      expect(isValidationConfigValid()).toBe(true);
    });

    it('detects invalid block check timeout', () => {
      const originalTimeout = BLOCK_CHECK_CONFIG.TIMEOUT_MS;
      BLOCK_CHECK_CONFIG.TIMEOUT_MS = -1;
      expect(isBlockCheckConfigValid()).toBe(false);
      BLOCK_CHECK_CONFIG.TIMEOUT_MS = originalTimeout;
    });

    it('detects invalid max address length', () => {
      const originalMax = RECIPIENT_VALIDATION_CONFIG.MAX_ADDRESS_LENGTH;
      const originalMin = RECIPIENT_VALIDATION_CONFIG.MIN_ADDRESS_LENGTH;
      RECIPIENT_VALIDATION_CONFIG.MAX_ADDRESS_LENGTH = originalMin - 1;
      expect(isValidationConfigValid()).toBe(false);
      RECIPIENT_VALIDATION_CONFIG.MAX_ADDRESS_LENGTH = originalMax;
    });
  });

  describe('getEffectiveTimeout', () => {
    it('calculates timeout with retry overhead', () => {
      const effective = getEffectiveTimeout();
      const expected =
        BLOCK_CHECK_CONFIG.TIMEOUT_MS +
        BLOCK_CHECK_CONFIG.RETRY_ATTEMPTS * BLOCK_CHECK_CONFIG.RETRY_DELAY_MS;
      expect(effective).toBe(expected);
    });

    it('returns value greater than base timeout', () => {
      const effective = getEffectiveTimeout();
      expect(effective).toBeGreaterThanOrEqual(BLOCK_CHECK_CONFIG.TIMEOUT_MS);
    });
  });

  describe('shouldTrackEvent', () => {
    it('returns false when tracking disabled', () => {
      const originalEnabled = ANALYTICS_CONFIG.ENABLE_TRACKING;
      ANALYTICS_CONFIG.ENABLE_TRACKING = false;
      expect(shouldTrackEvent('TEST')).toBe(false);
      ANALYTICS_CONFIG.ENABLE_TRACKING = originalEnabled;
    });

    it('respects failed check tracking setting', () => {
      const originalTrackFailed = ANALYTICS_CONFIG.TRACK_FAILED_CHECKS;
      const originalEnabled = ANALYTICS_CONFIG.ENABLE_TRACKING;
      const originalSampleRate = ANALYTICS_CONFIG.SAMPLE_RATE;
      
      ANALYTICS_CONFIG.ENABLE_TRACKING = true;
      ANALYTICS_CONFIG.SAMPLE_RATE = 1.0;
      ANALYTICS_CONFIG.TRACK_FAILED_CHECKS = false;
      
      expect(shouldTrackEvent('FAILED_CHECK')).toBe(false);
      
      ANALYTICS_CONFIG.TRACK_FAILED_CHECKS = originalTrackFailed;
      ANALYTICS_CONFIG.ENABLE_TRACKING = originalEnabled;
      ANALYTICS_CONFIG.SAMPLE_RATE = originalSampleRate;
    });

    it('respects sample rate', () => {
      const originalSampleRate = ANALYTICS_CONFIG.SAMPLE_RATE;
      ANALYTICS_CONFIG.SAMPLE_RATE = 0.0;
      expect(shouldTrackEvent('TEST')).toBe(false);
      ANALYTICS_CONFIG.SAMPLE_RATE = originalSampleRate;
    });
  });
});
