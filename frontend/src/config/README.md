# Configuration Validation

This module provides validation for frontend environment variables and contract configuration at both startup and build time.

## Usage

### Runtime Validation

Validation runs automatically on application startup via `main.jsx`:

```javascript
import { validateConfigAtStartup, reportValidationErrors } from './config/startup.js';

const validationResults = validateConfigAtStartup();
reportValidationErrors(validationResults);

if (!validationResults.success) {
  // Block application startup
}
```

### Build-time Validation

Run validation before build or in CI:

```bash
npm run validate:config
```

### Environment Variables

```bash
VITE_NETWORK=mainnet
VITE_APP_URL=https://your-domain.com
```

## Validation Rules

### Network
- Must be one of: `mainnet`, `testnet`, `devnet`
- Required

### App URL
- Must be a valid HTTP or HTTPS URL
- Required for proper operation
- Used for canonical links and sharing

### Contract Address
- Must match Stacks address format: `S[TPMN][0-9A-Z]{38,40}`
- Validated from `contracts.js`

### Contract Name
- Must start with lowercase letter
- Can contain lowercase letters, numbers, and hyphens
- Validated from `contracts.js`

### Stacks API URL
- Must be a valid URL
- Should match the selected network
- Warnings issued for network mismatches

## Error Handling

### Validation Errors
Errors prevent application startup and are displayed:
- In browser console with detailed messages
- In UI with a visible error banner

### Warnings
Warnings are logged but don't prevent startup:
- Missing optional configuration
- Network/API URL mismatches

## Testing

Unit tests cover all validation functions:

```bash
npm test src/config/validation.test.js
npm test src/config/startup.test.js
```

## CI Integration

Configuration validation runs in CI before building:

```yaml
- name: Validate configuration
  env:
    VITE_NETWORK: mainnet
    VITE_APP_URL: https://tipstream-silk.vercel.app
  run: npm run validate:config
```
