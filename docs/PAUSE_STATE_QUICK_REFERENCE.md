# Pause State Quick Reference

## Function Signature

```clarity
(define-read-only (get-is-paused)
    (ok (var-get is-paused))
)
```

## Response Format

```clarity
(ok true)   ;; Contract is paused
(ok false)  ;; Contract is running
```

## Hex Encoding

| State | Hex Value |
|-------|-----------|
| Paused | `0x0703` |
| Running | `0x0704` |

## JavaScript Usage

### Basic Query

```javascript
import { queryPauseState } from './pause-state-query';

const isPaused = await queryPauseState();
console.log(isPaused ? 'PAUSED' : 'RUNNING');
```

### With Error Handling

```javascript
import { queryPauseState } from './pause-state-query';
import { formatPauseStateError } from './pause-state-errors';

try {
    const isPaused = await queryPauseState();
    // Handle state
} catch (error) {
    const message = formatPauseStateError(error);
    console.error(message);
}
```

### React Hook

```javascript
import { useState, useEffect } from 'react';

function usePauseState() {
    const [isPaused, setIsPaused] = useState(null);

    useEffect(() => {
        async function check() {
            const state = await queryPauseState();
            setIsPaused(state);
        }
        check();
        const interval = setInterval(check, 10000);
        return () => clearInterval(interval);
    }, []);

    return isPaused;
}
```

## API Endpoint

```
POST https://api.hiro.so/v2/contracts/call-read/{address}/{contract}/get-is-paused
```

### Request Body

```json
{
    "sender": "{contract_address}",
    "arguments": []
}
```

### Response

```json
{
    "okay": true,
    "result": "0x0704"
}
```

## Common Patterns

### Conditional UI Rendering

```javascript
if (isPaused) {
    return <PausedBanner />;
}
return <TipForm />;
```

### Form Validation

```javascript
function validateTipForm() {
    if (isPaused) {
        throw new Error('Contract is paused');
    }
    // Other validation
}
```

### Monitoring

```javascript
monitor.onChange((newState, oldState) => {
    if (newState && !oldState) {
        alert('Contract has been paused');
    }
});
```

## Error Codes

| Error | Meaning | Action |
|-------|---------|--------|
| Network error | Cannot reach API | Check connection |
| 404 | Function not found | Upgrade contract |
| 429 | Rate limited | Wait and retry |
| 500 | API error | Try again later |

## Performance Tips

- Cache for 5-10 seconds
- Use parallel fetching
- Implement exponential backoff
- Monitor response times

## Related Functions

| Function | Purpose |
|----------|---------|
| `get-pending-pause-change` | Get pending pause proposal |
| `propose-pause-change` | Propose pause change |
| `execute-pause-change` | Execute pause proposal |
| `cancel-pause-change` | Cancel pause proposal |

## Documentation Links

- [Full API Reference](./PAUSE_API_REFERENCE.md)
- [Migration Guide](./MIGRATION_GUIDE_PAUSE_STATE.md)
- [Performance Guide](./PAUSE_STATE_PERFORMANCE.md)
- [Examples](./examples/README.md)
