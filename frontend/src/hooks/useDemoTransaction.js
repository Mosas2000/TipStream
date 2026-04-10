import { useState, useCallback } from 'react';
import { useDemoMode } from '../context/DemoContext';
import { getDemo } from '../config/demo';

function generateMockTxId() {
  return '0x' + Math.random().toString(16).substr(2) + Math.random().toString(16).substr(2);
}

export function useDemoTransaction() {
  const { demoEnabled } = useDemoMode();
  const [pendingTransaction, setPendingTransaction] = useState(null);

  const submitMockTransaction = useCallback(async (data) => {
    if (!demoEnabled) {
      return null;
    }

    const delay = getDemo().mockTransactionDelay;
    const txId = generateMockTxId();

    setPendingTransaction({
      id: txId,
      status: 'pending',
      timestamp: Date.now(),
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        setPendingTransaction({
          id: txId,
          status: 'completed',
          timestamp: Date.now(),
        });
        resolve({
          txId,
          success: true,
          timestamp: Date.now(),
        });
      }, delay);
    });
  }, [demoEnabled]);

  const clearPendingTransaction = useCallback(() => {
    setPendingTransaction(null);
  }, []);

  return {
    submitMockTransaction,
    pendingTransaction,
    clearPendingTransaction,
    isDemoMode: demoEnabled,
  };
}
