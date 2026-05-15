/**
 * Rate limiting for the webhook endpoint.
 * 
 * Implements per-IP rate limiting to prevent abuse and DoS attacks
 * on the event ingestion endpoint.
 */

/**
 * Simple in-memory rate limiter using sliding window counters.
 * Tracks requests per IP address and enforces rate limits.
 */
export class RateLimiter {
  /**
   * @param {number} maxRequests - Maximum requests allowed per window
   * @param {number} windowMs - Time window in milliseconds
   */
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  /**
   * Check if an IP has exceeded rate limit.
   * Returns true if the request should be allowed.
   * 
   * @param {string} ip - IP address from request
   * @returns {boolean} True if request is allowed, false if rate limited
   */
  isAllowed(ip) {
    const now = Date.now();
    const key = ip;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const timestamps = this.requests.get(key);
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  /**
   * Get remaining requests for an IP.
   * 
   * @param {string} ip - IP address from request
   * @returns {number} Number of requests remaining in current window
   */
  getRemaining(ip) {
    const now = Date.now();
    if (!this.requests.has(ip)) {
      return this.maxRequests;
    }

    const timestamps = this.requests.get(ip);
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
    return Math.max(0, this.maxRequests - validTimestamps.length);
  }

  /**
   * Clear old entries to prevent memory leaks.
   * Should be called periodically (e.g., every minute).
   */
  cleanup() {
    const now = Date.now();
    for (const [ip, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
      if (validTimestamps.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validTimestamps);
      }
    }
  }

  /**
   * Update rate limit configuration at runtime.
   * Changes apply immediately to all subsequent requests.
   * Existing rate limit counters are preserved.
   * 
   * @param {number} maxRequests - New maximum requests per window
   * @param {number} windowMs - New time window in milliseconds
   */
  updateConfig(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Get current rate limit configuration.
   * Useful for monitoring and audit purposes.
   * 
   * @returns {object} Current configuration with maxRequests and windowMs
   */
  getConfig() {
    return {
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }
}

/**
 * Extract client IP from request, accounting for proxies.
 * 
 * @param {import('node:http').IncomingMessage} req - HTTP request
 * @returns {string} Client IP address
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Validate rate limit configuration parameters.
 * Ensures values are within acceptable ranges for production use.
 * 
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} Validation result with valid flag and error message if invalid
 */
export function validateRateLimitConfig(maxRequests, windowMs) {
  if (typeof maxRequests !== 'number' || isNaN(maxRequests)) {
    return { valid: false, error: 'maxRequests must be a number' };
  }

  if (typeof windowMs !== 'number' || isNaN(windowMs)) {
    return { valid: false, error: 'windowMs must be a number' };
  }

  if (maxRequests < 1 || maxRequests > 10000) {
    return { valid: false, error: 'maxRequests must be between 1 and 10000' };
  }

  if (windowMs < 1000 || windowMs > 3600000) {
    return { valid: false, error: 'windowMs must be between 1000 and 3600000' };
  }

  return { valid: true };
}
