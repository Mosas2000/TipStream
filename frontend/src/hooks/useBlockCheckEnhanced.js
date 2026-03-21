import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchCallReadOnlyFunction, cvToJSON, principalCV } from '@stacks/transactions';
import { network, getSenderAddress } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_IS_USER_BLOCKED } from '../config/contracts';
import { isValidStacksPrincipal } from '../lib/stacks-principal';

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
