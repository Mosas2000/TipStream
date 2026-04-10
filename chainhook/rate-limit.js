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
