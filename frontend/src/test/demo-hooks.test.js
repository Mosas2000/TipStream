import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DemoProvider } from '../context/DemoContext';
import { useDemoMode } from '../context/DemoContext';
import { useDemoStats } from '../hooks/useDemoStats';
import { useDemoHistory } from '../hooks/useDemoHistory';

const wrapper = ({ children }) => <DemoProvider>{children}</DemoProvider>;

describe('Demo Mode Hooks', () => {
  describe('useDemoMode', () => {
    it('should toggle demo mode', () => {
      const { result } = renderHook(() => useDemoMode(), { wrapper });
      
      expect(result.current.demoEnabled).toBe(false);
      
      act(() => {
        result.current.toggleDemo(true);
      });
      
      expect(result.current.demoEnabled).toBe(true);
    });

    it('should get demo data', () => {
      const { result } = renderHook(() => useDemoMode(), { wrapper });
      
      const data = result.current.getDemoData();
      expect(data).toHaveProperty('mockWalletAddress');
      expect(data).toHaveProperty('mockBalance');
      expect(data).toHaveProperty('mockTips');
    });
  });

  describe('useDemoStats', () => {
    it('should return null when demo disabled', () => {
      const { result } = renderHook(() => useDemoStats(), { wrapper });
      
      expect(result.current.getDemoStats()).toBeNull();
    });

    it('should calculate stats when demo enabled', () => {
      const { result: modeResult } = renderHook(() => useDemoMode(), { wrapper });
      const { result: statsResult } = renderHook(() => useDemoStats(), { wrapper });
      
      act(() => {
        modeResult.current.toggleDemo(true);
      });
      
      const stats = statsResult.current.getDemoStats();
      expect(stats).toBeDefined();
      expect(stats.totalTips).toBeGreaterThanOrEqual(0);
      expect(stats.platformStats).toBeDefined();
    });
  });

  describe('useDemoHistory', () => {
    it('should add demo tip', () => {
      const { result: modeResult } = renderHook(() => useDemoMode(), { wrapper });
      const { result: historyResult } = renderHook(() => useDemoHistory(), { wrapper });
      
      act(() => {
        modeResult.current.toggleDemo(true);
      });

      act(() => {
        historyResult.current.addDemoTip({
          recipient: 'SP...',
          amount: 100,
          message: 'Test',
        });
      });
      
      const history = historyResult.current.getDemoHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should clear demo history', () => {
      const { result: modeResult } = renderHook(() => useDemoMode(), { wrapper });
      const { result: historyResult } = renderHook(() => useDemoHistory(), { wrapper });
      
      act(() => {
        modeResult.current.toggleDemo(true);
      });

      act(() => {
        historyResult.current.clearDemoHistory();
      });
      
      const history = historyResult.current.getDemoHistory();
      expect(history).toHaveLength(0);
    });
  });
});
