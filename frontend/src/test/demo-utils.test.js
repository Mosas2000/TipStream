import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  activateDemo,
  deactivateDemo,
  getDemoWalletAddress,
  isDemoModeActive,
  getMockBalance,
  getMockTransactionDelay,
} from '../lib/demo-utils';
import { DEMO_CONFIG, setDemoMode } from '../config/demo';

describe('Demo Utilities', () => {
  beforeEach(() => {
    setDemoMode(false);
  });

  afterEach(() => {
    setDemoMode(false);
  });

  describe('activateDemo', () => {
    it('should enable demo mode', () => {
      activateDemo();
      expect(isDemoModeActive()).toBe(true);
    });
  });

  describe('deactivateDemo', () => {
    it('should disable demo mode', () => {
      activateDemo();
      deactivateDemo();
      expect(isDemoModeActive()).toBe(false);
    });
  });

  describe('getDemoWalletAddress', () => {
    it('should return mock wallet address', () => {
      const address = getDemoWalletAddress();
      expect(address).toBe(DEMO_CONFIG.mockWalletAddress);
      expect(address).toMatch(/^SP/);
    });
  });

  describe('isDemoModeActive', () => {
    it('should return false when demo disabled', () => {
      expect(isDemoModeActive()).toBe(false);
    });

    it('should return true when demo enabled', () => {
      activateDemo();
      expect(isDemoModeActive()).toBe(true);
    });
  });

  describe('getMockBalance', () => {
    it('should return default mock balance', () => {
      const balance = getMockBalance();
      expect(balance).toBe(5000);
    });
  });

  describe('getMockTransactionDelay', () => {
    it('should return transaction delay', () => {
      const delay = getMockTransactionDelay();
      expect(delay).toBe(800);
    });
  });
});
