export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    this.cleanup();
    return this.requests.length < this.maxRequests;
  }

  recordRequest() {
    if (!this.canMakeRequest()) {
      throw new Error('Rate limit exceeded');
    }
    this.requests.push(Date.now());
  }

  cleanup() {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);
  }

  getRemaining() {
    this.cleanup();
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  getResetTime() {
    if (this.requests.length === 0) return null;
    const oldestRequest = Math.min(...this.requests);
    return oldestRequest + this.windowMs;
  }

  getWaitTime() {
    const resetTime = this.getResetTime();
    if (!resetTime) return 0;
    const wait = resetTime - Date.now();
    return Math.max(0, wait);
  }

  reset() {
    this.requests = [];
  }

  getStats() {
    this.cleanup();
    return {
      used: this.requests.length,
      remaining: this.getRemaining(),
      limit: this.maxRequests,
      windowMs: this.windowMs,
      resetTime: this.getResetTime(),
      waitTimeMs: this.getWaitTime(),
    };
  }
}

export function createBlockCheckRateLimiter() {
  return new RateLimiter(5, 60000);
}

export function createRecipientValidationRateLimiter() {
  return new RateLimiter(20, 60000);
}
