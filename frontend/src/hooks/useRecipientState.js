/**
 * @module hooks/useRecipientState
 *
 * Hook for managing recipient address input state with live validation.
 *
 * Centralises address format checking, self-tip detection, contract address
 * detection, and high-risk recipient flagging so that multiple send-tip
 * form variants can share a single source of truth.
 */

import { useState, useCallback, useMemo } from 'react';
import { isValidStacksPrincipal, isContractPrincipal } from '../lib/stacks-principal';
import { canProceedWithRecipient, getRecipientValidationMessage } from '../lib/recipient-validation';

/**
 * Hook for managing recipient address input state with live validation.
 *
 * @param {string|null} senderAddress - The connected wallet address used to detect self-tips.
 * @returns {Object} result
 * @returns {string} result.recipient - Current recipient address value.
 * @returns {Function} result.setRecipient - Directly set the recipient without triggering validation.
 * @returns {Function} result.handleRecipientChange - Set recipient and run inline validation.
 * @returns {string} result.recipientError - Inline validation error message, or empty string.
 * @returns {Function} result.setRecipientError - Directly set an error message.
 * @returns {boolean|null} result.blockedWarning - Block check result from useBlockCheck.
 * @returns {Function} result.setBlocked - Update the blocked warning state.
 * @returns {boolean} result.isValidFormat - Whether the current value is a valid Stacks principal.
 * @returns {boolean} result.isSelfTip - Whether recipient matches the sender address.
 * @returns {boolean} result.isContractAddress - Whether recipient is a contract principal.
 * @returns {boolean} result.isHighRisk - Whether the recipient is flagged as high risk.
 * @returns {string|null} result.validationMessage - User-facing message from recipient validation.
 * @returns {Function} result.reset - Clear all recipient state back to initial values.
 */

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
