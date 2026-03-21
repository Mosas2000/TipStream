import { describe, it, expect, beforeEach } from 'vitest';
import {
  RateLimiter,
  createBlockCheckRateLimiter,
  createRecipientValidationRateLimiter,
} from '../lib/recipient-rate-limiter';

describe('recipient-rate-limiter', () => {
  describe('RateLimiter', () => {
    let limiter;

    beforeEach(() => {
      limiter = new RateLimiter(5, 60000);
    });

    it('allows requests within limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(limiter.canMakeRequest()).toBe(true);
        limiter.recordRequest();
      }
    });

    it('denies requests beyond limit', () => {
      for (let i = 0; i < 5; i++) {
        limiter.recordRequest();
      }

      expect(limiter.canMakeRequest()).toBe(false);
    });

    it('throws error when recording beyond limit', () => {
      for (let i = 0; i < 5; i++) {
        limiter.recordRequest();
      }

      expect(() => limiter.recordRequest()).toThrow();
    });

    it('calculates remaining quota', () => {
      limiter.recordRequest();
      expect(limiter.getRemaining()).toBe(4);

      limiter.recordRequest();
      expect(limiter.getRemaining()).toBe(3);
    });

    it('provides rate limit stats', () => {
      limiter.recordRequest();
      limiter.recordRequest();
      const stats = limiter.getStats();

      expect(stats).toHaveProperty('used');
      expect(stats).toHaveProperty('remaining');
      expect(stats).toHaveProperty('limit');
      expect(stats).toHaveProperty('windowMs');
      expect(stats.used).toBe(2);
      expect(stats.remaining).toBe(3);
      expect(stats.limit).toBe(5);
    });

    it('calculates wait time', () => {
      limiter.recordRequest();
      const waitTime = limiter.getWaitTime();

      expect(waitTime).toBeGreaterThanOrEqual(0);
      expect(waitTime).toBeLessThanOrEqual(60000);
    });

    it('returns null reset time when no requests', () => {
      const resetTime = limiter.getResetTime();
      expect(resetTime).toBeNull();
    });

    it('resets limiter', () => {
      limiter.recordRequest();
      limiter.recordRequest();

      limiter.reset();
      expect(limiter.getRemaining()).toBe(5);
    });

    it('cleans up old requests', (done) => {
      const shortLimiter = new RateLimiter(5, 100);
      
      shortLimiter.recordRequest();
      shortLimiter.recordRequest();
      expect(shortLimiter.getRemaining()).toBe(3);

      setTimeout(() => {
        shortLimiter.cleanup();
        expect(shortLimiter.getRemaining()).toBe(5);
        done();
      }, 150);
    });
  });

  describe('predefined limiters', () => {
    it('creates block check rate limiter', () => {
      const limiter = createBlockCheckRateLimiter();
      expect(limiter).toBeInstanceOf(RateLimiter);
      const stats = limiter.getStats();
      expect(stats.limit).toBe(5);
    });

    it('creates recipient validation rate limiter', () => {
      const limiter = createRecipientValidationRateLimiter();
      expect(limiter).toBeInstanceOf(RateLimiter);
      const stats = limiter.getStats();
      expect(stats.limit).toBe(20);
    });
  });

  describe('edge cases', () => {
    it('handles zero limit gracefully', () => {
      const limiter = new RateLimiter(0, 60000);
      expect(limiter.canMakeRequest()).toBe(false);
    });

    it('handles very short window', (done) => {
      const limiter = new RateLimiter(1, 50);
      limiter.recordRequest();
      expect(limiter.canMakeRequest()).toBe(false);

      setTimeout(() => {
        expect(limiter.canMakeRequest()).toBe(true);
        done();
      }, 100);
    });

    it('handles multiple resets', () => {
      const limiter = new RateLimiter(3, 60000);

      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.getRemaining()).toBe(1);

      limiter.reset();
      expect(limiter.getRemaining()).toBe(3);

      limiter.recordRequest();
      expect(limiter.getRemaining()).toBe(2);

      limiter.reset();
      expect(limiter.getRemaining()).toBe(3);
    });
  });

  describe('time calculations', () => {
    it('calculates accurate reset times', (done) => {
      const limiter = new RateLimiter(1, 100);
      limiter.recordRequest();

      const resetTime = limiter.getResetTime();
      expect(resetTime).toBeDefined();

      setTimeout(() => {
        const remaining = limiter.getRemaining();
        expect(remaining).toBe(1);
        done();
      }, 150);
    });

    it('waits appropriate time before reset', (done) => {
      const limiter = new RateLimiter(1, 100);
      limiter.recordRequest();

      const waitTime = limiter.getWaitTime();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(100);

      done();
    });
  });
});
