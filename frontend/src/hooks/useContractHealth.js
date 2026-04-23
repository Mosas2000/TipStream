import { useState, useEffect, useCallback, useRef } from 'react';
import { CONTRACT_ADDRESS, CONTRACT_NAME, STACKS_API_BASE } from '../config/contracts';

const HEALTH_CHECK_TIMEOUT_MS = 10000;
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;

/**
 * Verifies the TipStream contract is deployed and the Stacks API is reachable.
 * Makes a lightweight call to the contract info endpoint on startup.
 *
 * @returns {{ healthy: boolean|null, error: string|null, checking: boolean, retry: () => void }}
 */
export function useContractHealth() {
  const isMounted = useRef(true);
  const [healthy, setHealthy] = useState(null);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef(null);
  const timeoutIdRef = useRef(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    setError(null);

    try {
      const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

      const response = await fetch(
        `${STACKS_API_BASE}/v2/contracts/interface/${CONTRACT_ADDRESS}/${CONTRACT_NAME}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Contract ${contractId} not found. It may not be deployed yet.`
          );
        }
        throw new Error(
          `Stacks API returned ${response.status}. The service may be temporarily unavailable.`
        );
      }

      const data = await response.json();

      // Verify it has expected functions
      const functionNames = data.functions?.map(f => f.name) || [];
      if (!functionNames.includes('send-tip')) {
        throw new Error(
          `Contract ${contractId} does not contain expected functions. The configured address may be incorrect.`
        );
      }

      setHealthy(true);
      setError(null);
    } catch (err) {
      const isAbort = err.name === 'AbortError';
      const isNetwork = err.name === 'TypeError' || err.message?.includes('fetch');

      let message;
      if (isAbort) {
        message = 'Health check timed out. The Stacks API may be slow or unreachable.';
      } else if (isNetwork) {
        message = 'Unable to reach the Stacks API. Please check your internet connection.';
      } else {
        message = err.message;
      }

      setHealthy(false);
      setError(message);
    } finally {
      setChecking(false);
    }
  }, []);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth, retryCount]);

  // Auto-retry with backoff
  useEffect(() => {
    if (healthy === false && retryCount < MAX_RETRIES) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, RETRY_DELAY_MS * (retryCount + 1));
      return () => clearTimeout(timer);
    }
  }, [healthy, retryCount]);

  return { healthy, error, checking, retry };
}
