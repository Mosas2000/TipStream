import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatTimeAgo,
  formatNumber,
  formatPercent,
  formatBytes,
  sortByFrequency,
  getTopN,
  calculatePercentChange,
  calculateRate,
  getMetricTrend,
  groupByKey,
  sumByKey,
  averageByKey,
  percentile,
  median,
  range,
} from '../lib/telemetry-format';

describe('telemetry-format', () => {
  describe('formatDate', () => {
    it('formats timestamp to locale string', () => {
      const ts = new Date('2024-01-15T10:30:00Z').getTime();
      const result = formatDate(ts);
      expect(result).toContain('2024');
    });

    it('returns Never for null or undefined', () => {
      expect(formatDate(null)).toBe('Never');
      expect(formatDate(undefined)).toBe('Never');
    });
  });

  describe('formatDateShort', () => {
    it('formats date in short format', () => {
      const ts = new Date('2024-01-15T10:30:00Z').getTime();
      const result = formatDateShort(ts);
      expect(result).toMatch(/\d+\/\d+\/\d+/);
    });

    it('returns -- for null or undefined', () => {
      expect(formatDateShort(null)).toBe('--');
      expect(formatDateShort(undefined)).toBe('--');
    });
  });

  describe('formatTimeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('formats seconds', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      const past = now - 30 * 1000;
      expect(formatTimeAgo(past)).toBe('30s ago');
    });

    it('formats minutes', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      const past = now - 5 * 60 * 1000;
      expect(formatTimeAgo(past)).toBe('5m ago');
    });

    it('formats hours', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      const past = now - 2 * 60 * 60 * 1000;
      expect(formatTimeAgo(past)).toBe('2h ago');
    });
  });

  describe('formatNumber', () => {
    it('formats millions with M suffix', () => {
      expect(formatNumber(1500000)).toBe('1.5M');
    });

    it('formats thousands with K suffix', () => {
      expect(formatNumber(2500)).toBe('2.5K');
    });

    it('leaves small numbers unformatted', () => {
      expect(formatNumber(500)).toBe('500');
    });

    it('handles non-numbers', () => {
      expect(formatNumber('abc')).toBe('abc');
    });
  });

  describe('formatPercent', () => {
    it('formats percentage with default decimals', () => {
      expect(formatPercent(45.6789)).toBe('45.7%');
    });

    it('formats percentage with custom decimals', () => {
      expect(formatPercent(45.6789, 2)).toBe('45.68%');
    });

    it('handles string numbers', () => {
      expect(formatPercent('50.5')).toBe('50.5%');
    });

    it('returns 0% for invalid input', () => {
      expect(formatPercent('abc')).toBe('0%');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes', () => {
      expect(formatBytes(512)).toBe('512 B');
    });

    it('formats kilobytes', () => {
      expect(formatBytes(2048)).toBe('2.0 KB');
    });

    it('formats megabytes', () => {
      expect(formatBytes(1024 * 1024 * 5)).toBe('5.0 MB');
    });

    it('formats gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    });

    it('returns 0 B for invalid input', () => {
      expect(formatBytes(-100)).toBe('0 B');
      expect(formatBytes(null)).toBe('0 B');
    });
  });

  describe('sortByFrequency', () => {
    it('sorts entries by frequency descending', () => {
      const entries = [['a', 3], ['b', 1], ['c', 2]];
      const result = sortByFrequency(entries);
      expect(result).toEqual([['a', 3], ['c', 2], ['b', 1]]);
    });

    it('handles empty array', () => {
      expect(sortByFrequency([])).toEqual([]);
    });

    it('handles non-array input', () => {
      expect(sortByFrequency(null)).toEqual([]);
    });
  });

  describe('getTopN', () => {
    it('returns top N entries', () => {
      const entries = [['a', 10], ['b', 5], ['c', 20], ['d', 1]];
      const result = getTopN(entries, 2);
      expect(result).toEqual([['c', 20], ['a', 10]]);
    });

    it('defaults to top 10', () => {
      const entries = Array.from({ length: 15 }, (_, i) => [`item${i}`, i]);
      const result = getTopN(entries);
      expect(result).toHaveLength(10);
    });
  });

  describe('calculatePercentChange', () => {
    it('calculates positive change', () => {
      expect(calculatePercentChange(150, 100)).toBe(50);
    });

    it('calculates negative change', () => {
      expect(calculatePercentChange(50, 100)).toBe(-50);
    });

    it('returns 100 for change from 0', () => {
      expect(calculatePercentChange(50, 0)).toBe(100);
    });

    it('returns 0 for no change from 0', () => {
      expect(calculatePercentChange(0, 0)).toBe(0);
    });
  });

  describe('calculateRate', () => {
    it('calculates rate percentage', () => {
      expect(calculateRate(50, 100)).toBe(50);
    });

    it('returns 0 for zero denominator', () => {
      expect(calculateRate(50, 0)).toBe(0);
    });

    it('handles 100% rate', () => {
      expect(calculateRate(100, 100)).toBe(100);
    });
  });

  describe('getMetricTrend', () => {
    it('returns up for increase > 10%', () => {
      expect(getMetricTrend(111, 100)).toBe('up');
    });

    it('returns down for decrease > 10%', () => {
      expect(getMetricTrend(89, 100)).toBe('down');
    });

    it('returns stable for small changes', () => {
      expect(getMetricTrend(105, 100)).toBe('stable');
    });
  });

  describe('groupByKey', () => {
    it('groups items by key', () => {
      const items = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 },
      ];
      const result = groupByKey(items, (item) => item.type);
      expect(result.a).toHaveLength(2);
      expect(result.b).toHaveLength(1);
    });
  });

  describe('sumByKey', () => {
    it('sums values by key', () => {
      const items = [
        { type: 'a', value: 10 },
        { type: 'b', value: 20 },
      ];
      const result = sumByKey(items, (item) => item.type, (item) => item.value);
      expect(result).toBe(30);
    });
  });

  describe('averageByKey', () => {
    it('calculates average of values', () => {
      const items = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const result = averageByKey(items, (item) => item.value);
      expect(result).toBe(20);
    });

    it('returns 0 for empty array', () => {
      expect(averageByKey([], (x) => x)).toBe(0);
    });
  });

  describe('percentile', () => {
    it('calculates percentile', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = percentile(values, 90);
      expect(result).toBeGreaterThanOrEqual(9);
    });

    it('returns 0 for empty array', () => {
      expect(percentile([], 50)).toBe(0);
    });
  });

  describe('median', () => {
    it('calculates median', () => {
      const values = [1, 2, 3, 4, 5];
      expect(median(values)).toBe(3);
    });

    it('calculates median of even-length array', () => {
      const values = [1, 2, 3, 4];
      expect(median(values)).toBeGreaterThanOrEqual(2);
      expect(median(values)).toBeLessThanOrEqual(3);
    });
  });

  describe('range', () => {
    it('calculates range', () => {
      const values = [10, 20, 30, 40];
      expect(range(values)).toBe(30);
    });

    it('returns 0 for empty array', () => {
      expect(range([])).toBe(0);
    });
  });
});
