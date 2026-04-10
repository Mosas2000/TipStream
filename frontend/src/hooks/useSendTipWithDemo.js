import { useDemoMode } from '../context/DemoContext';
import { useDemoTransaction } from './useDemoTransaction';
import { useDemoBalance } from './useDemoBalance';

export function useSendTipWithDemo(realBalance) {
  const { demoEnabled } = useDemoMode();
  const { submitMockTransaction, pendingTransaction } = useDemoTransaction();
  const { balance: displayBalance, deductBalance } = useDemoBalance(realBalance);

  const sendTipInDemo = async (recipientAddress, amountSTX, message, category) => {
    const amountMicroSTX = parseFloat(amountSTX) * 1000000;
    
    deductBalance(amountMicroSTX);

    const result = await submitMockTransaction({
      recipient: recipientAddress,
      amount: amountSTX,
      message,
      category,
    });

    return {
      txId: result.txId,
      recipient: recipientAddress,
      amount: parseFloat(amountSTX),
    };
  };

  return {
    demoEnabled,
    displayBalance,
    sendTipInDemo,
    pendingTransaction,
  };
}
