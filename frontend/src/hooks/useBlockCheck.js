/**
 * @module hooks/useBlockCheck
 *
 * Hook for checking whether the current user is blocked by a given recipient.
 *
 * Uses a call-id counter to discard stale responses from in-flight requests
 * when the recipient address changes rapidly.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchCallReadOnlyFunction, cvToJSON, principalCV } from '@stacks/transactions';
import { network, getSenderAddress } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_IS_USER_BLOCKED } from '../config/contracts';

/**
 * Hook that checks whether the current user is blocked by a given address.
 *
 * @returns {Object} result
 * @returns {boolean|null} result.blocked - Block state; null means not yet checked.
 * @returns {boolean} result.checking - Whether a block check is in progress.
 * @returns {Function} result.checkBlocked - Trigger a block check for a recipient address.
 * @returns {Function} result.reset - Cancel any pending check and reset state to null.
 */
export function useBlockCheck() {
    const [blocked, setBlocked] = useState(null);
    const [checking, setChecking] = useState(false);
    const abortRef = useRef(0);

    const senderAddress = getSenderAddress();

    useEffect(() => {
        return () => {
            // Invalidate any in-flight requests on unmount
            abortRef.current += 1;
        };
    }, []);

    const checkBlocked = useCallback(
        (recipientAddress) => {
            if (!recipientAddress || !senderAddress) {
                setBlocked(null);
                return;
            }

            const trimmed = recipientAddress.trim();
            if (trimmed === senderAddress) {
                setBlocked(null);
                return;
            }

            const callId = ++abortRef.current;
            setChecking(true);

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
        [senderAddress],
    );

    const reset = useCallback(() => {
        abortRef.current += 1;
        setBlocked(null);
        setChecking(false);
    }, []);

    return { blocked, checking, checkBlocked, reset };
}
