export const TELEMETRY_ALERTS = {
  WEB_VITALS: {
    LCP_POOR: {
      name: 'LCP exceeds poor threshold',
      severity: 'high',
      threshold: 4000,
      metric: 'LCP',
    },
    CLS_POOR: {
      name: 'CLS exceeds poor threshold',
      severity: 'high',
      threshold: 0.25,
      metric: 'CLS',
    },
    INP_POOR: {
      name: 'INP exceeds poor threshold',
      severity: 'high',
      threshold: 500,
      metric: 'INP',
    },
  },
  CONVERSION: {
    TIP_DROP_OFF_HIGH: {
      name: 'Tip conversion drop-off exceeds 50%',
      severity: 'high',
      threshold: 50,
    },
    BATCH_DROP_OFF_HIGH: {
      name: 'Batch conversion drop-off exceeds 50%',
      severity: 'high',
      threshold: 50,
    },
    WALLET_RETENTION_LOW: {
      name: 'Wallet retention below 70%',
      severity: 'medium',
      threshold: 70,
    },
  },
  ERRORS: {
    ERROR_RATE_HIGH: {
      name: 'Error rate exceeds 5%',
      severity: 'medium',
      threshold: 5,
    },
    RECURRING_ERROR: {
      name: 'Same error repeated 10+ times',
      severity: 'medium',
      threshold: 10,
    },
  },
};

export function checkWebVitalsAlert(vitalsSummary) {
  const alerts = [];

  if (!vitalsSummary || !vitalsSummary.vitals) {
    return alerts;
  }

  for (const vital of vitalsSummary.vitals) {
    if (vital.rating === 'poor') {
      const metric = vital.name;
      const alertDef = TELEMETRY_ALERTS.WEB_VITALS[`${metric}_POOR`];

      if (alertDef) {
        alerts.push({
          id: `vital_${metric}`,
          ...alertDef,
          value: vital.value,
          formattedValue: vital.formattedValue,
        });
      }
    }
  }

  return alerts;
}

export function checkConversionAlert(summary) {
  const alerts = [];

  if (!summary) {
    return alerts;
  }

  const tipDropOff = parseFloat(summary.tipDropOffRate || 0);
  if (tipDropOff > TELEMETRY_ALERTS.CONVERSION.TIP_DROP_OFF_HIGH.threshold) {
    alerts.push({
      id: 'conversion_tip_drop_off',
      ...TELEMETRY_ALERTS.CONVERSION.TIP_DROP_OFF_HIGH,
      value: tipDropOff,
    });
  }

  const batchDropOff = parseFloat(summary.batchDropOffRate || 0);
  if (batchDropOff > TELEMETRY_ALERTS.CONVERSION.BATCH_DROP_OFF_HIGH.threshold) {
    alerts.push({
      id: 'conversion_batch_drop_off',
      ...TELEMETRY_ALERTS.CONVERSION.BATCH_DROP_OFF_HIGH,
      value: batchDropOff,
    });
  }

  const walletRetention = parseFloat(summary.walletRetention || 100);
  if (walletRetention < TELEMETRY_ALERTS.CONVERSION.WALLET_RETENTION_LOW.threshold) {
    alerts.push({
      id: 'conversion_wallet_retention',
      ...TELEMETRY_ALERTS.CONVERSION.WALLET_RETENTION_LOW,
      value: walletRetention,
    });
  }

  return alerts;
}

export function checkErrorAlert(summary) {
  const alerts = [];

  if (!summary) {
    return alerts;
  }

  const totalErrors = summary.totalErrors || 0;
  const totalPageViews = summary.totalPageViews || 0;

  if (totalPageViews > 0) {
    const errorRate = (totalErrors / totalPageViews) * 100;
    if (errorRate > TELEMETRY_ALERTS.ERRORS.ERROR_RATE_HIGH.threshold) {
      alerts.push({
        id: 'errors_rate_high',
        ...TELEMETRY_ALERTS.ERRORS.ERROR_RATE_HIGH,
        value: errorRate,
      });
    }
  }

  if (summary.sortedErrors && summary.sortedErrors.length > 0) {
    const topError = summary.sortedErrors[0];
    const topErrorCount = topError[1];

    if (topErrorCount > TELEMETRY_ALERTS.ERRORS.RECURRING_ERROR.threshold) {
      alerts.push({
        id: 'errors_recurring',
        ...TELEMETRY_ALERTS.ERRORS.RECURRING_ERROR,
        value: topErrorCount,
        error: topError[0],
      });
    }
  }

  return alerts;
}

export function checkAllAlerts(summary, vitalsSummary) {
  const alerts = [];

  if (vitalsSummary) {
    alerts.push(...checkWebVitalsAlert(vitalsSummary));
  }

  if (summary) {
    alerts.push(...checkConversionAlert(summary));
    alerts.push(...checkErrorAlert(summary));
  }

  return alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function getAlertColor(severity) {
  switch (severity) {
    case 'high':
      return 'text-red-600 dark:text-red-400';
    case 'medium':
      return 'text-amber-600 dark:text-amber-400';
    case 'low':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

export function getAlertBgColor(severity) {
  switch (severity) {
    case 'high':
      return 'bg-red-50 dark:bg-red-900/20';
    case 'medium':
      return 'bg-amber-50 dark:bg-amber-900/20';
    case 'low':
      return 'bg-blue-50 dark:bg-blue-900/20';
    default:
      return 'bg-gray-50 dark:bg-gray-800';
  }
}

export function getAlertBorderColor(severity) {
  switch (severity) {
    case 'high':
      return 'border-red-200 dark:border-red-800';
    case 'medium':
      return 'border-amber-200 dark:border-amber-800';
    case 'low':
      return 'border-blue-200 dark:border-blue-800';
    default:
      return 'border-gray-200 dark:border-gray-700';
  }
}
