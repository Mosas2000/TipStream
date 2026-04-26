/**
 * @module hooks/useBlockCheckEnhanced
 *
 * Enhanced hook for checking whether the current user is blocked by a recipient.
 *
 * Extends useBlockCheck with principal validation, result caching per
 * recipient, and a readiness flag that consumers can use to gate UI actions
 * until the check has settled.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchCallReadOnlyFunction, cvToJSON, principalCV } from '@stacks/transactions';
import { network, getSenderAddress } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_IS_USER_BLOCKED } from '../config/contracts';
import { isValidStacksPrincipal } from '../lib/stacks-principal';

/**
 * @returns {Object} result
 * @returns {boolean|null} result.blocked - Block state; null means not yet determined.
 * @returns {boolean} result.checking - Whether a block check is currently in progress.
 * @returns {Function} result.checkBlocked - Trigger a block check for a recipient address.
 * @returns {Function} result.reset - Cancel pending requests and reset all state.
 * @returns {string|null} result.lastCheckedRecipient - The most recently checked principal.
 * @returns {boolean} result.isReadyForValidation - True when a settled result is available.
 */

export function useBlockCheckEnhanced() {
  const [blocked, setBlocked] = useState(null);
  const [checking, setChecking] = useState(false);
  const [lastCheckedRecipient, setLastCheckedRecipient] = useState(null);
  const abortRef = useRef(0);

  const senderAddress = getSenderAddress();

  useEffect(() => {
    return () => {
      abortRef.current += 1;
    };
  }, []);

  const checkBlocked = useCallback(
    (recipientAddress) => {
      if (!recipientAddress || !senderAddress) {
        setBlocked(null);
        setLastCheckedRecipient(null);
        return;
      }

      const trimmed = recipientAddress.trim();

      if (!isValidStacksPrincipal(trimmed)) {
        setBlocked(null);
        setLastCheckedRecipient(null);
        return;
      }

      if (trimmed === senderAddress) {
        setBlocked(null);
        setLastCheckedRecipient(trimmed);
        return;
      }

      if (trimmed === lastCheckedRecipient && blocked !== null) {
        return;
      }

      const callId = ++abortRef.current;
      setChecking(true);
      setLastCheckedRecipient(trimmed);

      fetchCallReadOnlyFunction({
        network,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: FN_IS_USER_BLOCKED,
        functionArgs: [principalCV(trimmed), principalCV(senderAddress)],
        senderAddress,
      })
        .then((result) => {
          if (abortRef.current !== callId) return;
          const json = cvToJSON(result);
          const isBlocked = json.value === true || json.value === 'true';
          setBlocked(isBlocked);
        })
        .catch(() => {
          if (abortRef.current !== callId) return;
          setBlocked(null);
        })
        .finally(() => {
          if (abortRef.current !== callId) return;
          setChecking(false);
        });
    },
    [senderAddress, lastCheckedRecipient, blocked],
  );

  const reset = useCallback(() => {
    abortRef.current += 1;
    setBlocked(null);
    setChecking(false);
    setLastCheckedRecipient(null);
  }, []);

  const isReadyForValidation = lastCheckedRecipient !== null && !checking;

  return {
    blocked,
    checking,
    checkBlocked,
    reset,
    lastCheckedRecipient,
    isReadyForValidation,
  };
}
