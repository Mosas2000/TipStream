import { describe, it, expect } from 'vitest';
import {
  calculateBlocksRemaining,
  isTimelockExpired,
  calculateEffectiveHeight,
  parsePauseProposal,
  canExecutePause,
  canCancelPause,
  canProposePause,
  getPauseDisplayStatus,
  getPauseDisplayMessage,
  getPauseErrorMessage,
  getPauseProposalSummary,
  validatePauseProposal,
  formatTimelockInfo,
  shouldAutoRefreshPauseStatus,
  TIMELOCK_BLOCKS
} from '../lib/pauseOperations';

describe('pauseOperations', () => {
  describe('calculateBlocksRemaining', () => {
    it('should calculate blocks remaining correctly', () => {
      expect(calculateBlocksRemaining(12100, 12000)).toBe(100);
    });

    it('should return 0 when timelock expired', () => {
      expect(calculateBlocksRemaining(12000, 12100)).toBe(0);
    });

    it('should return 0 for invalid inputs', () => {
      expect(calculateBlocksRemaining(null, 12000)).toBe(0);
      expect(calculateBlocksRemaining(12000, null)).toBe(0);
    });

    it('should handle exact timelock duration', () => {
      expect(calculateBlocksRemaining(12144, 12000)).toBe(144);
    });
  });

  describe('isTimelockExpired', () => {
    it('should return true when timelock expired', () => {
      expect(isTimelockExpired(12000, 12100)).toBe(true);
    });

    it('should return false when timelock pending', () => {
      expect(isTimelockExpired(12100, 12000)).toBe(false);
    });

    it('should return true at exact expiration', () => {
      expect(isTimelockExpired(12000, 12000)).toBe(true);
    });

    it('should return false for invalid inputs', () => {
      expect(isTimelockExpired(null, 12000)).toBe(false);
      expect(isTimelockExpired(12000, null)).toBe(false);
    });
  });

  describe('calculateEffectiveHeight', () => {
    it('should add TIMELOCK_BLOCKS to proposal height', () => {
      expect(calculateEffectiveHeight(12000)).toBe(12000 + TIMELOCK_BLOCKS);
    });

    it('should return 0 for null input', () => {
      expect(calculateEffectiveHeight(null)).toBe(0);
    });

    it('should calculate correct effective height', () => {
      expect(calculateEffectiveHeight(10000)).toBe(10144);
    });
  });

  describe('parsePauseProposal', () => {
    it('should parse valid proposal response', () => {
      const response = {
        ok: {
          pending: {
            some: {
              value: true,
              effectiveHeight: 12000
            }
          }
        }
      };

      const proposal = parsePauseProposal(response);
      expect(proposal).toEqual({
        value: true,
        effectiveHeight: 12000
      });
    });

    it('should return null when no proposal pending', () => {
      const response = {
        ok: {
          pending: {
            some: null
          }
        }
      };

      expect(parsePauseProposal(response)).toBeNull();
    });

    it('should return null for invalid response', () => {
      expect(parsePauseProposal(null)).toBeNull();
      expect(parsePauseProposal({ err: 'error' })).toBeNull();
    });
  });

  describe('canExecutePause', () => {
    it('should return true when ready', () => {
      const proposal = { value: true, effectiveHeight: 12000 };
      expect(canExecutePause(proposal, 12100)).toBe(true);
    });

    it('should return false when not ready', () => {
      const proposal = { value: true, effectiveHeight: 12100 };
      expect(canExecutePause(proposal, 12000)).toBe(false);
    });

    it('should return false when no proposal', () => {
      expect(canExecutePause(null, 12000)).toBe(false);
    });

    it('should return false when no current height', () => {
      const proposal = { value: true, effectiveHeight: 12000 };
      expect(canExecutePause(proposal, null)).toBe(false);
    });
  });

  describe('canCancelPause', () => {
    it('should return true when proposal exists', () => {
      const proposal = { value: true, effectiveHeight: 12000 };
      expect(canCancelPause(proposal)).toBe(true);
    });

    it('should return false when no proposal', () => {
      expect(canCancelPause(null)).toBe(false);
      expect(canCancelPause(undefined)).toBe(false);
    });
  });

  describe('canProposePause', () => {
    it('should return true when no proposal pending', () => {
      expect(canProposePause(null)).toBe(true);
      expect(canProposePause(undefined)).toBe(true);
    });

    it('should return false when proposal pending', () => {
      const proposal = { value: true, effectiveHeight: 12000 };
      expect(canProposePause(proposal)).toBe(false);
    });
  });

  describe('getPauseDisplayStatus', () => {
    it('should return running when not paused and no proposal', () => {
      expect(getPauseDisplayStatus(null, false, 12000)).toBe('running');
    });

    it('should return paused when paused and no proposal', () => {
      expect(getPauseDisplayStatus(null, true, 12000)).toBe('paused');
    });

    it('should return proposal-pending when timelock not expired', () => {
      const proposal = { value: true, effectiveHeight: 12100 };
      expect(getPauseDisplayStatus(proposal, false, 12000)).toBe('proposal-pending');
    });

    it('should return ready-to-execute when timelock expired', () => {
      const proposal = { value: true, effectiveHeight: 12000 };
      expect(getPauseDisplayStatus(proposal, false, 12100)).toBe('ready-to-execute');
    });
  });

  describe('getPauseDisplayMessage', () => {
    it('should return running message', () => {
      expect(getPauseDisplayMessage(null, false, 12000)).toBe('System Running');
    });

    it('should return paused message', () => {
      expect(getPauseDisplayMessage(null, true, 12000)).toBe('System Paused');
    });

    it('should include blocks remaining', () => {
      const proposal = { value: true, effectiveHeight: 12100 };
      const msg = getPauseDisplayMessage(proposal, false, 12000);
      expect(msg).toContain('100');
    });

    it('should indicate pause or unpause action', () => {
      const pauseProposal = { value: true, effectiveHeight: 12100 };
      const unpauseProposal = { value: false, effectiveHeight: 12100 };

      const pauseMsg = getPauseDisplayMessage(pauseProposal, false, 12000);
      const unpauseMsg = getPauseDisplayMessage(unpauseProposal, false, 12000);

      expect(pauseMsg.toLowerCase()).toContain('pause');
      expect(unpauseMsg.toLowerCase()).toContain('unpause');
    });
  });

  describe('getPauseErrorMessage', () => {
    it('should map no-pending-change error', () => {
      const msg = getPauseErrorMessage('no-pending-change');
      expect(msg).toContain('No pause proposal pending');
    });

    it('should map timelock-not-expired error', () => {
      const msg = getPauseErrorMessage('timelock-not-expired');
      expect(msg).toContain('Timelock period');
    });

    it('should map owner-only error', () => {
      const msg = getPauseErrorMessage('owner-only');
      expect(msg).toContain('Only contract owner');
    });

    it('should handle case insensitivity', () => {
      const msg = getPauseErrorMessage('NO-PENDING-CHANGE');
      expect(msg).toContain('No pause proposal pending');
    });

    it('should return default for unknown error', () => {
      expect(getPauseErrorMessage('unknown error')).toBeTruthy();
    });
  });

  describe('getPauseProposalSummary', () => {
    it('should return no-proposal summary when no proposal', () => {
      const summary = getPauseProposalSummary(null, false, 12000);
      expect(summary.type).toBe('no-proposal');
      expect(summary.currentState).toBe('running');
    });

    it('should return pending summary with blocks remaining', () => {
      const proposal = { value: true, effectiveHeight: 12100 };
      const summary = getPauseProposalSummary(proposal, false, 12000);

      expect(summary.type).toBe('pending');
      expect(summary.action).toBe('pause');
      expect(summary.blocksRemaining).toBe(100);
    });

    it('should return ready-to-execute summary', () => {
      const proposal = { value: true, effectiveHeight: 12000 };
      const summary = getPauseProposalSummary(proposal, false, 12100);

      expect(summary.type).toBe('ready-to-execute');
      expect(summary.action).toBe('pause');
    });

    it('should indicate unpause action', () => {
      const proposal = { value: false, effectiveHeight: 12100 };
      const summary = getPauseProposalSummary(proposal, true, 12000);

      expect(summary.action).toBe('unpause');
    });
  });

  describe('validatePauseProposal', () => {
    it('should accept valid pause proposal', () => {
      const validation = validatePauseProposal(true, false);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should accept valid unpause proposal', () => {
      const validation = validatePauseProposal(false, true);
      expect(validation.isValid).toBe(true);
    });

    it('should reject non-boolean values', () => {
      const validation = validatePauseProposal('true', false);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject no-op proposals', () => {
      const validation = validatePauseProposal(true, true);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('formatTimelockInfo', () => {
    it('should format timelock info with blocks and hours', () => {
      const proposal = { value: true, effectiveHeight: 12144 };
      const info = formatTimelockInfo(proposal, 12000);

      expect(info).toContain('144');
      expect(info).toContain('24');
    });

    it('should return empty string for invalid inputs', () => {
      expect(formatTimelockInfo(null, 12000)).toBe('');
      expect(formatTimelockInfo({ value: true }, null)).toBe('');
    });

    it('should calculate correct hour estimate', () => {
      const proposal = { value: true, effectiveHeight: 12072 };
      const info = formatTimelockInfo(proposal, 12000);

      expect(info).toContain('72');
      expect(info).toContain('12');
    });
  });

  describe('shouldAutoRefreshPauseStatus', () => {
    it('should return true when 12+ blocks elapsed', () => {
      expect(shouldAutoRefreshPauseStatus(
        { value: true },
        12012,
        12000
      )).toBe(true);
    });

    it('should return false when less than 12 blocks elapsed', () => {
      expect(shouldAutoRefreshPauseStatus(
        { value: true },
        12011,
        12000
      )).toBe(false);
    });

    it('should return false for invalid inputs', () => {
      expect(shouldAutoRefreshPauseStatus(null, 12000, 12000)).toBe(false);
      expect(shouldAutoRefreshPauseStatus({ value: true }, null, 12000)).toBe(false);
    });
  });

  describe('TIMELOCK_BLOCKS constant', () => {
    it('should be 144', () => {
      expect(TIMELOCK_BLOCKS).toBe(144);
    });
  });
});
