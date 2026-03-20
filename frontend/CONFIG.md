# Frontend Configuration Guide

## Environment Variables

The TipStream frontend requires specific environment variables to function correctly. All environment variables must be prefixed with `VITE_` to be exposed to the client bundle.

### Required Variables

#### VITE_NETWORK
- **Description**: Stacks network to connect to
- **Required**: Yes
- **Valid values**: `mainnet`, `testnet`, `devnet`
- **Example**: `VITE_NETWORK=mainnet`

#### VITE_APP_URL
- **Description**: Base URL of your deployed application
- **Required**: Yes
- **Format**: Must be a valid HTTP or HTTPS URL
- **Usage**: Used for canonical links, Open Graph metadata, and sharing features
- **Examples**:
  - Production: `VITE_APP_URL=https://tipstream.example.com`
  - Preview: `VITE_APP_URL=https://preview-branch.vercel.app`
  - Local: `VITE_APP_URL=http://localhost:5173`

### Optional Variables

#### VITE_HIRO_API_URL
- **Description**: Custom Hiro API endpoint
- **Required**: No
- **Default behavior**: Automatically set based on `VITE_NETWORK`
  - mainnet: `https://api.hiro.so`
  - testnet: `https://api.testnet.hiro.so`
  - devnet: `http://localhost:3999`

## Configuration Files

### contracts.js
Located at `src/config/contracts.js`, this file contains:

- `CONTRACT_ADDRESS`: Stacks address of the deployed contract
- `CONTRACT_NAME`: Name of the deployed contract
- Network configuration
- API endpoint URLs
- Contract function names

The contract address and name are validated at startup to ensure they match expected formats.

## Validation

### Startup Validation

The application validates configuration on startup before rendering. If validation fails:

1. Errors are logged to the browser console
2. A visible error message appears in the UI
3. Application initialization is blocked

### CI Validation

Configuration is validated in CI/CD pipelines using:

```bash
npm run validate:config
```

This script checks:
- Required environment variables are set
- Network value is valid
- URLs are properly formatted
- Contract address matches Stacks format
- Contract name follows naming conventions

## Environment Setup

### Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your values:
   ```bash
   VITE_NETWORK=devnet
   VITE_APP_URL=http://localhost:5173
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Preview Deployments

Set environment variables in your deployment platform:

```bash
VITE_NETWORK=testnet
VITE_APP_URL=https://your-preview-url.vercel.app
```

### Production Deployments

Set environment variables in your deployment platform:

```bash
VITE_NETWORK=mainnet
VITE_APP_URL=https://your-production-domain.com
```

## Troubleshooting

### Configuration Validation Failed

If you see "Configuration validation failed" in the console:

1. Check that all required environment variables are set
2. Verify `VITE_NETWORK` is one of: mainnet, testnet, devnet
3. Ensure `VITE_APP_URL` is a valid URL with http:// or https://
4. Confirm `CONTRACT_ADDRESS` in contracts.js matches Stacks address format
5. Verify `CONTRACT_NAME` in contracts.js uses lowercase letters, numbers, and hyphens only

### Network Mismatch Warnings

If you see network mismatch warnings:

- Check that the Stacks API URL matches your selected network
- mainnet should use `https://api.hiro.so`
- testnet should use `https://api.testnet.hiro.so`
- devnet should use `http://localhost:3999`

### Missing Environment Variables

Environment variables not prefixed with `VITE_` are not accessible in the frontend. Always use the `VITE_` prefix.

## Deployment Checklist

Before deploying:

- [ ] Set `VITE_NETWORK` to correct network
- [ ] Set `VITE_APP_URL` to deployment URL
- [ ] Verify `CONTRACT_ADDRESS` matches deployed contract
- [ ] Verify `CONTRACT_NAME` matches deployed contract
- [ ] Run `npm run validate:config` locally
- [ ] Confirm CI validation passes
- [ ] Test configuration in preview environment
- [ ] Verify network matches contract deployment network
