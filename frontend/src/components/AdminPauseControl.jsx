import React, { useState, useEffect, useCallback } from 'react';
import {
  calculateBlocksRemaining,
  isTimelockExpired,
  getPauseDisplayStatus,
  getPauseDisplayMessage,
  getPauseErrorMessage,
  canExecutePause,
  canCancelPause,
  shouldAutoRefreshPauseStatus
} from '../lib/pauseOperations';

export default function AdminPauseControl({
  proposal,
  currentHeight,
  isPaused,
  isAdmin,
  onRefresh,
  onPropose,
  onExecute,
  onCancel,
  showNotification,
  isLoading
}) {
  const [localIsLoading, setLocalIsLoading] = useState(false);
  const [lastRefreshHeight, setLastRefreshHeight] = useState(currentHeight);

  useEffect(() => {
    setLastRefreshHeight(currentHeight);
  }, [currentHeight]);

  const handlePropose = useCallback(async (shouldPause) => {
    if (!isAdmin) {
      showNotification('Only admins can propose pause changes', 'error');
      return;
    }

    setLocalIsLoading(true);
    try {
      await onPropose(shouldPause);
      showNotification(
        `${shouldPause ? 'Pause' : 'Unpause'} proposal submitted. Will take effect in 144 blocks.`,
        'success'
      );
      await onRefresh();
    } catch (error) {
      showNotification(
        `Failed to propose: ${getPauseErrorMessage(error)}`,
        'error'
      );
    } finally {
      setLocalIsLoading(false);
    }
  }, [isAdmin, onPropose, onRefresh, showNotification]);

  const handleExecute = useCallback(async () => {
    if (!isAdmin) {
      showNotification('Only admins can execute pause changes', 'error');
      return;
    }

    if (!canExecutePause(proposal, currentHeight)) {
      showNotification('Timelock period has not yet expired', 'warning');
      return;
    }

    setLocalIsLoading(true);
    try {
      await onExecute();
      const action = proposal.value ? 'paused' : 'unpaused';
      showNotification(
        `Contract ${action} successfully`,
        'success'
      );
      await onRefresh();
    } catch (error) {
      showNotification(
        `Failed to execute: ${getPauseErrorMessage(error)}`,
        'error'
      );
    } finally {
      setLocalIsLoading(false);
    }
  }, [isAdmin, proposal, currentHeight, onExecute, onRefresh, showNotification]);

  const handleCancel = useCallback(async () => {
    if (!isAdmin) {
      showNotification('Only admins can cancel pause proposals', 'error');
      return;
    }

    if (!canCancelPause(proposal)) {
      showNotification('No pause proposal to cancel', 'warning');
      return;
    }

    setLocalIsLoading(true);
    try {
      await onCancel();
      showNotification(
        'Pause proposal cancelled',
        'success'
      );
      await onRefresh();
    } catch (error) {
      showNotification(
        `Failed to cancel: ${getPauseErrorMessage(error)}`,
        'error'
      );
    } finally {
      setLocalIsLoading(false);
    }
  }, [isAdmin, proposal, onCancel, onRefresh, showNotification]);

  const status = getPauseDisplayStatus(proposal, isPaused, currentHeight);
  const message = getPauseDisplayMessage(proposal, isPaused, currentHeight);
  const isReady = isTimelockExpired(proposal?.effectiveHeight, currentHeight);
  const blocksRemaining = proposal
    ? calculateBlocksRemaining(proposal.effectiveHeight, currentHeight)
    : 0;

  const effectiveLoading = isLoading || localIsLoading;

  return (
    <div className="admin-pause-control">
      <div className="pause-status">
        <h3>Contract Pause Control</h3>
        <div className={`status-indicator status-${status}`}>
          {message}
        </div>
      </div>

      {proposal && (
        <div className="proposal-details">
          <div className="proposal-info">
            <p>
              <strong>Proposed Action:</strong>{' '}
              {proposal.value ? 'Pause' : 'Unpause'}
            </p>
            <p>
              <strong>Effective Block:</strong> {proposal.effectiveHeight}
            </p>
            <p>
              <strong>Current Block:</strong> {currentHeight}
            </p>
            <p>
              <strong>Blocks Remaining:</strong> {blocksRemaining}
            </p>
          </div>

          <div className="proposal-actions">
            {isReady && (
              <button
                onClick={handleExecute}
                disabled={effectiveLoading || !isAdmin}
                className="btn btn-primary"
                title={!isAdmin ? 'Only admins can execute' : 'Execute proposal now'}
              >
                {effectiveLoading ? 'Executing...' : 'Execute'}
              </button>
            )}
            <button
              onClick={handleCancel}
              disabled={effectiveLoading || !isAdmin}
              className="btn btn-secondary"
              title={!isAdmin ? 'Only admins can cancel' : 'Cancel proposal'}
            >
              {effectiveLoading ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {!proposal && !isPaused && (
        <div className="propose-actions">
          <button
            onClick={() => handlePropose(true)}
            disabled={effectiveLoading || !isAdmin}
            className="btn btn-warning"
            title={!isAdmin ? 'Only admins can propose pause' : 'Propose pause'}
          >
            {effectiveLoading ? 'Proposing...' : 'Propose Pause'}
          </button>
        </div>
      )}

      {!proposal && isPaused && (
        <div className="propose-actions">
          <button
            onClick={() => handlePropose(false)}
            disabled={effectiveLoading || !isAdmin}
            className="btn btn-success"
            title={!isAdmin ? 'Only admins can propose unpause' : 'Propose unpause'}
          >
            {effectiveLoading ? 'Proposing...' : 'Propose Unpause'}
          </button>
        </div>
      )}

      {proposal && (
        <div className="pause-warning">
          <p>
            ⚠️ A {proposal.value ? 'pause' : 'unpause'} proposal is pending.
            {blocksRemaining > 0 && (
              <> Will take effect in approximately {(blocksRemaining / 144 * 24).toFixed(1)} hours.</>
            )}
            {blocksRemaining === 0 && (
              <> Ready for execution.</>
            )}
          </p>
        </div>
      )}

      {!isAdmin && (
        <div className="admin-notice">
          <p>
            This section is restricted to contract admins.
          </p>
        </div>
      )}
    </div>
  );
}
