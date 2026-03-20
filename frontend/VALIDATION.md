# Configuration Validation - Quick Reference

## For Developers

### Running Validation

```bash
npm run validate:config
```

### Environment Variables

```bash
VITE_NETWORK=mainnet        # Required: mainnet | testnet | devnet
VITE_APP_URL=https://...    # Required: Valid HTTP/HTTPS URL
```

### Contract Configuration

Edit `src/config/contracts.js`:

```javascript
export const CONTRACT_ADDRESS = 'SP...';  // Valid Stacks address
export const CONTRACT_NAME = 'tipstream';  // Lowercase, hyphens allowed
```

### Test Your Config

```bash
VITE_NETWORK=testnet VITE_APP_URL=http://localhost:5173 npm run validate:config
```

## For CI/CD

### GitHub Actions

```yaml
- name: Validate configuration
  env:
    VITE_NETWORK: mainnet
    VITE_APP_URL: https://your-domain.com
  run: npm run validate:config
```

### Build Integration

Validation runs automatically before build:

```bash
npm run build  # Runs validate:config first
```

## Error Messages

### Network Error
```
ERROR: VITE_NETWORK must be one of: mainnet, testnet, devnet
```
**Fix**: Set `VITE_NETWORK` to a valid value

### URL Error
```
ERROR: VITE_APP_URL is not a valid URL
```
**Fix**: Ensure URL starts with `http://` or `https://`

### Contract Address Error
```
ERROR: CONTRACT_ADDRESS does not match Stacks address format
```
**Fix**: Verify address starts with `S` followed by valid characters

## Testing

```bash
npm test src/config/validation.test.js
npm test src/config/startup.test.js
```

## Documentation

- Full guide: `frontend/CONFIG.md`
- Module docs: `frontend/src/config/README.md`
