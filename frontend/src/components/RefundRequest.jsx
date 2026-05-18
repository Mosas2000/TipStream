import { useState } from 'react';
import { openContractCall } from '@stacks/connect';
import { uintCV } from '@stacks/transactions';
import { network, appDetails } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_REQUEST_REFUND } from '../config/contracts';
import { formatSTX, formatAddress } from '../lib/utils';
import { useRefund, isWithinRefundWindow } from '../hooks/useRefund';
import { useDemoMode } from '../context/DemoContext';
import ConfirmDialog from './ui/confirm-dialog';

export default function RefundRequest({ tip, senderAddress, addToast, onRefundSubmitted }) {
  const { demoEnabled } = useDemoMode();
  const { loading, requestRefund } = useRefund();
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingTxId, setPendingTxId] = useState(null);

  const eligible = isWithinRefundWindow(tip.timestamp);
  const isSender = tip.sender === senderAddress;

  if (!isSender || !eligible) return null;

  const handleSubmit = async () => {
    setShowConfirm(false);

    if (demoEnabled) {
      addToast('Refund request submitted (demo).', 'success');
      if (onRefundSubmitted) onRefundSubmitted({ tipId: tip.tipId, status: 'pending' });
      return;
    }

    try {
      await openContractCall({
        network,
        appDetails,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: FN_REQUEST_REFUND,
        functionArgs: [uintCV(Number(tip.tipId))],
        onFinish: async (data) => {
          setPendingTxId(data.txId);
          const result = await requestRefund({
            tipId: String(tip.tipId),
            txId: data.txId,
            sender: tip.sender,
            recipient: tip.recipient,
            amount: Number(tip.amount),
            reason: reason.trim(),
          });
          if (result.ok) {
            addToast('Refund request submitted. Waiting for recipient approval.', 'success');
            if (onRefundSubmitted) onRefundSubmitted(result.refundRequest);
          } else {
            addToast(result.error || 'Failed to record refund request.', 'error');
          }
        },
        onCancel: () => {
          addToast('Refund request cancelled.', 'info');
        },
      });
    } catch (err) {
      addToast(err.message || 'Failed to submit refund request.', 'error');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline underline-offset-2 transition-colors disabled:opacity-50"
        aria-label={`Request refund for tip of ${formatSTX(tip.amount, 2)} STX to ${formatAddress(tip.recipient, 6, 4)}`}
      >
        {loading ? 'Submitting...' : 'Request Refund'}
      </button>

      <ConfirmDialog
        open={showConfirm}
        title="Request Tip Refund"
        onConfirm={handleSubmit}
        onCancel={() => setShowConfirm(false)}
        confirmLabel="Submit Request"
        cancelLabel="Cancel"
      >
        <p className="mb-3">
          You are requesting a refund of{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatSTX(tip.amount, 2)} STX
          </span>{' '}
          sent to{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatAddress(tip.recipient, 8, 6)}
          </span>
          .
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          The recipient must approve this refund. If they do not respond within the refund window, the request will expire.
        </p>
        <label htmlFor="refund-reason" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Reason (optional)
        </label>
        <textarea
          id="refund-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={280}
          rows={2}
          placeholder="e.g. sent to wrong address"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-amber-500 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/280</p>
      </ConfirmDialog>
    </>
  );
}
