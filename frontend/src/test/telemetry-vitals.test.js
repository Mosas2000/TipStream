import { describe, it, expect } from 'vitest';
import {
  VITAL_THRESHOLDS,
  VITAL_ORDER,
  formatVitalValue,
  getVitalRating,
  getVitalRatingColor,
  computeVitalsSummary,
  getVitalDescription,
  getOverallScoreLabel,
  getOverallScoreColor,
} from '../lib/telemetry-vitals';

describe('telemetry-vitals', () => {
  describe('VITAL_THRESHOLDS', () => {
    it('defines thresholds for all core vitals', () => {
      expect(VITAL_THRESHOLDS.LCP).toBeDefined();
      expect(VITAL_THRESHOLDS.CLS).toBeDefined();
      expect(VITAL_THRESHOLDS.INP).toBeDefined();
      expect(VITAL_THRESHOLDS.FCP).toBeDefined();
      expect(VITAL_THRESHOLDS.TTFB).toBeDefined();
    });

    it('has correct structure for each threshold', () => {
      for (const [, threshold] of Object.entries(VITAL_THRESHOLDS)) {
        expect(threshold.good).toBeDefined();
        expect(threshold.needsImprovement).toBeDefined();
        expect(threshold.label).toBeDefined();
        expect(threshold.good).toBeLessThan(threshold.needsImprovement);
      }
    });
  });

  describe('VITAL_ORDER', () => {
    it('contains all core vitals', () => {
      expect(VITAL_ORDER).toContain('LCP');
      expect(VITAL_ORDER).toContain('CLS');
      expect(VITAL_ORDER).toContain('INP');
      expect(VITAL_ORDER).toContain('FCP');
      expect(VITAL_ORDER).toContain('TTFB');
    });
  });

  describe('formatVitalValue', () => {
    it('formats CLS as decimal', () => {
      expect(formatVitalValue('CLS', 100)).toBe('0.100');
      expect(formatVitalValue('CLS', 50)).toBe('0.050');
    });

    it('formats LCP in milliseconds', () => {
      expect(formatVitalValue('LCP', 500)).toBe('500ms');
    });

    it('formats LCP in seconds when >= 1000', () => {
      expect(formatVitalValue('LCP', 2500)).toBe('2.50s');
    });

    it('handles unknown vitals', () => {
      expect(formatVitalValue('UNKNOWN', 100)).toBe('100');
    });
  });

  describe('getVitalRating', () => {
    it('returns good for values at or below good threshold', () => {
      expect(getVitalRating('LCP', 2500)).toBe('good');
      expect(getVitalRating('LCP', 2000)).toBe('good');
    });

    it('returns needs-improvement for values between thresholds', () => {
      expect(getVitalRating('LCP', 3000)).toBe('needs-improvement');
    });

    it('returns poor for values above poor threshold', () => {
      expect(getVitalRating('LCP', 5000)).toBe('poor');
    });

    it('handles CLS correctly', () => {
      expect(getVitalRating('CLS', 50)).toBe('good');
      expect(getVitalRating('CLS', 150)).toBe('needs-improvement');
      expect(getVitalRating('CLS', 300)).toBe('poor');
    });

    it('returns unknown for undefined vital', () => {
      expect(getVitalRating('UNKNOWN', 100)).toBe('unknown');
    });
  });

  describe('getVitalRatingColor', () => {
    it('returns green colors for good rating', () => {
      const colors = getVitalRatingColor('good');
      expect(colors.bg).toContain('green');
      expect(colors.text).toContain('green');
    });

    it('returns amber colors for needs-improvement rating', () => {
      const colors = getVitalRatingColor('needs-improvement');
      expect(colors.bg).toContain('amber');
      expect(colors.text).toContain('amber');
    });

    it('returns red colors for poor rating', () => {
      const colors = getVitalRatingColor('poor');
      expect(colors.bg).toContain('red');
      expect(colors.text).toContain('red');
    });

    it('returns gray colors for unknown rating', () => {
      const colors = getVitalRatingColor('unknown');
      expect(colors.bg).toContain('gray');
      expect(colors.text).toContain('gray');
    });
  });

  describe('computeVitalsSummary', () => {
    it('returns empty state for no data', () => {
      const result = computeVitalsSummary({});
      expect(result.vitals).toEqual([]);
      expect(result.overallScore).toBeNull();
      expect(result.coreVitalsPassing).toBe(false);
      expect(result.lastUpdated).toBeNull();
    });

    it('computes vitals from web vitals data', () => {
      const webVitals = {
        LCP: { value: 2000, timestamp: Date.now() },
        CLS: { value: 50, timestamp: Date.now() },
        INP: { value: 100, timestamp: Date.now() },
      };
      const result = computeVitalsSummary(webVitals);
      expect(result.vitals).toHaveLength(3);
      expect(result.vitals[0].name).toBe('LCP');
    });

    it('computes overall score from core vitals', () => {
      const webVitals = {
        LCP: { value: 2000, timestamp: Date.now() },
        CLS: { value: 50, timestamp: Date.now() },
        INP: { value: 100, timestamp: Date.now() },
      };
      const result = computeVitalsSummary(webVitals);
      expect(result.overallScore).toBe(100);
      expect(result.coreVitalsPassing).toBe(true);
    });

    it('sets coreVitalsPassing to false when any core vital fails', () => {
      const webVitals = {
        LCP: { value: 5000, timestamp: Date.now() },
        CLS: { value: 50, timestamp: Date.now() },
        INP: { value: 100, timestamp: Date.now() },
      };
      const result = computeVitalsSummary(webVitals);
      expect(result.coreVitalsPassing).toBe(false);
    });

    it('includes lastUpdated from most recent timestamp', () => {
      const now = Date.now();
      const webVitals = {
        LCP: { value: 2000, timestamp: now - 1000 },
        CLS: { value: 50, timestamp: now },
      };
      const result = computeVitalsSummary(webVitals);
      expect(result.lastUpdated).toBe(now);
    });
  });

  describe('getVitalDescription', () => {
    it('returns description for LCP', () => {
      const desc = getVitalDescription('LCP');
      expect(desc).toContain('loading');
    });

    it('returns description for CLS', () => {
      const desc = getVitalDescription('CLS');
      expect(desc).toContain('visual stability');
    });

    it('returns empty string for unknown vital', () => {
      expect(getVitalDescription('UNKNOWN')).toBe('');
    });
  });

  describe('getOverallScoreLabel', () => {
    it('returns No Data for null score', () => {
      expect(getOverallScoreLabel(null)).toBe('No Data');
    });

    it('returns Excellent for score >= 90', () => {
      expect(getOverallScoreLabel(90)).toBe('Excellent');
      expect(getOverallScoreLabel(100)).toBe('Excellent');
    });

    it('returns Good for score >= 75', () => {
      expect(getOverallScoreLabel(75)).toBe('Good');
      expect(getOverallScoreLabel(89)).toBe('Good');
    });

    it('returns Needs Work for score >= 50', () => {
      expect(getOverallScoreLabel(50)).toBe('Needs Work');
    });

    it('returns Poor for score < 50', () => {
      expect(getOverallScoreLabel(49)).toBe('Poor');
      expect(getOverallScoreLabel(0)).toBe('Poor');
    });
  });

  describe('getOverallScoreColor', () => {
    it('returns appropriate colors for each score range', () => {
      const nullColor = getOverallScoreColor(null);
      expect(nullColor.bg).toContain('gray');

      const excellentColor = getOverallScoreColor(95);
      expect(excellentColor.bg).toContain('green');

      const needsWorkColor = getOverallScoreColor(60);
      expect(needsWorkColor.bg).toContain('amber');

      const poorColor = getOverallScoreColor(30);
      expect(poorColor.bg).toContain('red');
    });
  });
});
