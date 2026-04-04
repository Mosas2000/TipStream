/**
 * @module lib/resilience
 *
 * Utilities for monitoring and debugging resilience features.
 *
 * Provides logging, metrics collection, and diagnostic tools for
 * cache performance and API resilience.
 */

import { getCacheStats } from './persistentCache';

/**
 * Global resilience configuration.
 */
const config = {
  debugMode: false,
  logCacheOperations: false,
};

/**
 * Enable debug logging for resilience operations.
 *
 * @param {boolean} enable - Enable or disable debug mode
 */
export function setDebugMode(enable) {
  config.debugMode = enable;
  if (enable) {
    console.log('[Resilience] Debug mode enabled');
  }
}

/**
 * Enable logging of cache operations.
 *
 * @param {boolean} enable - Enable or disable operation logging
 */
export function setOperationLogging(enable) {
  config.logCacheOperations = enable;
  if (enable) {
    console.log('[Resilience] Operation logging enabled');
  }
}

/**
 * Log a resilience event.
 *
 * @param {string} source - Source of the event (cache, api, transaction)
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
export function logResilienceEvent(source, level, message, data = {}) {
  if (!config.debugMode) return;

  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();
  const prefix = `[${timestamp}] [Resilience:${source}:${levelUpper}]`;

  const logFn = {
    debug: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  }[level] || console.log;

  logFn(`${prefix} ${message}`, data);
}

/**
 * Log a cache operation.
 *
 * @param {string} operation - Operation type (get, set, clear, hit, miss)
 * @param {string} key - Cache key
 * @param {*} value - Value (optional)
 */
export function logCacheOperation(operation, key, value = null) {
  if (!config.logCacheOperations) return;

  const timestamp = new Date().toISOString();
  const valueStr = value ? ` (${typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value})` : '';
  console.log(`[${timestamp}] [Cache:${operation}] ${key}${valueStr}`);
}

/**
 * Get diagnostic report for resilience system.
 *
 * @returns {Object} Comprehensive system report
 */
export function getDiagnosticReport() {
  const cacheStats = getCacheStats();

  return {
    timestamp: new Date().toISOString(),
    cache: {
      entries: cacheStats.totalEntries,
      sizeBytes: cacheStats.totalSize,
      sizeMb: (cacheStats.totalSize / 1024 / 1024).toFixed(2),
      quota: {
        usagePercent: ((cacheStats.totalSize / (5 * 1024 * 1024)) * 100).toFixed(1),
        warning: cacheStats.totalSize > (4 * 1024 * 1024),
      },
      cacheEntries: cacheStats.entries,
    },
    navigator: typeof navigator !== 'undefined' ? {
      onLine: navigator.onLine,
      userAgent: navigator.userAgent.substring(0, 100),
    } : null,
    storage: {
      localStorage: typeof localStorage !== 'undefined' ? {
        available: true,
        usage: localStorage.length,
      } : { available: false },
    },
  };
}

/**
 * Print diagnostic report to console.
 *
 * Used for debugging cache issues and monitoring storage usage.
 */
export function printDiagnostics() {
  const report = getDiagnosticReport();
  console.group('[Resilience Diagnostics]');
  console.log('Cache Statistics:', report.cache);
  console.log('Navigator:', report.navigator);
  console.log('Storage:', report.storage);
  console.groupEnd();
}

/**
 * Export diagnostic data as JSON.
 *
 * @returns {string} JSON string of diagnostic report
 */
export function exportDiagnostics() {
  return JSON.stringify(getDiagnosticReport(), null, 2);
}
