/**
 * @module lib/enrichmentMetrics
 *
 * Metrics collection for event enrichment performance tracking.
 *
 * Tracks API calls, cache hits, and timing to help measure the
 * effectiveness of selective enrichment vs. bulk enrichment.
 */

const metrics = {
  totalEnrichmentRequests: 0,
  totalTipIdsRequested: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageEnrichmentTime: 0,
  enrichmentTimings: [],
};

/**
 * Record an enrichment request.
 *
 * @param {number} tipCount - Number of tips enriched.
 * @param {number} cacheHit - Number that hit cache.
 * @param {number} timeTakenMs - Milliseconds spent enriching.
 */
export function recordEnrichmentRequest(tipCount, cacheHit, timeTakenMs) {
  metrics.totalEnrichmentRequests += 1;
  metrics.totalTipIdsRequested += tipCount;
  metrics.cacheHits += cacheHit;
  metrics.cacheMisses += (tipCount - cacheHit);
  metrics.enrichmentTimings.push(timeTakenMs);

  if (metrics.enrichmentTimings.length > 100) {
    metrics.enrichmentTimings.shift();
  }

  metrics.averageEnrichmentTime =
    metrics.enrichmentTimings.reduce((a, b) => a + b, 0) /
    metrics.enrichmentTimings.length;
}

/**
 * Get enrichment metrics summary.
 *
 * @returns {Object} Current metrics state.
 */
export function getEnrichmentMetrics() {
  return {
    ...metrics,
    cacheHitRate:
      metrics.totalTipIdsRequested > 0
        ? (metrics.cacheHits / metrics.totalTipIdsRequested * 100).toFixed(2) + '%'
        : 'N/A',
  };
}

/**
 * Reset all enrichment metrics.
 */
export function resetEnrichmentMetrics() {
  metrics.totalEnrichmentRequests = 0;
  metrics.totalTipIdsRequested = 0;
  metrics.cacheHits = 0;
  metrics.cacheMisses = 0;
  metrics.averageEnrichmentTime = 0;
  metrics.enrichmentTimings = [];
}

/**
 * Create a performance marker for an enrichment operation.
 *
 * @returns {Object} Marker with stop() function.
 */
export function createEnrichmentMarker() {
  const startTime = performance.now();

  return {
    stop: (tipsCount, cacheHits = 0) => {
      const endTime = performance.now();
      recordEnrichmentRequest(tipsCount, cacheHits, endTime - startTime);
    },
  };
}
