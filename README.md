# TipStream

A micro-tipping platform built on the Stacks blockchain.

## Features

- **Send STX Tips**: Send micro-tips with optional messages to any Stacks address.
- **Activity Tracking**: View your sent and received tips in a beautifully designed dashboard.
- **Platform Analytics**: Real-time stats on total volume, tip counts, and fees.
- **Live Stream**: Watch tipping activity happen live on-chain.
- **Leaderboards**: Compete for the top spot among tippers and creators.

## Deployment Status

- **Smart Contract**: `tipstream.clar`
- **Network**: Mainnet (Secured by Bitcoin)
- **Status**: Ready for Production

## Quick Start

### Smart Contract
```bash
# Initialize and test
clarinet check
npm test

# Deploy to Mainnet
sh scripts/deploy.sh
clarinet deployments apply -p deployments/default.mainnet-plan.yaml
```

### Frontend
```bash
cd frontend
npm install
npm run dev # Development
npm run build # Production
```

## License
MIT
