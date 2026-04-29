# TipStream Examples

This directory contains example scripts and code snippets demonstrating how to interact with the TipStream contract.

## Pause State Examples

### pause-state-query.js

Basic example showing how to query the current pause state of the contract.

**Usage:**
```javascript
import { queryPauseState } from './pause-state-query.js';

const isPaused = await queryPauseState();
console.log(`Contract is ${isPaused ? 'paused' : 'running'}`);
```

**Features:**
- Direct API call to `get-is-paused` function
- Clarity response parsing
- Error handling

### pause-state-monitoring.js

Advanced example showing how to monitor pause state changes over time.

**Usage:**
```javascript
import { PauseStateMonitor } from './pause-state-monitoring.js';

const monitor = new PauseStateMonitor(5000); // Poll every 5 seconds

monitor.onChange((newState, oldState) => {
    console.log(`State changed from ${oldState} to ${newState}`);
});

await monitor.start();
```

**Features:**
- Continuous monitoring with configurable poll interval
- Event-based notifications on state changes
- Graceful shutdown handling
- Multiple listener support

## Running the Examples

### Prerequisites

```bash
npm install @stacks/transactions
```

### Configuration

Update the contract configuration in your environment:

```javascript
export const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
export const CONTRACT_NAME = 'tipstream-v2';
export const STACKS_API_BASE = 'https://api.testnet.hiro.so';
```

### Execute

```bash
node docs/examples/pause-state-query.js
node docs/examples/pause-state-monitoring.js
```

## Integration Patterns

### React Hook Example

```javascript
import { useState, useEffect } from 'react';
import { queryPauseState } from './pause-state-query';

function usePauseState(pollInterval = 10000) {
    const [isPaused, setIsPaused] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        async function checkState() {
            try {
                const state = await queryPauseState();
                if (mounted) {
                    setIsPaused(state);
                    setError(null);
                }
            } catch (err) {
                if (mounted) {
                    setError(err.message);
                }
            }
        }

        checkState();
        const interval = setInterval(checkState, pollInterval);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [pollInterval]);

    return { isPaused, error };
}
```

### Vue Composable Example

```javascript
import { ref, onMounted, onUnmounted } from 'vue';
import { queryPauseState } from './pause-state-query';

export function usePauseState(pollInterval = 10000) {
    const isPaused = ref(null);
    const error = ref(null);
    let intervalId = null;

    async function checkState() {
        try {
            isPaused.value = await queryPauseState();
            error.value = null;
        } catch (err) {
            error.value = err.message;
        }
    }

    onMounted(() => {
        checkState();
        intervalId = setInterval(checkState, pollInterval);
    });

    onUnmounted(() => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    });

    return { isPaused, error };
}
```

## Best Practices

1. **Polling Interval**: Use a reasonable poll interval (5-10 seconds) to avoid overwhelming the API
2. **Error Handling**: Always handle network errors and API failures gracefully
3. **Caching**: Cache the pause state and only update UI when it changes
4. **User Feedback**: Show clear visual indicators when the contract is paused
5. **Graceful Degradation**: If pause state cannot be determined, assume running but show a warning

## Related Documentation

- [PAUSE_API_REFERENCE.md](../PAUSE_API_REFERENCE.md) - Complete API documentation
- [MIGRATION_GUIDE_PAUSE_STATE.md](../MIGRATION_GUIDE_PAUSE_STATE.md) - Migration guide
- [PAUSE_OPERATIONS.md](../PAUSE_OPERATIONS.md) - Operational procedures
