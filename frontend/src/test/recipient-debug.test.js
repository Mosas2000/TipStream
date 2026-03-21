import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  debugLog,
  debugError,
  debugBlockCheckInitiated,
  debugBlockCheckCompleted,
  debugBlockCheckFailed,
  debugValidationStateChanged,
  debugSubmissionAttempt,
  truncateAddress,
  enableDebugMode,
  disableDebugMode,
  getDebugStats,
} from '../lib/recipient-debug';

describe('recipient-debug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('truncateAddress', () => {
    it('truncates long address', () => {
      const address = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';
      const truncated = truncateAddress(address);

      expect(truncated).toContain('...');
      expect(truncated).toContain('SP2R');
      expect(truncated).toContain('3HVP');
    });

    it('handles short address', () => {
      const truncated = truncateAddress('SPTEST');
      expect(truncated).toBeDefined();
    });

    it('handles empty address', () => {
      const truncated = truncateAddress('');
      expect(truncated).toBe('...');
    });

    it('handles null address', () => {
      const truncated = truncateAddress(null);
      expect(truncated).toBe('');
    });
  });

  describe('debug logging', () => {
    it('logs debug messages', () => {
      debugLog('Test message', { key: 'value' });
      expect(console.log).toHaveBeenCalled();
    });

    it('logs errors', () => {
      debugError('Test error');
      expect(console.error).toHaveBeenCalled();
    });

    it('logs block check lifecycle', () => {
      const address = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';

      debugBlockCheckInitiated(address);
      expect(console.log).toHaveBeenCalled();

      debugBlockCheckCompleted(address, true, 100);
      expect(console.log).toHaveBeenCalled();

      debugBlockCheckFailed(address, new Error('Test error'));
      expect(console.error).toHaveBeenCalled();
    });

    it('logs validation state changes', () => {
      debugValidationStateChanged({
        recipient: 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP',
        isValid: true,
        isHighRisk: false,
        isBlocked: false,
        isContract: false,
      });

      expect(console.log).toHaveBeenCalled();
    });

    it('logs submission attempts', () => {
      const address = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';

      debugSubmissionAttempt(address, true, 'recipient is safe');
      expect(console.log).toHaveBeenCalled();

      debugSubmissionAttempt(address, false, 'recipient is blocked');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('debug mode control', () => {
    it('enables debug mode', () => {
      enableDebugMode();
      expect(console.log).toHaveBeenCalledWith('Recipient validation debug mode enabled');
    });

    it('disables debug mode', () => {
      disableDebugMode();
      expect(console.log).toHaveBeenCalledWith('Recipient validation debug mode disabled');
    });

    it('provides debug stats', () => {
      const stats = getDebugStats();

      expect(stats).toHaveProperty('debugEnabled');
      expect(stats).toHaveProperty('debugKey');
      expect(stats).toHaveProperty('browserEnv');
    });
  });

  describe('data privacy', () => {
    it('truncates addresses in debug output', () => {
      const address = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';
      debugBlockCheckInitiated(address);

      const callArgs = console.log.mock.calls[0];
      const logData = callArgs[1];
      
      expect(logData.recipient).toBe(truncateAddress(address));
      expect(logData.recipient).not.toBe(address);
    });

    it('does not log full addresses', () => {
      const address = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';
      debugValidationStateChanged({
        recipient: address,
        isValid: true,
        isHighRisk: false,
        isBlocked: false,
        isContract: false,
      });

      const callArgs = console.log.mock.calls[0];
      const logData = callArgs[1];
      
      expect(logData.recipient).not.toBe(address);
    });
  });
});
