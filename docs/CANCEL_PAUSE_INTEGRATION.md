# Cancel-Pause-Change Integration Guide

## Overview

This guide explains how to integrate the `cancel-pause-change` functionality into your admin dashboard or operational tools.

## Contract Integration

### 1. Basic Setup

The contract function is already deployed:

```clarity
(define-public (cancel-pause-change)
  ;; Requires admin authorization
  ;; Clears pending pause proposal
  ;; Clears pending pause height
  ;; Emits pause-change-cancelled event
)
```

### 2. Calling from Frontend

Use the pause operations utilities to interact with the contract:

```javascript
import { PAUSE_OPERATIONS, pauseContractCallConfig } from '../lib/pauseOperations';

// Get contract call config for cancellation
const config = pauseContractCallConfig.cancel;

// Build transaction
const txPayload = {
  contractAddress: CONTRACT_PRINCIPAL,
  contractName: 'tipstream',
  functionName: config.functionName,
  functionArgs: config.args()
};

// Send via Stacks.js
const response = await broadcastTransaction(txPayload);
```

### 3. Fetching Pause Status

```javascript
import { parsePauseStatus } from '../lib/pauseOperations';

// Call get-pending-pause-change
const response = await contractCall({
  functionName: 'get-pending-pause-change'
});

const status = parsePauseStatus(response);
// Returns: { proposal, isPaused, currentHeight }
```

## Frontend Component Integration

### 1. Basic Usage

```jsx
import AdminPauseControl from '../components/AdminPauseControl';
import { pauseOperations } from '../lib/pauseOperations';

export function AdminDashboard() {
  const [proposal, setProposal] = useState(null);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const handlePropose = async (shouldPause) => {
    const tx = await contractCall({
      functionName: shouldPause ? 'propose-pause-change' : 'propose-pause-change',
      functionArgs: [Cl.bool(shouldPause)]
    });
    return tx;
  };

  const handleExecute = async () => {
    const tx = await contractCall({
      functionName: 'execute-pause-change',
      functionArgs: []
    });
    return tx;
  };

  const handleCancel = async () => {
    const tx = await contractCall({
      functionName: 'cancel-pause-change',
      functionArgs: []
    });
    return tx;
  };

  return (
    <AdminPauseControl
      proposal={proposal}
      currentHeight={currentHeight}
      isPaused={isPaused}
      isAdmin={isAdmin}
      onRefresh={refreshPauseStatus}
      onPropose={handlePropose}
      onExecute={handleExecute}
      onCancel={handleCancel}
      showNotification={showNotification}
      isLoading={isLoading}
    />
  );
}
```

### 2. Using Hook Pattern

```jsx
import { useState, useEffect, useCallback } from 'react';
import {
  canExecutePause,
  canCancelPause,
  getPauseErrorMessage
} from '../lib/pauseOperations';

function usePauseControl() {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshProposal = useCallback(async () => {
    setLoading(true);
    try {
      const response = await contractCall({
        functionName: 'get-pending-pause-change'
      });
      const parsed = parsePauseProposal(response);
      setProposal(parsed);
      setError(null);
    } catch (err) {
      setError(getPauseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProposal();
  }, []);

  return {
    proposal,
    loading,
    error,
    canExecute: canExecutePause(proposal, currentHeight),
    canCancel: canCancelPause(proposal),
    refresh: refreshProposal
  };
}
```

## State Management Integration

### 1. With Redux

```javascript
// actions.js
import { PAUSE_OPERATIONS } from '../lib/pauseOperations';

export const proposePauseChange = (shouldPause) => async (dispatch) => {
  dispatch({ type: 'PAUSE_PROPOSE_START' });
  try {
    const tx = await contractCall({
      functionName: PAUSE_OPERATIONS.PROPOSE_PAUSE,
      functionArgs: [Cl.bool(shouldPause)]
    });
    dispatch({ type: 'PAUSE_PROPOSE_SUCCESS', payload: tx });
  } catch (error) {
    dispatch({ type: 'PAUSE_PROPOSE_ERROR', payload: error });
  }
};

export const executePauseChange = () => async (dispatch) => {
  dispatch({ type: 'PAUSE_EXECUTE_START' });
  try {
    const tx = await contractCall({
      functionName: PAUSE_OPERATIONS.EXECUTE_PAUSE,
      functionArgs: []
    });
    dispatch({ type: 'PAUSE_EXECUTE_SUCCESS', payload: tx });
  } catch (error) {
    dispatch({ type: 'PAUSE_EXECUTE_ERROR', payload: error });
  }
};

export const cancelPauseChange = () => async (dispatch) => {
  dispatch({ type: 'PAUSE_CANCEL_START' });
  try {
    const tx = await contractCall({
      functionName: PAUSE_OPERATIONS.CANCEL_PAUSE,
      functionArgs: []
    });
    dispatch({ type: 'PAUSE_CANCEL_SUCCESS', payload: tx });
  } catch (error) {
    dispatch({ type: 'PAUSE_CANCEL_ERROR', payload: error });
  }
};

// reducer.js
const initialState = {
  proposal: null,
  loading: false,
  error: null
};

export function pauseReducer(state = initialState, action) {
  switch (action.type) {
    case 'PAUSE_PROPOSE_START':
    case 'PAUSE_EXECUTE_START':
    case 'PAUSE_CANCEL_START':
      return { ...state, loading: true, error: null };
    
    case 'PAUSE_PROPOSE_ERROR':
    case 'PAUSE_EXECUTE_ERROR':
    case 'PAUSE_CANCEL_ERROR':
      return { ...state, loading: false, error: action.payload };
    
    case 'PAUSE_PROPOSE_SUCCESS':
    case 'PAUSE_EXECUTE_SUCCESS':
    case 'PAUSE_CANCEL_SUCCESS':
      return { ...state, loading: false, proposal: action.payload };
    
    default:
      return state;
  }
}
```

### 2. With Context API

```javascript
// PauseContext.jsx
import React, { createContext, useState, useCallback } from 'react';

export const PauseContext = createContext();

export function PauseProvider({ children }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const propose = useCallback(async (shouldPause) => {
    setLoading(true);
    try {
      const tx = await contractCall({
        functionName: shouldPause ? 'propose-pause-change' : 'propose-pause-change',
        functionArgs: [Cl.bool(shouldPause)]
      });
      setError(null);
      return tx;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const execute = useCallback(async () => {
    setLoading(true);
    try {
      const tx = await contractCall({
        functionName: 'execute-pause-change',
        functionArgs: []
      });
      setError(null);
      return tx;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    setLoading(true);
    try {
      const tx = await contractCall({
        functionName: 'cancel-pause-change',
        functionArgs: []
      });
      setError(null);
      return tx;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    proposal,
    setProposal,
    loading,
    error,
    propose,
    execute,
    cancel
  };

  return (
    <PauseContext.Provider value={value}>
      {children}
    </PauseContext.Provider>
  );
}
```

## Testing Integration

### 1. Unit Tests

```javascript
import { calculateBlocksRemaining, canExecutePause } from '../lib/pauseOperations';

describe('Pause Operations', () => {
  it('should calculate blocks remaining', () => {
    expect(calculateBlocksRemaining(12100, 12000)).toBe(100);
  });

  it('should determine execution readiness', () => {
    const proposal = { value: true, effectiveHeight: 12000 };
    expect(canExecutePause(proposal, 12100)).toBe(true);
  });
});
```

### 2. Component Tests

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import AdminPauseControl from '../components/AdminPauseControl';

describe('AdminPauseControl', () => {
  it('should display pending proposal', () => {
    const proposal = { value: true, effectiveHeight: 12100 };
    render(
      <AdminPauseControl
        proposal={proposal}
        currentHeight={12000}
        isPaused={false}
        isAdmin={true}
        onRefresh={() => {}}
        onPropose={() => {}}
        onExecute={() => {}}
        onCancel={() => {}}
        showNotification={() => {}}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('Pause proposal pending')).toBeTruthy();
  });
});
```

### 3. Integration Tests

```javascript
// Simulate contract calls
const mockContractCall = vi.fn();

// Test full workflow
const { getByText } = render(<AdminPauseControl {...props} />);

// Propose pause
fireEvent.click(getByText('Propose Pause'));
expect(mockContractCall).toHaveBeenCalledWith(
  expect.objectContaining({
    functionName: 'propose-pause-change',
    functionArgs: [Cl.bool(true)]
  })
);

// Wait for timelock
fireEvent.click(getByText('Execute'));
expect(mockContractCall).toHaveBeenCalledWith(
  expect.objectContaining({
    functionName: 'execute-pause-change'
  })
);
```

## Error Handling

### Common Errors and Recovery

```javascript
import { getPauseErrorMessage } from '../lib/pauseOperations';

try {
  await contractCall({
    functionName: 'cancel-pause-change',
    functionArgs: []
  });
} catch (error) {
  const message = getPauseErrorMessage(error);
  
  if (message.includes('no-pending-change')) {
    // Handle: No proposal to cancel
    refreshProposal(); // State may have changed
  } else if (message.includes('timelock')) {
    // Handle: Timelock not expired
    updateBlockHeight(); // Sync block height
  } else if (message.includes('owner-only')) {
    // Handle: Not authorized
    redirectToLogin();
  }
}
```

## Monitoring and Events

### Subscribe to Contract Events

```javascript
import { subscribe as subscribeToEvents } from '../lib/contractEvents';

subscribeToEvents('tipstream', [
  'pause-change-proposed',
  'pause-change-executed',
  'pause-change-cancelled'
], (event) => {
  handlePauseEvent(event);
});

function handlePauseEvent(event) {
  switch (event.type) {
    case 'pause-change-proposed':
      // Update UI with new proposal
      fetchPendingProposal();
      break;
    case 'pause-change-executed':
      // Update pause state
      updatePauseStatus();
      break;
    case 'pause-change-cancelled':
      // Clear proposal from UI
      setProposal(null);
      break;
  }
}
```

## Performance Optimization

### Lazy Loading

```javascript
const AdminPauseControl = lazy(() =>
  import('../components/AdminPauseControl')
);

export function AdminDashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <AdminPauseControl {...props} />
    </Suspense>
  );
}
```

### Caching

```javascript
import { useCachedData } from '../hooks/useCachedData';

function useProposalData() {
  const { data: proposal, refresh } = useCachedData(
    'pauseProposal',
    () => contractCall({ functionName: 'get-pending-pause-change' }),
    { ttl: 30000 } // 30 seconds
  );
  
  return { proposal, refresh };
}
```

## API Reference

See `docs/ADMIN_OPERATIONS.md` for full contract call documentation.

See `src/lib/pauseOperations.js` for utility function signatures.

See `src/components/AdminPauseControl.jsx` for component props.
