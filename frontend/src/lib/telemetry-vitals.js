export const VITAL_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000, unit: 'ms', label: 'Largest Contentful Paint' },
  CLS: { good: 100, needsImprovement: 250, unit: '', label: 'Cumulative Layout Shift' },
  INP: { good: 200, needsImprovement: 500, unit: 'ms', label: 'Interaction to Next Paint' },
  FCP: { good: 1800, needsImprovement: 3000, unit: 'ms', label: 'First Contentful Paint' },
  TTFB: { good: 800, needsImprovement: 1800, unit: 'ms', label: 'Time to First Byte' },
};

export const VITAL_ORDER = ['LCP', 'FCP', 'TTFB', 'INP', 'CLS'];

export function formatVitalValue(name, value) {
  const threshold = VITAL_THRESHOLDS[name];
  if (!threshold) return String(value);

  if (name === 'CLS') {
    return (value / 1000).toFixed(3);
  }

  if (threshold.unit === 'ms') {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}s`;
    }
    return `${value}ms`;
  }

  return String(value);
}

export function getVitalRating(name, value) {
  const threshold = VITAL_THRESHOLDS[name];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

export function getVitalRatingColor(rating) {
  switch (rating) {
    case 'good':
      return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' };
    case 'needs-improvement':
      return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
    case 'poor':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' };
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' };
  }
}

export function computeVitalsSummary(webVitals) {
  if (!webVitals || Object.keys(webVitals).length === 0) {
    return {
      vitals: [],
      overallScore: null,
      coreVitalsPassing: false,
      lastUpdated: null,
    };
  }

  const vitals = VITAL_ORDER.map(name => {
    const data = webVitals[name];
    if (!data) return null;

    return {
      name,
      label: VITAL_THRESHOLDS[name]?.label || name,
      value: data.value,
      formattedValue: formatVitalValue(name, data.value),
      rating: getVitalRating(name, data.value),
      colors: getVitalRatingColor(getVitalRating(name, data.value)),
      timestamp: data.timestamp,
    };
  }).filter(Boolean);

  const coreVitals = ['LCP', 'CLS', 'INP'];
  const coreVitalsPassing = coreVitals.every(name => {
    const vital = vitals.find(v => v.name === name);
    return vital && vital.rating === 'good';
  });

  const ratingScores = { good: 100, 'needs-improvement': 50, poor: 0 };
  const scores = vitals
    .filter(v => coreVitals.includes(v.name))
    .map(v => ratingScores[v.rating] ?? 0);

  const overallScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const timestamps = vitals.map(v => v.timestamp).filter(Boolean);
  const lastUpdated = timestamps.length > 0 ? Math.max(...timestamps) : null;

  return {
    vitals,
    overallScore,
    coreVitalsPassing,
    lastUpdated,
  };
}

export function getVitalDescription(name) {
  const descriptions = {
    LCP: 'Measures loading performance. Good LCP means the main content loads fast.',
    CLS: 'Measures visual stability. A low CLS means the page layout stays stable.',
    INP: 'Measures interactivity. Good INP means the page responds quickly to input.',
    FCP: 'Measures how quickly the first content becomes visible.',
    TTFB: 'Measures the time until the first byte of the response is received.',
  };
  return descriptions[name] || '';
}

export function getOverallScoreLabel(score) {
  if (score === null) return 'No Data';
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Needs Work';
  return 'Poor';
}

export function getOverallScoreColor(score) {
  if (score === null) return getVitalRatingColor('unknown');
  if (score >= 90) return getVitalRatingColor('good');
  if (score >= 50) return getVitalRatingColor('needs-improvement');
  return getVitalRatingColor('poor');
}
