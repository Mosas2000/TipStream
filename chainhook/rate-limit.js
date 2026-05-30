/**
 * Rate limiting for the webhook endpoint.
 *
 * Implements per-IP rate limiting to prevent abuse and DoS attacks
 * on the event ingestion endpoint, and per-address rate limiting to
 * prevent wallet-based abuse from users rotating IP addresses.
 */

/**
 * Simple in-memory rate limiter using sliding window counters.
 * Tracks requests per key (IP address or Stacks address) and enforces rate limits.
 */
export class RateLimiter {
  /**
   * @param {number} maxRequests - Maximum requests allowed per window
   * @param {number} windowMs - Time window in milliseconds
   */
  constructor(maxRequests, windowMs) {
    const validation = validateRateLimitConfig(maxRequests, windowMs);
    if (!validation.valid) {
      throw new Error(`Invalid rate limit configuration: ${validation.error}`);
    }
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
    const validation = validateRateLimitConfig(maxRequests, windowMs);
    if (!validation.valid) {
      throw new Error(`Invalid rate limit configuration: ${validation.error}`);
    }
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
 * Configuration bounds for rate limiting.
 * These values define acceptable ranges for production use.
 */
export const RATE_LIMIT_BOUNDS = {
  MAX_REQUESTS_MIN: 1,
  MAX_REQUESTS_MAX: 10000,
  WINDOW_MS_MIN: 1000,
  WINDOW_MS_MAX: 3600000,
};

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

  if (!Number.isFinite(maxRequests)) {
    return { valid: false, error: 'maxRequests must be a finite number' };
  }

  if (!Number.isFinite(windowMs)) {
    return { valid: false, error: 'windowMs must be a finite number' };
  }

  if (!Number.isInteger(maxRequests)) {
    return { valid: false, error: 'maxRequests must be an integer' };
  }

  if (!Number.isInteger(windowMs)) {
    return { valid: false, error: 'windowMs must be an integer' };
  }

  if (maxRequests < RATE_LIMIT_BOUNDS.MAX_REQUESTS_MIN) {
    return { 
      valid: false, 
      error: `maxRequests must be at least ${RATE_LIMIT_BOUNDS.MAX_REQUESTS_MIN}` 
    };
  }

  if (maxRequests > RATE_LIMIT_BOUNDS.MAX_REQUESTS_MAX) {
    return { 
      valid: false, 
      error: `maxRequests must not exceed ${RATE_LIMIT_BOUNDS.MAX_REQUESTS_MAX}` 
    };
  }

  if (windowMs < RATE_LIMIT_BOUNDS.WINDOW_MS_MIN) {
    return { 
      valid: false, 
      error: `windowMs must be at least ${RATE_LIMIT_BOUNDS.WINDOW_MS_MIN}ms (1 second)` 
    };
  }

  if (windowMs > RATE_LIMIT_BOUNDS.WINDOW_MS_MAX) {
    return { 
      valid: false, 
      error: `windowMs must not exceed ${RATE_LIMIT_BOUNDS.WINDOW_MS_MAX}ms (1 hour)` 
    };
  }

  return { valid: true };
}

/**
 * Per-address rate limiter with whitelist support.
 *
 * Tracks tip submissions per Stacks wallet address using the same sliding
 * window algorithm as RateLimiter. Whitelisted addresses bypass all limits.
 * Designed to complement IP-based limiting so that users rotating IPs cannot
 * exceed the per-address quota.
 */
export class AddressRateLimiter {
  /**
   * @param {number} maxRequests - Maximum requests allowed per window per address
   * @param {number} windowMs - Time window in milliseconds
   * @param {string[]} [whitelist] - Addresses that are never rate limited
   */
  constructor(maxRequests, windowMs, whitelist = []) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
    this.whitelist = new Set(
      whitelist.map(a => (typeof a === 'string' ? a.trim().toUpperCase() : '')).filter(Boolean)
    );
  }

  _key(address) {
    return typeof address === 'string' ? address.trim().toUpperCase() : '';
  }

  isWhitelisted(address) {
    return this.whitelist.has(this._key(address));
  }

  /**
   * Check if an address has exceeded its rate limit.
   * Whitelisted addresses always return true.
   *
   * @param {string} address - Stacks wallet address
   * @returns {boolean} True if the request is allowed
   */
  isAllowed(address) {
    if (!address || typeof address !== 'string') return true;
    if (this.isWhitelisted(address)) return true;

    const now = Date.now();
    const key = this._key(address);

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const timestamps = this.requests.get(key);
    const valid = timestamps.filter(ts => now - ts < this.windowMs);

    if (valid.length >= this.maxRequests) {
      return false;
    }

    valid.push(now);
    this.requests.set(key, valid);
    return true;
  }

  /**
   * Get remaining requests for an address within the current window.
   * Returns maxRequests for whitelisted addresses.
   *
   * @param {string} address - Stacks wallet address
   * @returns {number}
   */
  getRemaining(address) {
    if (!address || typeof address !== 'string') return this.maxRequests;
    if (this.isWhitelisted(address)) return this.maxRequests;

    const now = Date.now();
    const key = this._key(address);

    if (!this.requests.has(key)) return this.maxRequests;

    const valid = this.requests.get(key).filter(ts => now - ts < this.windowMs);
    return Math.max(0, this.maxRequests - valid.length);
  }

  /**
   * Add an address to the whitelist.
   * @param {string} address
   */
  addToWhitelist(address) {
    if (address && typeof address === 'string') {
      this.whitelist.add(this._key(address));
    }
  }

  /**
   * Remove an address from the whitelist.
   * @param {string} address
   */
  removeFromWhitelist(address) {
    if (address && typeof address === 'string') {
      this.whitelist.delete(this._key(address));
    }
  }

  /**
   * Return the current whitelist as a sorted array of addresses.
   * @returns {string[]}
   */
  getWhitelist() {
    return Array.from(this.whitelist).sort();
  }

  /**
   * Update rate limit configuration at runtime.
   * Existing counters are preserved; the new limits apply immediately.
   *
   * @param {number} maxRequests
   * @param {number} windowMs
   */
  updateConfig(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Get current configuration.
   * @returns {{ maxRequests: number, windowMs: number, whitelistSize: number }}
   */
  getConfig() {
    return {
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      whitelistSize: this.whitelist.size,
    };
  }

  /**
   * Remove expired entries to prevent unbounded memory growth.
   * Should be called on the same interval as RateLimiter.cleanup().
   */
  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(ts => now - ts < this.windowMs);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }
}

/**
 * Parse a comma-separated whitelist string from an environment variable.
 * Returns an array of trimmed, non-empty address strings.
 *
 * @param {string} [value] - Raw env var value
 * @returns {string[]}
 */
export function parseAddressWhitelist(value) {
  if (!value || typeof value !== 'string') return [];
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Validate address rate limit configuration parameters.
 * Delegates to validateRateLimitConfig since the same bounds apply.
 *
 * @param {number} maxRequests
 * @param {number} windowMs
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAddressRateLimitConfig(maxRequests, windowMs) {
  return validateRateLimitConfig(maxRequests, windowMs);
}
