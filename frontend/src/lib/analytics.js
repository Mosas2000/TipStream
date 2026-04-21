const STORAGE_KEY = 'tipstream_analytics';

const DEFAULT_METRICS = {
  pageViews: {},
  walletConnections: 0,
  walletDisconnections: 0,
  tipsStarted: 0,
  tipsSubmitted: 0,
  tipsConfirmed: 0,
  tipsCancelled: 0,
  tipsFailed: 0,
  tabNavigations: {},
  routeRedirects: {},
  errors: {},
  sessions: 0,
  firstSeen: null,
  lastSeen: null,
};

function freshDefaults() {
  return {
    ...DEFAULT_METRICS,
    pageViews: {},
    tabNavigations: {},
    routeRedirects: {},
    errors: {},
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    sessions: 1,
  };
}

function loadMetrics() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshDefaults();
    return JSON.parse(raw);
  } catch {
    return freshDefaults();
  }
}

function saveMetrics(metrics) {
  try {
    metrics.lastSeen = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
  } catch {
    // storage full or unavailable
  }
}

function increment(field) {
  const metrics = loadMetrics();
  if (typeof metrics[field] === 'number') {
    metrics[field] += 1;
  }
  saveMetrics(metrics);
}

function incrementMap(field, key) {
  const metrics = loadMetrics();
  if (!metrics[field] || typeof metrics[field] !== 'object') {
    metrics[field] = {};
  }
  metrics[field][key] = (metrics[field][key] || 0) + 1;
  saveMetrics(metrics);
}

export const analytics = {
  trackPageView(path) {
    incrementMap('pageViews', path);
  },

  trackWalletConnect() {
    increment('walletConnections');
  },

  trackWalletDisconnect() {
    increment('walletDisconnections');
  },

  trackTipStarted() {
    increment('tipsStarted');
  },

  trackTipSubmitted() {
    increment('tipsSubmitted');
  },

  trackTipConfirmed() {
    increment('tipsConfirmed');
  },

  trackTipCancelled() {
    increment('tipsCancelled');
  },

  trackTipFailed() {
    increment('tipsFailed');
  },

  trackTabNavigation(tab) {
    incrementMap('tabNavigations', tab);
  },

  trackRouteRedirect(from, to) {
    const key = `${from} -> ${to}`;
    incrementMap('routeRedirects', key);
  },

  trackError(component, message) {
    const key = `${component}:${message}`.slice(0, 200);
    incrementMap('errors', key);
  },

  trackAuthError(reason) {
    const key = `auth:${reason}`.slice(0, 200);
    incrementMap('errors', key);
  },

  trackPerformance(metric, value, rating) {
    const metrics = loadMetrics();
    if (!metrics.webVitals) metrics.webVitals = {};
    metrics.webVitals[metric] = { value, rating, timestamp: Date.now() };
    saveMetrics(metrics);
  },

  trackSession() {
    increment('sessions');
  },

  getMetrics() {
    return loadMetrics();
  },

  getSummary() {
    const m = loadMetrics();
    const tipCompletionRate = m.tipsStarted > 0
      ? ((m.tipsConfirmed / m.tipsStarted) * 100).toFixed(1)
      : '0.0';
    const tipDropOffRate = m.tipsStarted > 0
      ? (((m.tipsStarted - m.tipsConfirmed) / m.tipsStarted) * 100).toFixed(1)
      : '0.0';

    const sortedTabs = Object.entries(m.tabNavigations || {})
      .sort((a, b) => b[1] - a[1]);

    const sortedPages = Object.entries(m.pageViews || {})
      .sort((a, b) => b[1] - a[1]);

    const sortedErrors = Object.entries(m.errors || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const totalPageViews = Object.values(m.pageViews || {}).reduce((a, b) => a + b, 0);
    const totalErrors = Object.values(m.errors || {}).reduce((a, b) => a + b, 0);

    return {
      totalPageViews,
      walletConnections: m.walletConnections,
      tipsStarted: m.tipsStarted,
      tipsSubmitted: m.tipsSubmitted,
      tipsConfirmed: m.tipsConfirmed,
      tipsCancelled: m.tipsCancelled,
      tipsFailed: m.tipsFailed,
      tipCompletionRate,
      tipDropOffRate,
      sortedTabs,
      sortedPages,
      sortedErrors,
      totalErrors,
      sessions: m.sessions,
      firstSeen: m.firstSeen,
      lastSeen: m.lastSeen,
      webVitals: m.webVitals || {},
    };
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
