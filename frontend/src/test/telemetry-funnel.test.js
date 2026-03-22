import { describe, it, expect } from 'vitest';
import {
  computeTipFunnel,
  computeBatchFunnel,
  computeWalletDropOff,
  identifyDropOffPoints,
  getFunnelBarWidth,
  getFunnelStageColor,
} from '../lib/telemetry-funnel';

describe('telemetry-funnel', () => {
  describe('computeTipFunnel', () => {
    it('computes funnel stages from summary', () => {
      const summary = {
        walletConnections: 100,
        tipsStarted: 80,
        tipsSubmitted: 60,
        tipsConfirmed: 50,
        tipsCancelled: 5,
        tipsFailed: 5,
      };

      const result = computeTipFunnel(summary);
      expect(result.stages).toHaveLength(4);
      expect(result.stages[0].id).toBe('wallet');
      expect(result.stages[0].count).toBe(100);
      expect(result.stages[3].id).toBe('confirmed');
      expect(result.stages[3].count).toBe(50);
    });

    it('calculates drop-off percentages correctly', () => {
      const summary = {
        walletConnections: 100,
        tipsStarted: 80,
        tipsSubmitted: 60,
        tipsConfirmed: 50,
      };

      const result = computeTipFunnel(summary);
      expect(result.stages[1].dropOffPercent).toBe(20);
      expect(result.stages[2].dropOffPercent).toBe(25);
    });

    it('calculates overall conversion rate', () => {
      const summary = {
        walletConnections: 100,
        tipsStarted: 80,
        tipsSubmitted: 60,
        tipsConfirmed: 50,
      };

      const result = computeTipFunnel(summary);
      expect(result.overallConversion).toBe('50.0');
    });

    it('calculates start to finish conversion', () => {
      const summary = {
        walletConnections: 100,
        tipsStarted: 80,
        tipsSubmitted: 60,
        tipsConfirmed: 40,
      };

      const result = computeTipFunnel(summary);
      expect(result.startToFinish).toBe('50.0');
    });

    it('handles zero wallet connections', () => {
      const summary = {
        walletConnections: 0,
        tipsStarted: 0,
        tipsSubmitted: 0,
        tipsConfirmed: 0,
      };

      const result = computeTipFunnel(summary);
      expect(result.overallConversion).toBe('0.0');
    });

    it('includes cancelled and failed counts', () => {
      const summary = {
        walletConnections: 100,
        tipsStarted: 80,
        tipsSubmitted: 60,
        tipsConfirmed: 50,
        tipsCancelled: 5,
        tipsFailed: 5,
      };

      const result = computeTipFunnel(summary);
      expect(result.cancelled).toBe(5);
      expect(result.failed).toBe(5);
    });
  });

  describe('computeBatchFunnel', () => {
    it('computes batch funnel stages', () => {
      const summary = {
        batchTipsStarted: 50,
        batchTipsSubmitted: 40,
        batchTipsConfirmed: 35,
        batchTipsCancelled: 2,
        batchTipsFailed: 3,
        averageBatchSize: '3.5',
      };

      const result = computeBatchFunnel(summary);
      expect(result.stages).toHaveLength(3);
      expect(result.stages[0].count).toBe(50);
      expect(result.stages[2].count).toBe(35);
    });

    it('calculates batch conversion rate', () => {
      const summary = {
        batchTipsStarted: 50,
        batchTipsSubmitted: 40,
        batchTipsConfirmed: 35,
      };

      const result = computeBatchFunnel(summary);
      expect(result.overallConversion).toBe('70.0');
    });

    it('includes average batch size', () => {
      const summary = {
        batchTipsStarted: 50,
        batchTipsSubmitted: 40,
        batchTipsConfirmed: 35,
        averageBatchSize: '4.2',
      };

      const result = computeBatchFunnel(summary);
      expect(result.averageBatchSize).toBe('4.2');
    });

    it('handles zero batch tips', () => {
      const summary = {
        batchTipsStarted: 0,
        batchTipsSubmitted: 0,
        batchTipsConfirmed: 0,
      };

      const result = computeBatchFunnel(summary);
      expect(result.overallConversion).toBe('0.0');
    });
  });

  describe('computeWalletDropOff', () => {
    it('computes wallet metrics', () => {
      const summary = {
        walletConnections: 100,
        walletDisconnections: 20,
      };

      const result = computeWalletDropOff(summary);
      expect(result.connections).toBe(100);
      expect(result.disconnections).toBe(20);
      expect(result.netConnections).toBe(80);
    });

    it('calculates retention rate', () => {
      const summary = {
        walletConnections: 100,
        walletDisconnections: 20,
      };

      const result = computeWalletDropOff(summary);
      expect(result.retentionRate).toBe('80.0');
    });

    it('calculates drop-off rate', () => {
      const summary = {
        walletConnections: 100,
        walletDisconnections: 25,
      };

      const result = computeWalletDropOff(summary);
      expect(result.dropOffRate).toBe('25.0');
    });

    it('handles zero connections', () => {
      const summary = {
        walletConnections: 0,
        walletDisconnections: 0,
      };

      const result = computeWalletDropOff(summary);
      expect(result.retentionRate).toBe('100.0');
      expect(result.dropOffRate).toBe('0.0');
    });

    it('falls back to rawMetrics if top-level fields missing', () => {
      const summary = {
        rawMetrics: {
          walletConnections: 50,
          walletDisconnections: 10,
        },
      };

      const result = computeWalletDropOff(summary);
      expect(result.connections).toBe(50);
      expect(result.disconnections).toBe(10);
    });
  });

  describe('identifyDropOffPoints', () => {
    it('identifies high severity drop-offs', () => {
      const funnel = {
        stages: [
          { id: 'wallet', count: 100, dropOff: 0, dropOffPercent: 0 },
          { id: 'started', count: 40, dropOff: 60, dropOffPercent: 60 },
        ],
      };

      const issues = identifyDropOffPoints(funnel);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('high');
      expect(issues[0].stage).toBe('started');
    });

    it('identifies medium severity drop-offs', () => {
      const funnel = {
        stages: [
          { id: 'wallet', count: 100, dropOff: 0, dropOffPercent: 0 },
          { id: 'started', count: 70, dropOff: 30, dropOffPercent: 30 },
        ],
      };

      const issues = identifyDropOffPoints(funnel);
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('medium');
    });

    it('returns empty array for low drop-offs', () => {
      const funnel = {
        stages: [
          { id: 'wallet', count: 100, dropOff: 0, dropOffPercent: 0 },
          { id: 'started', count: 90, dropOff: 10, dropOffPercent: 10 },
        ],
      };

      const issues = identifyDropOffPoints(funnel);
      expect(issues).toHaveLength(0);
    });

    it('includes message describing the issue', () => {
      const funnel = {
        stages: [
          { id: 'wallet', count: 100, dropOff: 0, dropOffPercent: 0 },
          { id: 'started', label: 'Tip Started', count: 40, dropOff: 60, dropOffPercent: 60 },
        ],
      };

      const issues = identifyDropOffPoints(funnel);
      expect(issues[0].message).toContain('60.0%');
      expect(issues[0].message).toContain('Tip Started');
    });
  });

  describe('getFunnelBarWidth', () => {
    it('returns percentage width based on max count', () => {
      expect(getFunnelBarWidth(50, 100)).toBe(50);
      expect(getFunnelBarWidth(75, 100)).toBe(75);
    });

    it('returns minimum width of 10', () => {
      expect(getFunnelBarWidth(1, 100)).toBe(10);
    });

    it('handles max count of 0', () => {
      expect(getFunnelBarWidth(50, 0)).toBe(0);
    });

    it('returns 100 for equal count and max', () => {
      expect(getFunnelBarWidth(100, 100)).toBe(100);
    });
  });

  describe('getFunnelStageColor', () => {
    it('returns different colors for different stages', () => {
      const color0 = getFunnelStageColor(0, 4);
      const color1 = getFunnelStageColor(1, 4);
      const color2 = getFunnelStageColor(2, 4);

      expect(color0).not.toBe(color1);
      expect(color1).not.toBe(color2);
    });

    it('returns valid Tailwind color classes', () => {
      const color = getFunnelStageColor(0, 4);
      expect(color).toMatch(/bg-\w+-\d+/);
    });

    it('handles index out of range', () => {
      const color = getFunnelStageColor(10, 4);
      expect(color).toBeDefined();
      expect(color).toMatch(/bg-\w+-\d+/);
    });
  });
});
