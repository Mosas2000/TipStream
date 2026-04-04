import { describe, it, expect, vi } from 'vitest';
import {
  validateRecipientBatch,
  filterValidRecipients,
  filterHighRiskRecipients,
  getRecipientValidationStats,
  groupRecipientsByRiskLevel,
} from '../lib/recipient-batch-validation';

describe('recipient-batch-validation', () => {
  const validRecipient = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';
  const invalidRecipient = 'INVALID_ADDRESS';

  describe('validateRecipientBatch', () => {
    it('validates multiple recipients', async () => {
      const recipients = [validRecipient, invalidRecipient];
      const results = await validateRecipientBatch(recipients);

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
    });

    it('includes validation results for each recipient', async () => {
      const results = await validateRecipientBatch([validRecipient]);

      expect(results[0]).toHaveProperty('recipient');
      expect(results[0]).toHaveProperty('isValid');
      expect(results[0]).toHaveProperty('isContract');
      expect(results[0]).toHaveProperty('isBlocked');
      expect(results[0]).toHaveProperty('canProceed');
      expect(results[0]).toHaveProperty('isHighRisk');
      expect(results[0]).toHaveProperty('errors');
    });

    it('normalizes recipient addresses', async () => {
      const recipients = [`  ${validRecipient}  `];
      const results = await validateRecipientBatch(recipients);

      expect(results[0].recipient).toBe(validRecipient);
    });

    it('handles block status checking', async () => {
      const mockCheckBlock = vi.fn().mockResolvedValue(true);
      const recipients = [validRecipient];
      const results = await validateRecipientBatch(recipients, mockCheckBlock);

      expect(results[0].isBlocked).toBe(true);
      expect(results[0].canProceed).toBe(false);
    });

    it('generates error details', async () => {
      const recipients = [invalidRecipient];
      const results = await validateRecipientBatch(recipients);

      expect(results[0].errors).toBeDefined();
      expect(results[0].errors.length).toBeGreaterThan(0);
    });

    it('handles empty recipient list', async () => {
      const results = await validateRecipientBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('filterValidRecipients', () => {
    it('filters recipients that can proceed', () => {
      const results = [
        { canProceed: true },
        { canProceed: false },
        { canProceed: true },
      ];

      const filtered = filterValidRecipients(results);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('filterHighRiskRecipients', () => {
    it('filters high-risk recipients', () => {
      const results = [
        { isHighRisk: true },
        { isHighRisk: false },
        { isHighRisk: true },
      ];

      const filtered = filterHighRiskRecipients(results);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('getRecipientValidationStats', () => {
    it('calculates validation statistics', () => {
      const results = [
        { isValid: true, isContract: false, isBlocked: false, canProceed: true, isHighRisk: false },
        { isValid: true, isContract: true, isBlocked: false, canProceed: false, isHighRisk: true },
        { isValid: false, isContract: false, isBlocked: false, canProceed: false, isHighRisk: false },
        { isValid: true, isContract: false, isBlocked: true, canProceed: false, isHighRisk: true },
      ];

      const stats = getRecipientValidationStats(results);

      expect(stats.total).toBe(4);
      expect(stats.valid).toBe(3);
      expect(stats.invalid).toBe(1);
      expect(stats.contracts).toBe(1);
      expect(stats.blocked).toBe(1);
      expect(stats.canProceed).toBe(1);
      expect(stats.highRisk).toBe(2);
    });

    it('handles empty results', () => {
      const stats = getRecipientValidationStats([]);

      expect(stats.total).toBe(0);
      expect(stats.valid).toBe(0);
      expect(stats.invalid).toBe(0);
      expect(stats.contracts).toBe(0);
      expect(stats.blocked).toBe(0);
      expect(stats.canProceed).toBe(0);
      expect(stats.highRisk).toBe(0);
    });
  });

  describe('groupRecipientsByRiskLevel', () => {
    it('groups recipients by risk level', () => {
      const results = [
        { canProceed: true, isHighRisk: false, isBlocked: false, isContract: false, isValid: true },
        { canProceed: false, isHighRisk: true, isBlocked: true, isContract: false, isValid: true },
        { canProceed: false, isHighRisk: true, isBlocked: false, isContract: true, isValid: true },
        { canProceed: false, isHighRisk: false, isBlocked: false, isContract: false, isValid: false },
      ];

      const grouped = groupRecipientsByRiskLevel(results);

      expect(grouped.safe).toHaveLength(1);
      expect(grouped.blocked).toHaveLength(1);
      expect(grouped.contracts).toHaveLength(1);
      expect(grouped.invalid).toHaveLength(1);
    });

    it('handles overlapping risk categories', () => {
      const results = [
        { canProceed: true, isHighRisk: false, isBlocked: false, isContract: false, isValid: true },
        { canProceed: false, isHighRisk: true, isBlocked: false, isContract: false, isValid: true },
      ];

      const grouped = groupRecipientsByRiskLevel(results);

      expect(grouped.safe).toHaveLength(1);
      expect(grouped.blocked).toHaveLength(0);
    });
  });
});
