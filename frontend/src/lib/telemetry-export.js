import { analytics } from './analytics';
import { getEnvironment, getEnvironmentLabel } from './telemetry-env';
import { getAllEnvironmentData, getStorageUsage } from './telemetry-storage';

const EXPORT_VERSION = '1.0.0';

function generateExportFilename() {
  const env = getEnvironment();
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toISOString().split('T')[1].slice(0, 5).replace(':', '-');
  return `tipstream-telemetry-${env}-${date}-${time}.json`;
}

export function buildExportPayload(options = {}) {
  const { includeAllEnvironments = false } = options;

  const summary = analytics.getSummary();
  const rawMetrics = analytics.getMetrics();
  const storageUsage = getStorageUsage();

  const payload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    environment: getEnvironment(),
    environmentLabel: getEnvironmentLabel(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    screenResolution: typeof window !== 'undefined'
      ? { width: window.screen.width, height: window.screen.height }
      : null,
    storageUsage,
    summary,
    rawMetrics,
  };

  if (includeAllEnvironments) {
    payload.allEnvironments = getAllEnvironmentData();
  }

  return payload;
}

export function exportToJson(options = {}) {
  const payload = buildExportPayload(options);
  return JSON.stringify(payload, null, 2);
}

export function downloadExport(options = {}) {
  const json = exportToJson(options);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = generateExportFilename();

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

export function exportToCsv() {
  const summary = analytics.getSummary();

  const rows = [
    ['Metric', 'Value'],
    ['Total Page Views', summary.totalPageViews],
    ['Wallet Connections', summary.walletConnections],
    ['Tips Started', summary.tipsStarted],
    ['Tips Submitted', summary.tipsSubmitted],
    ['Tips Confirmed', summary.tipsConfirmed],
    ['Tips Cancelled', summary.tipsCancelled],
    ['Tips Failed', summary.tipsFailed],
    ['Tip Completion Rate', `${summary.tipCompletionRate}%`],
    ['Tip Drop Off Rate', `${summary.tipDropOffRate}%`],
    ['Sessions', summary.sessions],
    ['First Seen', summary.firstSeen ? new Date(summary.firstSeen).toISOString() : ''],
    ['Last Seen', summary.lastSeen ? new Date(summary.lastSeen).toISOString() : ''],
  ];

  if (summary.webVitals) {
    rows.push(['', '']);
    rows.push(['Web Vital', 'Value', 'Rating']);
    for (const [name, data] of Object.entries(summary.webVitals)) {
      rows.push([name, data.value, data.rating]);
    }
  }

  if (summary.sortedPages && summary.sortedPages.length > 0) {
    rows.push(['', '']);
    rows.push(['Route', 'Views']);
    for (const [route, count] of summary.sortedPages) {
      rows.push([route, count]);
    }
  }

  if (summary.sortedErrors && summary.sortedErrors.length > 0) {
    rows.push(['', '']);
    rows.push(['Error', 'Count']);
    for (const [error, count] of summary.sortedErrors) {
      rows.push([error.replace(/,/g, ';'), count]);
    }
  }

  const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const filename = generateExportFilename().replace('.json', '.csv');

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

export function copyToClipboard() {
  const json = exportToJson({ includeAllEnvironments: false });
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(json);
  }
  const textarea = document.createElement('textarea');
  textarea.value = json;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return Promise.resolve();
}
