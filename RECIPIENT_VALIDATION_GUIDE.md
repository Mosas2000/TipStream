# Recipient Validation Guide

This guide documents the recipient validation, blocking, and error handling system in TipStream.

## Overview

TipStream implements comprehensive recipient validation to ensure safe and valid tip transactions. The system includes format validation, blocking mechanisms, rate limiting, and detailed error reporting.

## Architecture

### Core Components

1. **Validation Module** (`frontend/src/lib/recipient-validation.js`)
   - Format validation for Stacks addresses
   - Contract principal detection
   - Self-tip prevention

2. **Block Check Hook** (`frontend/src/hooks/useBlockCheck.js`)
   - Real-time blocking status checks
   - Integration with smart contract
   - Status caching for performance

3. **Error Management** (`frontend/src/lib/recipient-errors.js`)
   - Centralized error definitions
   - Severity classification
   - User-friendly error messages

4. **Rate Limiting** (`frontend/src/lib/recipient-rate-limiter.js`)
   - Per-recipient rate limiting
   - Time-based quotas
   - Automatic reset

## Validation Rules

### 1. Format Validation

Valid Stacks addresses must:
- Start with `SP`, `ST`, or `SM`
- Be exactly 41 characters long
- Contain only alphanumeric characters after prefix
- Match pattern: `/^S[PTM][0-9A-Z]{38,39}$/i`

```javascript
import { isValidStacksAddress } from './lib/recipient-validation';

const isValid = isValidStacksAddress('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T');
// Returns: true
```

### 2. Self-Tip Prevention

Users cannot send tips to themselves:

```javascript
import { validateRecipient } from './lib/recipient-validation';

const result = validateRecipient(
  'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',  // recipient
  'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T'   // sender
);

// Returns: { valid: false, error: 'SELF_TIP' }
```

### 3. Contract Principal Detection

Contract principals (addresses with `.contract-name`) are rejected:

```javascript
const result = validateRecipient(
  'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream'
);

// Returns: { valid: false, error: 'CONTRACT_PRINCIPAL' }
```

### 4. Blocking Mechanism

Recipients can block specific senders via smart contract:

```javascript
import { useBlockCheck } from './hooks/useBlockCheck';

function SendTip({ recipient }) {
  const { blocked, checking } = useBlockCheck(recipient);
  
  if (blocked) {
    return <div>This recipient has blocked you</div>;
  }
  
  // Render tip form
}
```

## Error Codes

### Error Severity Levels

- **error**: Critical issues that prevent transaction
- **warning**: Non-critical issues that should be addressed

### Standard Error Codes

| Code | Severity | Description |
|------|----------|-------------|
| `INVALID_FORMAT` | warning | Address format is invalid |
| `SELF_TIP` | warning | Attempt to tip self |
| `CONTRACT_PRINCIPAL` | error | Contract address not allowed |
| `RECIPIENT_BLOCKED` | error | Recipient has blocked sender |
| `RATE_LIMIT_EXCEEDED` | warning | Too many requests |

### Using Error Codes

```javascript
import { 
  getRecipientErrorMessage,
  getRecipientErrorSeverity,
  formatRecipientError
} from './lib/recipient-errors';

const error = formatRecipientError(
  'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
  'SELF_TIP'
);

console.log(error);
// {
//   recipient: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
//   errorCode: 'SELF_TIP',
//   message: 'You cannot send a tip to yourself',
//   severity: 'warning',
//   timestamp: '2026-04-08T13:15:00.000Z'
// }
```

## Rate Limiting

### Configuration

```javascript
import { RateLimiter } from './lib/recipient-rate-limiter';

const limiter = new RateLimiter(
  5,      // maxRequests: 5 requests
  60000   // windowMs: per 60 seconds
);
```

### Usage

```javascript
// Check if request is allowed
if (!limiter.isAllowed()) {
  const waitTime = limiter.getWaitTime();
  console.log(`Rate limit exceeded. Try again in ${waitTime}ms`);
  return;
}

// Record the request
limiter.recordRequest();

// Make API call
await checkBlockStatus(recipient);
```

### Methods

- `isAllowed()` - Check if request is within rate limit
- `recordRequest()` - Record a new request
- `getRemaining()` - Get remaining quota
- `getWaitTime()` - Get time until quota resets
- `reset()` - Manually reset the limiter

## Telemetry & Tracking

### Event Tracking

```javascript
import {
  trackBlockedRecipientDetected,
  trackContractPrincipalDetected,
  trackBlockCheckCompleted
} from './lib/recipient-block-tracking';

// Track when a blocked recipient is detected
trackBlockedRecipientDetected(recipient);

// Track contract principal detection
trackContractPrincipalDetected(recipient);

// Track successful block check
trackBlockCheckCompleted(recipient, isBlocked);
```

### Event Types

- `blocked_recipient_detected` - Recipient has blocked sender
- `contract_principal_detected` - Invalid contract address
- `blocked_submission_attempted` - User tried to submit while blocked
- `block_check_completed` - Block status check finished
- `block_check_failed` - Block status check failed
- `recipient_changed` - User changed recipient field

## Integration Example

### Complete SendTip Component Integration

```javascript
import { useState, useEffect } from 'react';
import { validateRecipient } from './lib/recipient-validation';
import { useBlockCheck } from './hooks/useBlockCheck';
import { formatRecipientError } from './lib/recipient-errors';

function SendTip({ sender }) {
  const [recipient, setRecipient] = useState('');
  const [validationError, setValidationError] = useState(null);
  
  const { blocked, checking } = useBlockCheck(recipient);
  
  useEffect(() => {
    if (!recipient) {
      setValidationError(null);
      return;
    }
    
    const result = validateRecipient(recipient, sender);
    
    if (!result.valid) {
      setValidationError(
        formatRecipientError(recipient, result.error)
      );
    } else {
      setValidationError(null);
    }
  }, [recipient, sender]);
  
  const canSubmit = !validationError && !blocked && !checking;
  
  return (
    <div>
      <input
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="SP2..."
      />
      
      {validationError && (
        <div className={validationError.severity === 'error' ? 'text-red-500' : 'text-yellow-500'}>
          {validationError.message}
        </div>
      )}
      
      {blocked && (
        <div className="text-red-500">
          This recipient has blocked you
        </div>
      )}
      
      <button disabled={!canSubmit}>
        Send Tip
      </button>
    </div>
  );
}
```

## Testing

### Unit Tests

All validation components have comprehensive test coverage:

- `frontend/src/test/recipient-validation.test.js` - Format validation tests
- `frontend/src/test/recipient-errors.test.js` - Error handling tests
- `frontend/src/test/recipient-rate-limiter.test.js` - Rate limiting tests
- `frontend/src/test/recipient-block-tracking.test.js` - Telemetry tests

### Running Tests

```bash
cd frontend
npm test -- recipient-validation
npm test -- recipient-errors
npm test -- recipient-rate-limiter
npm test -- recipient-block-tracking
```

## Best Practices

1. **Always validate before submission**
   - Run validation as user types
   - Show immediate feedback
   - Prevent invalid submissions

2. **Handle errors gracefully**
   - Display user-friendly messages
   - Use appropriate severity levels
   - Log errors for debugging

3. **Respect rate limits**
   - Cache block check results
   - Debounce validation calls
   - Show wait time to users

4. **Track important events**
   - Monitor blocked attempts
   - Analyze validation failures
   - Identify UX improvements

5. **Test thoroughly**
   - Cover all error cases
   - Test edge conditions
   - Verify rate limiting

## Security Considerations

1. **Input Sanitization**
   - Always validate address format
   - Trim whitespace
   - Reject malformed input

2. **Rate Limiting**
   - Prevent abuse of block checking
   - Limit validation requests
   - Protect backend resources

3. **Privacy**
   - Truncate addresses in logs
   - Don't expose full recipient in telemetry
   - Respect user blocking preferences

## Troubleshooting

### Common Issues

**Issue: Block check always returns false**
- Verify wallet is connected
- Check network configuration
- Confirm contract deployment

**Issue: Rate limit errors**
- Reduce validation frequency
- Implement debouncing
- Increase rate limit window

**Issue: False positive validations**
- Verify address format regex
- Check for whitespace
- Review validation logic

## API Reference

See individual module documentation:
- [recipient-validation.js](frontend/src/lib/recipient-validation.js)
- [recipient-errors.js](frontend/src/lib/recipient-errors.js)
- [recipient-rate-limiter.js](frontend/src/lib/recipient-rate-limiter.js)
- [recipient-block-tracking.js](frontend/src/lib/recipient-block-tracking.js)
- [useBlockCheck.js](frontend/src/hooks/useBlockCheck.js)
