import { useState, useCallback, useMemo } from 'react';
import { isValidStacksPrincipal, isContractPrincipal } from '../lib/stacks-principal';
import { canProceedWithRecipient, getRecipientValidationMessage } from '../lib/recipient-validation';

export function useRecipientState(senderAddress) {
  const [recipient, setRecipient] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [blockedWarning, setBlockedWarning] = useState(null);

  const isValidFormat = useMemo(() => {
    if (!recipient) return true;
    return isValidStacksPrincipal(recipient);
  }, [recipient]);

  const isSelfTip = useMemo(() => {
    if (!recipient || !senderAddress) return false;
    return recipient.trim() === senderAddress;
  }, [recipient, senderAddress]);

  const isContractAddress = useMemo(() => {
    if (!recipient) return false;
    return isContractPrincipal(recipient);
  }, [recipient]);

  const isHighRisk = useMemo(() => {
    return !canProceedWithRecipient(recipient, blockedWarning);
  }, [recipient, blockedWarning]);

  const validationMessage = useMemo(() => {
    return getRecipientValidationMessage(recipient, blockedWarning);
  }, [recipient, blockedWarning]);

  const handleRecipientChange = useCallback((value) => {
    setRecipient(value);
    setRecipientError('');
    setBlockedWarning(null);

    if (value && !isValidStacksPrincipal(value)) {
      setRecipientError('Enter a valid Stacks principal (SP... or SP....contract-name)');
    }
  }, []);

  const setBlocked = useCallback((isBlocked) => {
    setBlockedWarning(isBlocked);
  }, []);

  const reset = useCallback(() => {
    setRecipient('');
    setRecipientError('');
    setBlockedWarning(null);
  }, []);

  return {
    recipient,
    setRecipient,
    handleRecipientChange,
    recipientError,
    setRecipientError,
    blockedWarning,
    setBlocked,
    isValidFormat,
    isSelfTip,
    isContractAddress,
    isHighRisk,
    validationMessage,
    reset,
  };
}
