import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecipientState } from '../hooks/useRecipientState';
import * as stacksPrincipalModule from '../lib/stacks-principal';

describe('useRecipientState', () => {
  const mockSenderAddress = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';
  const mockRecipient = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP';
  const mockContractRecipient = 'SP2RDS2YKXMFSP4H9Q5D1FXF5K5J91TH1P5KH3HVP.contract';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty recipient', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      expect(result.current.recipient).toBe('');
    });

    it('starts with no errors', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      expect(result.current.recipientError).toBe('');
      expect(result.current.blockedWarning).toBeNull();
    });

    it('starts with valid format', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      expect(result.current.isValidFormat).toBe(true);
    });
  });

  describe('recipient change handling', () => {
    it('updates recipient value', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.handleRecipientChange(mockRecipient);
      });

      expect(result.current.recipient).toBe(mockRecipient);
    });

    it('clears errors on change', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.setRecipientError('Previous error');
        result.current.handleRecipientChange(mockRecipient);
      });

      expect(result.current.recipientError).toBe('');
    });

    it('validates format on change', () => {
      vi.spyOn(stacksPrincipalModule, 'isValidStacksPrincipal').mockReturnValue(false);
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.handleRecipientChange('invalid');
      });

      expect(result.current.recipientError).toContain('valid Stacks principal');
    });
  });

  describe('self-tip detection', () => {
    it('detects self-tip', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.setRecipient(mockSenderAddress);
      });

      expect(result.current.isSelfTip).toBe(true);
    });

    it('detects non-self-tip', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.setRecipient(mockRecipient);
      });

      expect(result.current.isSelfTip).toBe(false);
    });

    it('handles whitespace in self-tip detection', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.setRecipient(`  ${mockSenderAddress}  `);
      });

      expect(result.current.isSelfTip).toBe(true);
    });
  });

  describe('contract detection', () => {
    it('detects contract principals', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(true);
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.setRecipient(mockContractRecipient);
      });

      expect(result.current.isContractAddress).toBe(true);
    });

    it('detects non-contract principals', () => {
      vi.spyOn(stacksPrincipalModule, 'isContractPrincipal').mockReturnValue(false);
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.setRecipient(mockRecipient);
      });

      expect(result.current.isContractAddress).toBe(false);
    });
  });

  describe('reset functionality', () => {
    it('resets all state', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.handleRecipientChange(mockRecipient);
        result.current.setRecipientError('Some error');
        result.current.setBlocked(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.recipient).toBe('');
      expect(result.current.recipientError).toBe('');
      expect(result.current.blockedWarning).toBeNull();
    });
  });

  describe('blocked status management', () => {
    it('sets blocked status', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.setBlocked(true);
      });

      expect(result.current.blockedWarning).toBe(true);
    });

    it('clears blocked status', () => {
      const { result } = renderHook(() => useRecipientState(mockSenderAddress));
      
      act(() => {
        result.current.setBlocked(true);
        result.current.setBlocked(false);
      });

      expect(result.current.blockedWarning).toBe(false);
    });
  });
});
