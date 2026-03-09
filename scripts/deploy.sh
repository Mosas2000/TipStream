#!/bin/bash
set -euo pipefail

# TipStream Deployment Script
# Deploys the 10-contract ecosystem to Stacks mainnet
# Total cost: ~1 STX (0.1 STX per contract × 10 contracts)
#
# Prerequisites:
#   - clarinet CLI installed
#   - settings/Mainnet.toml populated with deployer mnemonic
#     (copy settings/Mainnet.toml.example if it does not exist)

echo "Starting TipStream ecosystem deployment..."
echo ""

# ---- Pre-flight checks ----

# Verify clarinet is installed
if ! command -v clarinet &> /dev/null; then
    echo "Error: clarinet is not installed or not in PATH."
    echo "Install it from https://github.com/hirosystems/clarinet"
    exit 1
fi

# Verify mainnet settings exist (we never ship the real file)
if [ ! -f "settings/Mainnet.toml" ]; then
    echo "Error: settings/Mainnet.toml not found."
    echo "Copy the template and fill in your mnemonic:"
    echo "  cp settings/Mainnet.toml.example settings/Mainnet.toml"
    exit 1
fi

# Warn if the mainnet config still contains placeholder text
if grep -q '<YOUR DEPLOYER MNEMONIC HERE>' settings/Mainnet.toml 2>/dev/null; then
    echo "Error: settings/Mainnet.toml still contains the placeholder mnemonic."
    echo "Replace it with your real deployer mnemonic before deploying."
    exit 1
fi

# Safety net: abort if the credentials file is tracked by git
if git ls-files --error-unmatch settings/Mainnet.toml &>/dev/null; then
    echo "CRITICAL: settings/Mainnet.toml is tracked by git."
    echo "Run:  git rm --cached settings/Mainnet.toml"
    echo "Then commit. Deployment aborted to prevent mnemonic exposure."
    exit 1
fi

# Run contract checks before deploying
echo "Running contract syntax check..."
if ! clarinet check; then
    echo "Error: contract check failed. Fix issues before deploying."
    exit 1
fi

echo ""
echo "=== Deployment Plan ==="
echo "Contracts to deploy (10 new, tipstream already on mainnet):"
echo "  1. tipstream-traits     (SIP-010/SIP-009 trait definitions)"
echo "  2. tipstream-token      (TIPS fungible token)"
echo "  3. tipstream-escrow     (Time-locked escrow tips)"
echo "  4. tipstream-subscription (Recurring patronage)"
echo "  5. tipstream-vault      (Community treasury)"
echo "  6. tipstream-referral   (Referral tracking)"
echo "  7. tipstream-multisig   (Multi-sig admin)"
echo "  8. tipstream-rewards    (TIPS token rewards)"
echo "  9. tipstream-badges     (NFT achievement badges)"
echo " 10. tipstream-dao        (Token-weighted governance)"
echo ""
echo "Estimated total cost: ~1.0 STX (0.1 STX per contract)"
echo "Deployer: SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T"
echo ""

# Verify deployment plan exists
if [ ! -f "deployments/default.mainnet-plan.yaml" ]; then
    echo "Error: deployment plan not found at deployments/default.mainnet-plan.yaml"
    exit 1
fi

echo "Review the plan:  cat deployments/default.mainnet-plan.yaml"
echo ""
read -p "Deploy to mainnet? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Applying deployment plan..."
clarinet deployments apply -p deployments/default.mainnet-plan.yaml

DEPLOY_EXIT=$?
if [ $DEPLOY_EXIT -ne 0 ]; then
    echo ""
    echo "Deployment failed with exit code $DEPLOY_EXIT."
    echo "Check the output above for details."
    exit $DEPLOY_EXIT
fi

echo ""
echo "=== Post-Deployment Setup ==="
echo "Run these transactions after deployment:"
echo "  1. tipstream-token.add-minter(<tipstream-rewards contract principal>)"
echo "     Authorizes the rewards contract to mint TIPS tokens"
echo "  2. tipstream-vault.add-authorized(<tipstream-dao contract principal>)"
echo "     Authorizes the DAO to withdraw from the vault"
echo ""
echo "Deployment complete."
