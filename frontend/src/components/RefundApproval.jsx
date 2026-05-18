import { useState, useEffect, useCallback } from 'react';
import { openContractCall } from '@stacks/connect';
import { uintCV } from '@stacks/transactions';
import { network, appDetails } from '../utils/stacks';
import { CONTRACT_ADDRESS, CONTRACT_NAME, FN_APPROVE_REFUND, FN_REJECT_REFUND } from '../config/contracts';
import { formatSTX, formatAddress } from '../lib/utils';
import { useRefund } from '../hooks/useRefund';
import { useDemoMode } from '../context/DemoContext';
import ConfirmDialog from './ui/confirm-dialog';

export default function RefundApproval({ tip, recipientAddress, addToast, onResolved }) {
  const { demoEnabled } = useDemoMode();
  const { loading, resolveRefund, fetchRefundRequest } = useRefund();
  const [refundRequest, setRefundRequest] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);

  const isRecipient = tip.recipient === recipientAddress;

  const loadRefundRequest = useCallback(async () => {
    if (!tip.tipId) return;
    setFetching(true);
    const result = await fetchRefundRequest(String(tip.tipId));
    if (result.ok) {
      setRefundRequest(result.refundRequest);
    }
    setFetching(false);
  }, [tip.tipId, fetchRefundRequest]);

  useEffect(() => {
    if (isRecipient) {
      loadRefundRequest();
    }
  }, [isRecipient, loadRefundRequest]);

  if (!isRecipient || fetching) return null;
  if (!refundRequest || refundRequest.status !== 'pending') return null;

  const handleAction = async (action) => {
    setConfirmAction(null);

    if (demoEnabled) {
      addToast(`Refund ${action === 'approve' ? 'approved' : 'rejected'} (demo).`, 'success');
      if (onResolved) onResolved({ ...refundRequest, status: action === 'approve' ? 'approved' : 'rejected' });
      return;
    }

    const fnName = action === 'approve' ? FN_APPROVE_REFUND : FN_REJECT_REFUND;

    try {
      await openContractCall({
        network,
        appDetails,
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: fnName,
        functionArgs: [uintCV(Number(tip.tipId))],
        onFinish: async (data) => {
          const result = await resolveRefund({
            tipId: String(tip.tipId),
            action,
            recipient: recipientAddress,
            refundTxId: action === 'approve' ? data.txId : undefined,
          });
          if (result.ok) {
            const label = action === 'approve' ? 'approved' : 'rejected';
            addToast(`Refund request ${label}.`, 'success');
            setRefundRequest(result.refundRequest);
            if (onResolved) onResolved(result.refundRequest);
          } else {
            addToast(result.error || 'Failed to update refund request.', 'error');
          }
        },
        onCancel: () => {
          addToast('Transaction cancelled.', 'info');
        },
      });
    } catch (err) {
      addToast(err.message || 'Transaction failed.', 'error');
    }
  };

  return (
    <>
      <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Refund Requested</p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
          {formatAddress(refundRequest.sender, 8, 6)} is requesting a refund of{' '}
          <span className="font-semibold">{formatSTX(refundRequest.amount, 2)} STX</span>.
          {refundRequest.reason ? ` Reason: "${refundRequest.reason}"` : ''}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmAction('approve')}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction('reject')}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === 'approve'}
        title="Approve Refund"
        onConfirm={() => handleAction('approve')}
        onCancel={() => setConfirmAction(null)}
        confirmLabel="Approve Refund"
        cancelLabel="Cancel"
      >
        <p>
          You will return{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatSTX(refundRequest.amount, 2)} STX
          </span>{' '}
          to{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatAddress(refundRequest.sender, 8, 6)}
          </span>
          . This action cannot be undone.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmAction === 'reject'}
        title="Reject Refund"
        onConfirm={() => handleAction('reject')}
        onCancel={() => setConfirmAction(null)}
        confirmLabel="Reject Refund"
        cancelLabel="Cancel"
      >
        <p>
          You are declining the refund request from{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatAddress(refundRequest.sender, 8, 6)}
          </span>
          . The tip will remain with you.
        </p>
      </ConfirmDialog>
    </>
  );
}
