import { describe, it, expect } from 'vitest';
import {
  TELEMETRY_ALERTS,
  checkWebVitalsAlert,
  checkConversionAlert,
  checkErrorAlert,
  checkAllAlerts,
  getAlertColor,
  getAlertBgColor,
  getAlertBorderColor,
} from '../lib/telemetry-alerts';

describe('telemetry-alerts', () => {
  describe('TELEMETRY_ALERTS', () => {
    it('defines alert categories', () => {
      expect(TELEMETRY_ALERTS.WEB_VITALS).toBeDefined();
      expect(TELEMETRY_ALERTS.CONVERSION).toBeDefined();
      expect(TELEMETRY_ALERTS.ERRORS).toBeDefined();
    });

    it('has severity levels for each alert', () => {
      Object.values(TELEMETRY_ALERTS).forEach((category) => {
        Object.values(category).forEach((alert) => {
          expect(alert.severity).toMatch(/high|medium|low/);
        });
      });
    });
  });

  describe('checkWebVitalsAlert', () => {
    it('detects poor LCP', () => {
      const vitalsSummary = {
        vitals: [
          {
            name: 'LCP',
            rating: 'poor',
            value: 5000,
            formattedValue: '5.00s',
          },
        ],
      };

      const alerts = checkWebVitalsAlert(vitalsSummary);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].metric).toBe('LCP');
      expect(alerts[0].severity).toBe('high');
    });

    it('detects poor CLS', () => {
      const vitalsSummary = {
        vitals: [
          {
            name: 'CLS',
            rating: 'poor',
            value: 0.3,
            formattedValue: '0.300',
          },
        ],
      };

      const alerts = checkWebVitalsAlert(vitalsSummary);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].metric).toBe('CLS');
    });

    it('ignores good vitals', () => {
      const vitalsSummary = {
        vitals: [
          {
            name: 'LCP',
            rating: 'good',
            value: 2000,
            formattedValue: '2.00s',
          },
        ],
      };

      const alerts = checkWebVitalsAlert(vitalsSummary);
      expect(alerts).toHaveLength(0);
    });

    it('returns empty for null input', () => {
      expect(checkWebVitalsAlert(null)).toEqual([]);
    });
  });

  describe('checkConversionAlert', () => {
    it('detects high tip drop-off', () => {
      const summary = {
        tipDropOffRate: '60.0',
      };

      const alerts = checkConversionAlert(summary);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('conversion_tip_drop_off');
    });

    it('detects high batch drop-off', () => {
      const summary = {
        batchDropOffRate: '75.0',
      };

      const alerts = checkConversionAlert(summary);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('conversion_batch_drop_off');
    });

    it('detects low wallet retention', () => {
      const summary = {
        walletRetention: '60.0',
      };

      const alerts = checkConversionAlert(summary);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('conversion_wallet_retention');
    });

    it('ignores healthy conversion metrics', () => {
      const summary = {
        tipDropOffRate: '20.0',
        batchDropOffRate: '15.0',
        walletRetention: '90.0',
      };

      const alerts = checkConversionAlert(summary);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('checkErrorAlert', () => {
    it('detects high error rate', () => {
      const summary = {
        totalErrors: 6,
        totalPageViews: 100,
        sortedErrors: [],
      };

      const alerts = checkErrorAlert(summary);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('errors_rate_high');
    });

    it('detects recurring errors', () => {
      const summary = {
        totalErrors: 15,
        totalPageViews: 1000,
        sortedErrors: [
          ['Component:Error message', 15],
          ['Other:Error', 5],
        ],
      };

      const alerts = checkErrorAlert(summary);
      const recurringAlert = alerts.find((a) => a.id === 'errors_recurring');
      expect(recurringAlert).toBeDefined();
    });

    it('returns empty for healthy error state', () => {
      const summary = {
        totalErrors: 1,
        totalPageViews: 1000,
        sortedErrors: [[{}, 1]],
      };

      const alerts = checkErrorAlert(summary);
      expect(alerts).toEqual([]);
    });
  });

  describe('checkAllAlerts', () => {
    it('combines alerts from all checks', () => {
      const summary = {
        tipDropOffRate: '60.0',
        totalErrors: 6,
        totalPageViews: 100,
        sortedErrors: [],
      };

      const vitalsSummary = {
        vitals: [
          {
            name: 'LCP',
            rating: 'poor',
            value: 5000,
            formattedValue: '5.00s',
          },
        ],
      };

      const alerts = checkAllAlerts(summary, vitalsSummary);
      expect(alerts.length).toBeGreaterThan(2);
    });

    it('sorts alerts by severity (high first)', () => {
      const summary = {
        tipDropOffRate: '60.0',
      };

      const alerts = checkAllAlerts(summary, null);
      if (alerts.length > 0) {
        expect(alerts[0].severity).toBe('high');
      }
    });

    it('returns empty when no alerts', () => {
      const summary = {
        tipDropOffRate: '20.0',
        totalErrors: 1,
        totalPageViews: 1000,
        sortedErrors: [],
      };

      const alerts = checkAllAlerts(summary, null);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('getAlertColor', () => {
    it('returns red for high severity', () => {
      const color = getAlertColor('high');
      expect(color).toContain('red');
    });

    it('returns amber for medium severity', () => {
      const color = getAlertColor('medium');
      expect(color).toContain('amber');
    });

    it('returns blue for low severity', () => {
      const color = getAlertColor('low');
      expect(color).toContain('blue');
    });

    it('returns gray for unknown severity', () => {
      const color = getAlertColor('unknown');
      expect(color).toContain('gray');
    });
  });

  describe('getAlertBgColor', () => {
    it('returns appropriate background colors', () => {
      expect(getAlertBgColor('high')).toContain('red');
      expect(getAlertBgColor('medium')).toContain('amber');
      expect(getAlertBgColor('low')).toContain('blue');
    });
  });

  describe('getAlertBorderColor', () => {
    it('returns appropriate border colors', () => {
      expect(getAlertBorderColor('high')).toContain('red');
      expect(getAlertBorderColor('medium')).toContain('amber');
      expect(getAlertBorderColor('low')).toContain('blue');
    });
  });
});
