import { describe, it, expect } from 'vitest';
import {
  RECIPIENT_ERRORS,
  getRecipientErrorCode,
  getRecipientErrorMessage,
  getRecipientErrorSeverity,
  formatRecipientError,
  isBlockingError,
  isWarningError,
} from '../lib/recipient-errors';

describe('recipient-errors', () => {
  describe('error constants', () => {
    it('defines blocked recipient error', () => {
      expect(RECIPIENT_ERRORS.BLOCKED).toBeDefined();
      expect(RECIPIENT_ERRORS.BLOCKED.code).toBe('RECIPIENT_BLOCKED');
      expect(RECIPIENT_ERRORS.BLOCKED.severity).toBe('error');
    });

    it('defines contract principal error', () => {
      expect(RECIPIENT_ERRORS.CONTRACT_PRINCIPAL).toBeDefined();
      expect(RECIPIENT_ERRORS.CONTRACT_PRINCIPAL.code).toBe('CONTRACT_PRINCIPAL');
      expect(RECIPIENT_ERRORS.CONTRACT_PRINCIPAL.severity).toBe('error');
    });

    it('defines self-tip warning', () => {
      expect(RECIPIENT_ERRORS.SELF_TIP).toBeDefined();
      expect(RECIPIENT_ERRORS.SELF_TIP.code).toBe('SELF_TIP');
      expect(RECIPIENT_ERRORS.SELF_TIP.severity).toBe('warning');
    });

    it('defines invalid format warning', () => {
      expect(RECIPIENT_ERRORS.INVALID_FORMAT).toBeDefined();
      expect(RECIPIENT_ERRORS.INVALID_FORMAT.code).toBe('INVALID_FORMAT');
      expect(RECIPIENT_ERRORS.INVALID_FORMAT.severity).toBe('warning');
    });
  });

  describe('getRecipientErrorCode', () => {
    it('returns BLOCKED code when recipient is blocked', () => {
      const code = getRecipientErrorCode('some-recipient', true, false);
      expect(code).toBe('RECIPIENT_BLOCKED');
    });

    it('returns CONTRACT code when contract principal', () => {
      const code = getRecipientErrorCode('some-contract', false, true);
      expect(code).toBe('CONTRACT_PRINCIPAL');
    });

    it('prioritizes blocked status over contract status', () => {
      const code = getRecipientErrorCode('some-contract', true, true);
      expect(code).toBe('RECIPIENT_BLOCKED');
    });

    it('returns null when no error conditions', () => {
      const code = getRecipientErrorCode('safe-recipient', false, false);
      expect(code).toBeNull();
    });
  });

  describe('getRecipientErrorMessage', () => {
    it('returns message for blocked error', () => {
      const message = getRecipientErrorMessage('RECIPIENT_BLOCKED');
      expect(message).toContain('blocked');
    });

    it('returns message for contract error', () => {
      const message = getRecipientErrorMessage('CONTRACT_PRINCIPAL');
      expect(message).toContain('Contract');
    });

    it('returns null for unknown error code', () => {
      const message = getRecipientErrorMessage('UNKNOWN_ERROR');
      expect(message).toBeNull();
    });

    it('returns null for null error code', () => {
      const message = getRecipientErrorMessage(null);
      expect(message).toBeNull();
    });
  });

  describe('getRecipientErrorSeverity', () => {
    it('returns error severity for blocking errors', () => {
      expect(getRecipientErrorSeverity('RECIPIENT_BLOCKED')).toBe('error');
      expect(getRecipientErrorSeverity('CONTRACT_PRINCIPAL')).toBe('error');
    });

    it('returns warning severity for warning errors', () => {
      expect(getRecipientErrorSeverity('SELF_TIP')).toBe('warning');
      expect(getRecipientErrorSeverity('INVALID_FORMAT')).toBe('warning');
    });

    it('returns warning for unknown error code', () => {
      expect(getRecipientErrorSeverity('UNKNOWN')).toBe('warning');
    });
  });

  describe('formatRecipientError', () => {
    it('formats error with all fields', () => {
      const recipient = '  SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP  ';
      const error = formatRecipientError(recipient, 'RECIPIENT_BLOCKED');

      expect(error.recipient).toBe('SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP');
      expect(error.errorCode).toBe('RECIPIENT_BLOCKED');
      expect(error.message).toBeDefined();
      expect(error.severity).toBe('error');
      expect(error.timestamp).toBeDefined();
    });

    it('returns null for unknown error code', () => {
      const error = formatRecipientError('recipient', 'UNKNOWN');
      expect(error).toBeNull();
    });

    it('trims recipient address', () => {
      const error = formatRecipientError('  address  ', 'SELF_TIP');
      expect(error.recipient).toBe('address');
    });
  });

  describe('isBlockingError', () => {
    it('identifies blocking errors', () => {
      expect(isBlockingError('RECIPIENT_BLOCKED')).toBe(true);
      expect(isBlockingError('CONTRACT_PRINCIPAL')).toBe(true);
    });

    it('identifies non-blocking errors', () => {
      expect(isBlockingError('SELF_TIP')).toBe(false);
      expect(isBlockingError('INVALID_FORMAT')).toBe(false);
    });

    it('handles unknown errors', () => {
      expect(isBlockingError('UNKNOWN')).toBe(false);
    });
  });

  describe('isWarningError', () => {
    it('identifies warning errors', () => {
      expect(isWarningError('SELF_TIP')).toBe(true);
      expect(isWarningError('INVALID_FORMAT')).toBe(true);
    });

    it('identifies non-warning errors', () => {
      expect(isWarningError('RECIPIENT_BLOCKED')).toBe(false);
      expect(isWarningError('CONTRACT_PRINCIPAL')).toBe(false);
    });

    it('handles unknown errors', () => {
      expect(isWarningError('UNKNOWN')).toBe(false);
    });
  });
});
