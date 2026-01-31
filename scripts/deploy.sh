#!/bin/bash

# TipStream Deployment Script
# This script prepares the smart contract for mainnet deployment and builds the frontend.

echo "🚀 Starting TipStream Deployment Preparation..."

# 1. Generate deployment plan for mainnet
echo "📝 Generating Clarinet mainnet deployment plan..."
clarinet deployments generate --mainnet --medium-cost

# 2. Check if deployment plan exists
if [ -f "deployments/default.mainnet-plan.yaml" ]; then
    echo "✅ Mainnet deployment plan generated at deployments/default.mainnet-plan.yaml"
else
    echo "❌ Failed to generate deployment plan."
    exit 1
fi

# 3. Environment setup hints
echo "💡 To deploy the smart contract, run:"
echo "   clarinet deployments apply -p deployments/default.mainnet-plan.yaml"

echo "💡 After contract deployment, update VITE_CONTRACT_ADDRESS in frontend/.env.production"
echo "   and build the frontend with 'npm run build' inside the frontend directory."

echo "✨ Preparation complete!"
