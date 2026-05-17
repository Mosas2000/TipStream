import { logger } from './logging.js';
import { metrics } from './metrics.js';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_BASE_DELAY_MS = 200;
const DEFAULT_MAX_DELAY_MS = 30_000;
const DEFAULT_JITTER_MS = 100;

/**
 * Read retry configuration from environment variables, falling back to
 * the module defaults when values are absent or invalid.
 *
 * Environment variables:
 *   DB_RETRY_MAX_ATTEMPTS  - Maximum total attempts (default: 5)
 *   DB_RETRY_BASE_DELAY_MS - Base delay in ms for backoff (default: 200)
 *   DB_RETRY_MAX_DELAY_MS  - Maximum delay cap in ms (default: 30000)
 */
export function parseRetryConfig(env = {}) {
  const maxAttempts = Number.parseInt(env.DB_RETRY_MAX_ATTEMPTS, 10);
  const baseDelayMs = Number.parseInt(env.DB_RETRY_BASE_DELAY_MS, 10);
  const maxDelayMs = Number.parseInt(env.DB_RETRY_MAX_DELAY_MS, 10);

  return {
    maxAttempts: Number.isNaN(maxAttempts) || maxAttempts < 1 ? DEFAULT_MAX_ATTEMPTS : maxAttempts,
    baseDelayMs: Number.isNaN(baseDelayMs) || baseDelayMs < 0 ? DEFAULT_BASE_DELAY_MS : baseDelayMs,
    maxDelayMs: Number.isNaN(maxDelayMs) || maxDelayMs < 0 ? DEFAULT_MAX_DELAY_MS : maxDelayMs,
  };
}

const RETRYABLE_PG_CODES = new Set([
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  '57P03', // cannot_connect_now (startup)
  '53300', // too_many_connections
  '40001', // serialization_failure
  '40P01', // deadlock_detected
]);

const RETRYABLE_NODE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENOTFOUND',
  'EPIPE',
  'ENETUNREACH',
]);

/**
 * Determine whether an error is transient and safe to retry.
 *
 * @param {Error} error
 * @returns {boolean}
 */
export function isRetryable(error) {
  if (!error) return false;

  if (RETRYABLE_NODE_CODES.has(error.code)) return true;
  if (RETRYABLE_PG_CODES.has(error.code)) return true;

  const msg = String(error.message || '').toLowerCase();
  if (msg.includes('connection refused')) return true;
  if (msg.includes('connection terminated')) return true;
  if (msg.includes('connection reset')) return true;
  if (msg.includes('cannot connect')) return true;
  if (msg.includes('too many connections')) return true;
  if (msg.includes('connection timeout')) return true;
  if (msg.includes('idle timeout')) return true;
  if (msg.includes('client checkout timed out')) return true;

  return false;
}

/**
 * Calculate the delay before the next retry attempt using exponential
 * backoff with full jitter.
 *
 * @param {number} attempt - Zero-based attempt index (0 = first retry).
 * @param {number} baseDelayMs
 * @param {number} maxDelayMs
 * @param {number} jitterMs
 * @returns {number} Delay in milliseconds.
 */
export function calculateBackoff(attempt, baseDelayMs = DEFAULT_BASE_DELAY_MS, maxDelayMs = DEFAULT_MAX_DELAY_MS, jitterMs = DEFAULT_JITTER_MS) {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, maxDelayMs);
  const jitter = Math.floor(Math.random() * jitterMs);
  return capped + jitter;
}

/**
 * Execute an async operation with automatic retry on transient failures.
 *
 * @param {Function} operation - Async function to execute.
 * @param {object}  [options]
 * @param {number}  [options.maxAttempts=5]    - Maximum total attempts.
 * @param {number}  [options.baseDelayMs=200]  - Base delay for backoff.
 * @param {number}  [options.maxDelayMs=30000] - Maximum delay cap.
 * @param {number}  [options.jitterMs=100]     - Random jitter ceiling.
 * @param {string}  [options.operationName]    - Label used in log output.
 * @param {Function}[options.shouldRetry]      - Override retry predicate.
 * @returns {Promise<*>} Result of the operation.
 * @throws {Error} The last error if all attempts are exhausted.
 */
export async function withRetry(operation, options = {}) {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    jitterMs = DEFAULT_JITTER_MS,
    operationName = 'db_operation',
    shouldRetry = isRetryable,
  } = options;

  let lastError;
  let retried = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();
      if (retried) {
        metrics.recordDbRetry('success');
      }
      return result;
    } catch (error) {
      lastError = error;

      const retrying = attempt < maxAttempts && shouldRetry(error);

      if (!retrying) {
        if (attempt > 1) {
          metrics.recordDbRetry('exhausted');
          logger.error('Operation failed after retries', error, {
            operation: operationName,
            attempts: attempt,
          });
        }
        throw error;
      }

      retried = true;
      metrics.recordDbRetry('attempt');
      const delayMs = calculateBackoff(attempt - 1, baseDelayMs, maxDelayMs, jitterMs);

      logger.warn('Retrying operation after transient error', {
        operation: operationName,
        attempt,
        max_attempts: maxAttempts,
        delay_ms: delayMs,
        error_code: error.code,
        error_message: error.message,
      });

      await sleep(delayMs);
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_MAX_ATTEMPTS, DEFAULT_BASE_DELAY_MS, DEFAULT_MAX_DELAY_MS, DEFAULT_JITTER_MS };
