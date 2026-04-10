import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DEMO_CONFIG, isDemo, setDemoMode, loadDemoPreference } from '../config/demo';

describe('Demo Mode Configuration', () => {
  beforeEach(() => {
    localStorage.clear();
    DEMO_CONFIG.enabled = false;
  });

  afterEach(() => {
    localStorage.clear();
    DEMO_CONFIG.enabled = false;
  });

  it('should have demo config defined', () => {
    expect(DEMO_CONFIG).toBeDefined();
    expect(DEMO_CONFIG.mockWalletAddress).toBeDefined();
    expect(DEMO_CONFIG.mockBalance).toBe(5000);
    expect(DEMO_CONFIG.mockTransactionDelay).toBe(800);
  });

  it('should initialize with demo disabled', () => {
    expect(isDemo()).toBe(false);
  });

  it('should enable demo mode', () => {
    setDemoMode(true);
    expect(isDemo()).toBe(true);
  });

  it('should disable demo mode', () => {
    setDemoMode(true);
    setDemoMode(false);
    expect(isDemo()).toBe(false);
  });

  it('should persist demo preference to localStorage', () => {
    setDemoMode(true);
    const stored = localStorage.getItem('tipstream_demo_mode');
    expect(stored).toBe('true');
  });

  it('should load demo preference from localStorage', () => {
    localStorage.setItem('tipstream_demo_mode', 'true');
    loadDemoPreference();
    expect(isDemo()).toBe(true);
  });

  it('should have mock tips configured', () => {
    expect(DEMO_CONFIG.mockTips).toHaveLength(2);
    expect(DEMO_CONFIG.mockTips[0]).toHaveProperty('sender');
    expect(DEMO_CONFIG.mockTips[0]).toHaveProperty('recipient');
    expect(DEMO_CONFIG.mockTips[0]).toHaveProperty('amount');
  });
});
