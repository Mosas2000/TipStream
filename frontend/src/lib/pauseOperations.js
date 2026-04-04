import { CONTRACT_PRINCIPAL, CONTRACT_NAME } from '../config/contracts';
import { Cl } from '@stacks/transactions';

export const PAUSE_OPERATIONS = {
  PROPOSE_PAUSE: 'propose-pause-change',
  EXECUTE_PAUSE: 'execute-pause-change',
  CANCEL_PAUSE: 'cancel-pause-change',
  GET_PENDING: 'get-pending-pause-change',
  IS_PAUSED: 'is-paused'
};

export const TIMELOCK_BLOCKS = 144;

export const calculateBlocksRemaining = (effectiveHeight, currentHeight) => {
  if (!effectiveHeight || !currentHeight) return 0;
  const remaining = effectiveHeight - currentHeight;
  return Math.max(0, remaining);
};

export const isTimelockExpired = (effectiveHeight, currentHeight) => {
  if (!effectiveHeight || !currentHeight) return false;
  return currentHeight >= effectiveHeight;
};

export const calculateEffectiveHeight = (proposalHeight) => {
  if (!proposalHeight) return 0;
  return proposalHeight + TIMELOCK_BLOCKS;
};

export const parsePauseProposal = (contractResponse) => {
  if (!contractResponse || !contractResponse.ok) {
    return null;
  }

  const data = contractResponse.ok;
  
  if (!data || !data.pending) {
    return null;
  }

  if (data.pending.some === null) {
    return null;
  }

  const proposal = data.pending.some;
  
  return {
    value: proposal.value,
    effectiveHeight: proposal.effectiveHeight
  };
};

export const parsePauseStatus = (contractResponse) => {
  if (!contractResponse || !contractResponse.ok) {
    return {
      proposal: null,
      isPaused: false,
      currentHeight: null
    };
  }

  const data = contractResponse.ok;
  
  return {
    proposal: data.pending && data.pending.some ? {
      value: data.pending.some.value,
      effectiveHeight: data.pending.some.effectiveHeight
    } : null,
    isPaused: data.current || false,
    currentHeight: data.currentHeight || null
  };
};

export const canExecutePause = (proposal, currentHeight) => {
  if (!proposal) return false;
  if (!currentHeight) return false;
  return currentHeight >= proposal.effectiveHeight;
};

export const canCancelPause = (proposal) => {
  return proposal !== null && proposal !== undefined;
};

export const canProposePause = (proposal) => {
  return proposal === null || proposal === undefined;
};

export const getPauseDisplayStatus = (proposal, isPaused, currentHeight) => {
  if (!proposal) {
    return isPaused ? 'paused' : 'running';
  }

  if (!currentHeight) {
    return 'unknown';
  }

  const isReady = currentHeight >= proposal.effectiveHeight;
  return isReady ? 'ready-to-execute' : 'proposal-pending';
};

export const getPauseDisplayMessage = (proposal, isPaused, currentHeight) => {
  const status = getPauseDisplayStatus(proposal, isPaused, currentHeight);

  switch (status) {
    case 'running':
      return 'System Running';
    case 'paused':
      return 'System Paused';
    case 'proposal-pending':
      if (proposal && currentHeight) {
        const blocksRemaining = calculateBlocksRemaining(
          proposal.effectiveHeight,
          currentHeight
        );
        const action = proposal.value ? 'pause' : 'unpause';
        return `${action.charAt(0).toUpperCase() + action.slice(1)} proposal pending (${blocksRemaining} blocks remaining)`;
      }
      return 'Proposal pending';
    case 'ready-to-execute': {
      const executeAction = proposal.value ? 'pause' : 'unpause';
      return `Ready to execute ${executeAction}`;
    }
    default:
      return 'Status unknown';
  }
};

export const buildProposePauseArgs = (shouldPause) => {
  return [Cl.bool(shouldPause)];
};

export const buildExecutePauseArgs = () => {
  return [];
};

export const buildCancelPauseArgs = () => {
  return [];
};

export const pauseContractCallConfig = {
  propose: {
    functionName: PAUSE_OPERATIONS.PROPOSE_PAUSE,
    args: (shouldPause) => buildProposePauseArgs(shouldPause)
  },
  execute: {
    functionName: PAUSE_OPERATIONS.EXECUTE_PAUSE,
    args: () => buildExecutePauseArgs()
  },
  cancel: {
    functionName: PAUSE_OPERATIONS.CANCEL_PAUSE,
    args: () => buildCancelPauseArgs()
  },
  getPending: {
    functionName: PAUSE_OPERATIONS.GET_PENDING,
    args: () => []
  },
  getStatus: {
    functionName: PAUSE_OPERATIONS.IS_PAUSED,
    args: () => []
  }
};

export const getPauseErrorMessage = (error) => {
  if (!error) return 'Unknown error';

  const errorStr = String(error).toLowerCase();

  if (errorStr.includes('no-pending-change') || errorStr.includes('no pending')) {
    return 'No pause proposal pending. Please propose a pause first.';
  }

  if (errorStr.includes('timelock-not-expired') || errorStr.includes('timelock')) {
    return 'Timelock period has not yet expired. Please wait for more blocks to pass.';
  }

  if (errorStr.includes('owner-only') || errorStr.includes('unauthorized')) {
    return 'Only contract owner/admin can perform this action.';
  }

  if (errorStr.includes('transaction failed')) {
    return 'Transaction failed. Please check your wallet and try again.';
  }

  return error;
};

export const getPauseProposalSummary = (proposal, isPaused, currentHeight) => {
  if (!proposal) {
    return {
      type: 'no-proposal',
      currentState: isPaused ? 'paused' : 'running',
      description: isPaused ? 'Contract is currently paused' : 'Contract is running normally'
    };
  }

  const blocksRemaining = calculateBlocksRemaining(proposal.effectiveHeight, currentHeight);
  const isReady = isTimelockExpired(proposal.effectiveHeight, currentHeight);
  const action = proposal.value ? 'pause' : 'unpause';

  if (isReady) {
    return {
      type: 'ready-to-execute',
      action,
      effectiveHeight: proposal.effectiveHeight,
      description: `Ready to execute ${action}. Contract will be ${proposal.value ? 'paused' : 'unpaused'} upon execution.`
    };
  }

  return {
    type: 'pending',
    action,
    effectiveHeight: proposal.effectiveHeight,
    blocksRemaining,
    description: `${action.charAt(0).toUpperCase() + action.slice(1)} proposal pending. Will take effect in ${blocksRemaining} blocks.`
  };
};

export const validatePauseProposal = (shouldPause, currentPauseState) => {
  const errors = [];

  if (typeof shouldPause !== 'boolean') {
    errors.push('Pause value must be a boolean (true or false)');
  }

  if (shouldPause === currentPauseState) {
    errors.push(`Contract is already ${shouldPause ? 'paused' : 'running'}. No change needed.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatTimelockInfo = (proposal, currentHeight) => {
  if (!proposal || !currentHeight) return '';

  const blocksRemaining = calculateBlocksRemaining(proposal.effectiveHeight, currentHeight);
  const hoursEstimate = (blocksRemaining / 144 * 24).toFixed(1);

  return `Blocks remaining: ${blocksRemaining} (≈ ${hoursEstimate} hours)`;
};

export const shouldAutoRefreshPauseStatus = (proposal, currentHeight, lastRefreshHeight) => {
  if (!proposal || !currentHeight || !lastRefreshHeight) return false;

  const blocksElapsed = currentHeight - lastRefreshHeight;
  return blocksElapsed >= 12;
};
