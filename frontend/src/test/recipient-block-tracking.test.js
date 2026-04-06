import { describe, it, expect } from 'vitest';
import {
  RECIPIENT_BLOCK_EVENTS,
  trackBlockedRecipientDetected,
  trackContractPrincipalDetected,
  trackBlockedSubmissionAttempted,
  trackBlockCheckCompleted,
  trackBlockCheckFailed,
  trackRecipientChanged,
} from '../lib/recipient-block-tracking';

describe('recipient-block-tracking', () => {
  const mockRecipient = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';

  describe('event constants', () => {
    it('defines all event types', () => {
      expect(RECIPIENT_BLOCK_EVENTS.BLOCKED_RECIPIENT_DETECTED).toBe('blocked_recipient_detected');
      expect(RECIPIENT_BLOCK_EVENTS.CONTRACT_PRINCIPAL_DETECTED).toBe('contract_principal_detected');
      expect(RECIPIENT_BLOCK_EVENTS.BLOCKED_SUBMISSION_ATTEMPTED).toBe('blocked_submission_attempted');
      expect(RECIPIENT_BLOCK_EVENTS.BLOCK_CHECK_COMPLETED).toBe('block_check_completed');
      expect(RECIPIENT_BLOCK_EVENTS.BLOCK_CHECK_FAILED).toBe('block_check_failed');
      expect(RECIPIENT_BLOCK_EVENTS.RECIPIENT_CHANGED).toBe('recipient_changed');
    });
  });

  describe('blocked recipient tracking', () => {
    it('tracks blocked recipient detection', () => {
      const event = trackBlockedRecipientDetected(mockRecipient);
      
      expect(event.event).toBe('blocked_recipient_detected');
      expect(event.recipient).toBe('SP2RDS2Y...3HVP');
      expect(event.timestamp).toBeDefined();
    });

    it('truncates recipient for privacy', () => {
      const event = trackBlockedRecipientDetected(mockRecipient);
      const truncated = event.recipient;
      
      expect(truncated.length).toBeLessThan(mockRecipient.length);
      expect(truncated).toContain('...');
    });

    it('handles null recipient gracefully', () => {
      const event = trackBlockedRecipientDetected(null);
      expect(event.event).toBe('blocked_recipient_detected');
      expect(event.timestamp).toBeDefined();
    });
  });

  describe('contract principal tracking', () => {
    it('tracks contract principal detection', () => {
      const event = trackContractPrincipalDetected(mockRecipient);
      
      expect(event.event).toBe('contract_principal_detected');
      expect(event.recipient).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });
  });

  describe('blocked submission tracking', () => {
    it('tracks blocked submission attempts', () => {
      const event = trackBlockedSubmissionAttempted(mockRecipient, 'RECIPIENT_BLOCKED');
      
      expect(event.event).toBe('blocked_submission_attempted');
      expect(event.reason).toBe('RECIPIENT_BLOCKED');
      expect(event.timestamp).toBeDefined();
    });

    it('includes reason for blocking', () => {
      const reasons = ['RECIPIENT_BLOCKED', 'CONTRACT_PRINCIPAL', 'OTHER'];
      
      reasons.forEach(reason => {
        const event = trackBlockedSubmissionAttempted(mockRecipient, reason);
        expect(event.reason).toBe(reason);
      });
    });
  });

  describe('block check tracking', () => {
    it('tracks successful block check', () => {
      const event = trackBlockCheckCompleted(mockRecipient, true);
      
      expect(event.event).toBe('block_check_completed');
      expect(event.isBlocked).toBe(true);
      expect(event.timestamp).toBeDefined();
    });

    it('tracks non-blocked result', () => {
      const event = trackBlockCheckCompleted(mockRecipient, false);
      
      expect(event.event).toBe('block_check_completed');
      expect(event.isBlocked).toBe(false);
    });

    it('tracks block check failures', () => {
      const error = new Error('Network error');
      const event = trackBlockCheckFailed(mockRecipient, error);
      
      expect(event.event).toBe('block_check_failed');
      expect(event.error).toContain('Network error');
      expect(event.timestamp).toBeDefined();
    });

    it('handles error objects and strings', () => {
      const errorObj = trackBlockCheckFailed(mockRecipient, new Error('Test error'));
      const errorStr = trackBlockCheckFailed(mockRecipient, 'Test error string');
      
      expect(errorObj.error).toBe('Test error');
      expect(errorStr.error).toBe('Test error string');
    });
  });

  describe('recipient change tracking', () => {
    it('tracks recipient change', () => {
      const event = trackRecipientChanged(mockRecipient);
      
      expect(event.event).toBe('recipient_changed');
      expect(event.recipient).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('tracks recipient cleared', () => {
      const event = trackRecipientChanged('');
      
      expect(event.recipient).toBe('cleared');
    });

    it('tracks recipient null', () => {
      const event = trackRecipientChanged(null);
      
      expect(event.recipient).toBe('cleared');
    });
  });

  describe('timestamp consistency', () => {
    it('all events include timestamp', () => {
      const events = [
        trackBlockedRecipientDetected(mockRecipient),
        trackContractPrincipalDetected(mockRecipient),
        trackBlockedSubmissionAttempted(mockRecipient, 'reason'),
        trackBlockCheckCompleted(mockRecipient, true),
        trackBlockCheckFailed(mockRecipient, 'error'),
        trackRecipientChanged(mockRecipient),
      ];

      events.forEach(event => {
        expect(event.timestamp).toBeDefined();
        expect(typeof event.timestamp).toBe('string');
      });
    });
  });
});
