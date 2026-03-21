import { describe, it, expect } from 'vitest';
import {
  ARIA_LABELS,
  ARIA_DESCRIPTIONS,
  ARIA_LIVE_REGIONS,
  createRecipientErrorAriaLabel,
  createRecipientStatusAriaLabel,
  getAccessibilityAttributes,
  getSendButtonAccessibilityAttributes,
} from '../lib/recipient-accessibility';

describe('recipient-accessibility', () => {
  describe('ARIA constants', () => {
    it('defines ARIA labels', () => {
      expect(ARIA_LABELS.RECIPIENT_INPUT).toBeDefined();
      expect(ARIA_LABELS.RECIPIENT_ERROR).toBeDefined();
      expect(ARIA_LABELS.SEND_BUTTON).toBeDefined();
    });

    it('defines ARIA descriptions', () => {
      expect(ARIA_DESCRIPTIONS.BLOCKED_RECIPIENT).toBeDefined();
      expect(ARIA_DESCRIPTIONS.CONTRACT_PRINCIPAL).toBeDefined();
    });

    it('defines ARIA live regions', () => {
      expect(ARIA_LIVE_REGIONS.VALIDATION_STATUS).toBe('polite');
      expect(ARIA_LIVE_REGIONS.ERROR_NOTIFICATION).toBe('assertive');
    });
  });

  describe('error ARIA labels', () => {
    it('creates label for blocked recipient', () => {
      const label = createRecipientErrorAriaLabel('BLOCKED');
      expect(label).toContain('blocked');
    });

    it('creates label for contract principal', () => {
      const label = createRecipientErrorAriaLabel('CONTRACT');
      expect(label).toContain('Contract');
    });

    it('creates label for invalid format', () => {
      const label = createRecipientErrorAriaLabel('INVALID');
      expect(label).toContain('Invalid');
    });

    it('creates label for self-tip', () => {
      const label = createRecipientErrorAriaLabel('SELF_TIP');
      expect(label).toContain('yourself');
    });

    it('returns default label for unknown error', () => {
      const label = createRecipientErrorAriaLabel('UNKNOWN');
      expect(label).toBe('Validation error');
    });
  });

  describe('status ARIA labels', () => {
    it('creates label for blocked recipient', () => {
      const label = createRecipientStatusAriaLabel(true, false);
      expect(label).toContain('blocked');
    });

    it('creates label for contract principal', () => {
      const label = createRecipientStatusAriaLabel(false, true);
      expect(label).toContain('contract');
    });

    it('creates label for valid recipient', () => {
      const label = createRecipientStatusAriaLabel(false, false);
      expect(label).toContain('valid');
    });

    it('prioritizes blocked status over contract status', () => {
      const label = createRecipientStatusAriaLabel(true, true);
      expect(label).toContain('blocked');
    });
  });

  describe('accessibility attributes', () => {
    it('sets aria-invalid for high-risk recipients', () => {
      const attrs = getAccessibilityAttributes(true, 'Error message');
      expect(attrs['aria-invalid']).toBe('true');
    });

    it('clears aria-invalid for safe recipients', () => {
      const attrs = getAccessibilityAttributes(false, null);
      expect(attrs['aria-invalid']).toBe('false');
    });

    it('sets aria-live for high-risk recipients', () => {
      const attrs = getAccessibilityAttributes(true, 'Error message');
      expect(attrs['aria-live']).toBe('assertive');
    });

    it('omits aria-live for safe recipients', () => {
      const attrs = getAccessibilityAttributes(false, null);
      expect(attrs['aria-live']).toBeUndefined();
    });

    it('sets aria-describedby when error present', () => {
      const attrs = getAccessibilityAttributes(true, 'Error message');
      expect(attrs['aria-describedby']).toBe('recipient-error-message');
    });

    it('omits aria-describedby when no error', () => {
      const attrs = getAccessibilityAttributes(false, null);
      expect(attrs['aria-describedby']).toBeUndefined();
    });
  });

  describe('button accessibility attributes', () => {
    it('sets aria-disabled for disabled button', () => {
      const attrs = getSendButtonAccessibilityAttributes(true, 'High-risk recipient');
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('sets aria-disabled false for enabled button', () => {
      const attrs = getSendButtonAccessibilityAttributes(false, null);
      expect(attrs['aria-disabled']).toBe('false');
    });

    it('includes reason in aria-label', () => {
      const attrs = getSendButtonAccessibilityAttributes(true, 'High-risk recipient');
      expect(attrs['aria-label']).toContain('High-risk recipient');
    });

    it('uses default aria-label when no reason', () => {
      const attrs = getSendButtonAccessibilityAttributes(false, null);
      expect(attrs['aria-label']).toBe('Send tip button');
    });

    it('sets title attribute', () => {
      const attrs = getSendButtonAccessibilityAttributes(true, 'Reason');
      expect(attrs.title).toBe('Reason');
    });
  });

  describe('compliance', () => {
    it('follows WAI-ARIA practices', () => {
      const attrs = getAccessibilityAttributes(true, 'Error');
      expect(Object.keys(attrs).every(key => key.startsWith('aria-'))).toBe(true);
    });

    it('supports screen reader announcements', () => {
      expect(ARIA_LIVE_REGIONS.VALIDATION_STATUS).toBe('polite');
      expect(ARIA_LIVE_REGIONS.ERROR_NOTIFICATION).toBe('assertive');
    });
  });
});
