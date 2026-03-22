export function formatDate(timestamp) {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleString();
}

export function formatDateShort(timestamp) {
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleDateString();
}

export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Never';

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDateShort(timestamp);
}

export function formatNumber(value) {
  if (typeof value !== 'number') return String(value);
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export function formatPercent(value, decimals = 1) {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
}

export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function sortByFrequency(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.sort((a, b) => b[1] - a[1]);
}

export function getTopN(entries, n = 10) {
  return sortByFrequency(entries).slice(0, n);
}

export function calculatePercentChange(current, previous) {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

export function calculateRate(numerator, denominator) {
  if (!denominator || denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

export function getMetricTrend(currentValue, previousValue) {
  const change = calculatePercentChange(currentValue, previousValue);

  if (change > 10) return 'up';
  if (change < -10) return 'down';
  return 'stable';
}

export function groupByKey(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

export function sumByKey(items, keyFn, valueFn = (x) => x) {
  return items.reduce((sum, item) => {
    const key = keyFn(item);
    const value = valueFn(item);
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);
}

export function averageByKey(items, valueFn = (x) => x) {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, item) => {
    const value = valueFn(item);
    return acc + (typeof value === 'number' ? value : 0);
  }, 0);
  return sum / items.length;
}

export function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

export function median(values) {
  return percentile(values, 50);
}

export function range(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0];
}
