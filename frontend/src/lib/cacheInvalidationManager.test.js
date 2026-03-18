import { describe, it, expect, beforeEach } from 'vitest';
import {
  invalidateByPattern,
  invalidateOnTipSent,
  invalidateOnProfileUpdate,
  invalidateUserBalance,
  invalidateAllReadCaches,
  CACHE_KEYS,
} from './cacheInvalidationManager';
import { setCacheEntry, getCacheEntry } from './persistentCache';

describe('Cache Invalidation Manager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('invalidateByPattern', () => {
    it('invalidates entries matching pattern', () => {
      setCacheEntry('leaderboard', { data: 'board' });
      setCacheEntry('leaderboard_extended', { data: 'extended' });
      setCacheEntry('stats', { data: 'stats' });

      invalidateByPattern('leaderboard');

      expect(getCacheEntry('leaderboard')).toBeNull();
      expect(getCacheEntry('leaderboard_extended')).toBeNull();
      expect(getCacheEntry('stats')).toBeDefined();
    });

    it('handles pattern with no matches', () => {
      setCacheEntry('stats', { data: 'stats' });
      invalidateByPattern('nonexistent_pattern');
      expect(getCacheEntry('stats')).toBeDefined();
    });
  });

  describe('invalidateOnTipSent', () => {
    it('invalidates related caches', () => {
      setCacheEntry('leaderboard', { data: 'board' });
      setCacheEntry('platform_stats', { data: 'stats' });
      setCacheEntry('events_feed', { data: 'feed' });
      setCacheEntry('user_balance_alice', { data: 'balance' });

      invalidateOnTipSent();

      expect(getCacheEntry('leaderboard')).toBeNull();
      expect(getCacheEntry('platform_stats')).toBeNull();
      expect(getCacheEntry('events_feed')).toBeNull();
      expect(getCacheEntry('user_balance_alice')).toBeDefined();
    });
  });

  describe('invalidateOnProfileUpdate', () => {
    it('invalidates profile and leaderboard', () => {
      setCacheEntry('user_profile_alice', { data: 'profile' });
      setCacheEntry('leaderboard', { data: 'board' });
      setCacheEntry('platform_stats', { data: 'stats' });

      invalidateOnProfileUpdate();

      expect(getCacheEntry('user_profile_alice')).toBeNull();
      expect(getCacheEntry('leaderboard')).toBeNull();
      expect(getCacheEntry('platform_stats')).toBeDefined();
    });
  });

  describe('invalidateUserBalance', () => {
    it('invalidates specific user balance', () => {
      setCacheEntry('user_balance_alice', { data: 'balance_alice' });
      setCacheEntry('user_balance_bob', { data: 'balance_bob' });

      invalidateUserBalance('alice');

      expect(getCacheEntry('user_balance_alice')).toBeNull();
      expect(getCacheEntry('user_balance_bob')).toBeDefined();
    });

    it('handles null address gracefully', () => {
      setCacheEntry('user_balance_alice', { data: 'balance' });
      invalidateUserBalance(null);
      expect(getCacheEntry('user_balance_alice')).toBeDefined();
    });

    it('handles empty string address gracefully', () => {
      setCacheEntry('user_balance_alice', { data: 'balance' });
      invalidateUserBalance('');
      expect(getCacheEntry('user_balance_alice')).toBeDefined();
    });
  });

  describe('invalidateAllReadCaches', () => {
    it('clears all read-heavy caches', () => {
      setCacheEntry('leaderboard', { data: 'board' });
      setCacheEntry('platform_stats', { data: 'stats' });
      setCacheEntry('user_profile_alice', { data: 'profile' });
      setCacheEntry('user_balance_alice', { data: 'balance' });
      setCacheEntry('events_feed', { data: 'feed' });

      invalidateAllReadCaches();

      expect(getCacheEntry('leaderboard')).toBeNull();
      expect(getCacheEntry('platform_stats')).toBeNull();
      expect(getCacheEntry('user_profile_alice')).toBeNull();
      expect(getCacheEntry('user_balance_alice')).toBeNull();
      expect(getCacheEntry('events_feed')).toBeNull();
    });
  });

  describe('CACHE_KEYS', () => {
    it('defines standard cache keys', () => {
      expect(CACHE_KEYS.LEADERBOARD).toBe('leaderboard');
      expect(CACHE_KEYS.STATS).toBe('platform_stats');
      expect(CACHE_KEYS.EVENTS_FEED).toBe('events_feed');
    });
  });

  describe('Integration', () => {
    it('handles complex invalidation scenarios', () => {
      setCacheEntry('leaderboard', { data: 'board' });
      setCacheEntry('user_profile_alice', { data: 'profile' });
      setCacheEntry('user_balance_bob', { data: 'balance' });
      setCacheEntry('events_feed', { data: 'feed' });

      invalidateOnTipSent();

      expect(getCacheEntry('leaderboard')).toBeNull();
      expect(getCacheEntry('user_profile_alice')).toBeDefined();
      expect(getCacheEntry('user_balance_bob')).toBeDefined();
      expect(getCacheEntry('events_feed')).toBeNull();
    });

    it('supports cascading invalidations', () => {
      setCacheEntry('user_profile_alice', { data: 'old' });
      setCacheEntry('leaderboard', { data: 'old' });

      invalidateOnProfileUpdate();

      expect(getCacheEntry('user_profile_alice')).toBeNull();
      expect(getCacheEntry('leaderboard')).toBeNull();
    });
  });
});
