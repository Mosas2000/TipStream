import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateRecipientRiskLevel,
  getRecipientValidationMessage,
  canProceedWithRecipient,
  isHighRiskRecipient,
} from '../lib/recipient-validation';
import * as stacksPrincipalModule from '../lib/stacks-principal';

describe('recipient-validation', () => {
  const validAddress = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';
  const contractAddress = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP.some-contract';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRecipientRiskLevel', () => {
    it('returns safe status for valid address with no block', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(false);
      const result = validateRecipientRiskLevel(validAddress, false);
      expect(result.isBlocked).toBe(false);
      expect(result.isContract).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns blocked status when recipient has blocked sender', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(false);
      const result = validateRecipientRiskLevel(validAddress, true);
      expect(result.isBlocked).toBe(true);
      expect(result.isContract).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.error).toContain('blocked you');
    });

    it('returns contract status for contract principal', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(true);
      const result = validateRecipientRiskLevel(contractAddress, false);
      expect(result.isBlocked).toBe(false);
      expect(result.isContract).toBe(true);
      expect(result.canProceed).toBe(false);
      expect(result.error).toContain('Contract principals cannot receive tips');
    });

    it('returns blocked status over contract status when both apply', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(true);
      const result = validateRecipientRiskLevel(contractAddress, true);
      expect(result.isBlocked).toBe(true);
      expect(result.isContract).toBe(true);
      expect(result.canProceed).toBe(false);
      expect(result.error).toContain('blocked you');
    });

    it('returns safe status for empty recipient', () => {
      const result = validateRecipientRiskLevel('', false);
      expect(result.isBlocked).toBe(false);
      expect(result.isContract).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns safe status for null recipient', () => {
      const result = validateRecipientRiskLevel(null, false);
      expect(result.isBlocked).toBe(false);
      expect(result.isContract).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.error).toBeNull();
    });

    it('trims whitespace from recipient', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(false);
      const result = validateRecipientRiskLevel(`  ${validAddress}  `, false);
      expect(result.canProceed).toBe(true);
    });
  });

  describe('getRecipientValidationMessage', () => {
    it('returns null for safe recipient', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(false);
      const message = getRecipientValidationMessage(validAddress, false);
      expect(message).toBeNull();
    });

    it('returns blocked message when recipient has blocked sender', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(false);
      const message = getRecipientValidationMessage(validAddress, true);
      expect(message).toContain('blocked you');
    });

    it('returns contract message for contract principal', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(true);
      const message = getRecipientValidationMessage(contractAddress, false);
      expect(message).toContain('Contract principals');
    });
  });

  describe('canProceedWithRecipient', () => {
    it('returns true for safe recipient', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(false);
      expect(canProceedWithRecipient(validAddress, false)).toBe(true);
    });

    it('returns false for blocked recipient', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(false);
      expect(canProceedWithRecipient(validAddress, true)).toBe(false);
    });

    it('returns false for contract principal', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(true);
      expect(canProceedWithRecipient(contractAddress, false)).toBe(false);
    });

    it('returns false when both blocked and contract', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(true);
      expect(canProceedWithRecipient(contractAddress, true)).toBe(false);
    });
  });

  describe('isHighRiskRecipient', () => {
    it('returns false for safe recipient', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(false);
      expect(isHighRiskRecipient(validAddress, false)).toBe(false);
    });

    it('returns true for blocked recipient', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(false);
      expect(isHighRiskRecipient(validAddress, true)).toBe(true);
    });

    it('returns true for contract principal', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(true);
      expect(isHighRiskRecipient(contractAddress, false)).toBe(true);
    });

    it('returns true when both blocked and contract', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(true);
      expect(isHighRiskRecipient(contractAddress, true)).toBe(true);
    });
  });
});
