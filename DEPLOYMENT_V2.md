# TipStream V2 Mainnet Deployment

## Deployment Summary

**Date:** May 12, 2026  
**Network:** Stacks Mainnet  
**Deployer:** SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60  
**Block Height:** 7940053  
**Total Cost:** 0.6 STX (~$0.16 USD)

## Deployed Contracts

### 1. TipStream Traits
- **Contract ID:** `SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60.tipstream-traits`
- **Transaction:** [0x5942626d...](https://explorer.hiro.so/txid/0x5942626d5488b8cdd3e0f60613f3c0d8edf09bdc48b06c3fdb44c4080fb4be8b?chain=mainnet)
- **Fee:** 0.1 STX
- **Purpose:** SIP-010 trait definitions for token tipping

### 2. TipStream Main Contract (V2)
- **Contract ID:** `SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60.tipstream`
- **Transaction:** [0x8ebb6a04...](https://explorer.hiro.so/txid/0x8ebb6a0469a0a29592e75bd09149147eecd4765f9eccb748c15194c2939a31a6?chain=mainnet)
- **Fee:** 0.5 STX
- **Version:** v2.0.0
- **Source:** contracts/tipstream-v2.clar

## V2 Features

- Core STX tipping with 0.5% platform fee
- User profiles (display name, bio, avatar)
- Privacy controls (block/unblock users)
- Categorized tips (7 categories)
- Recursive tipping (tip-a-tip)
- Batch tipping (up to 50 recipients)
- SIP-010 token tipping support
- Emergency pause mechanism
- Time-locked admin functions
- Multi-sig authorization support

## Deployment Process

1. **Preparation**
   - Verified contract compilation with `clarinet check`
   - Configured deployer account in Mainnet.toml
   - Created deployment plan (v2-mainnet-deployment.yaml)

2. **Deployment**
   - Deployed traits contract first (dependency)
   - Deployed main contract referencing traits
   - Both contracts deployed in same block

3. **Verification**
   - Confirmed successful deployment on explorer
   - Verified contract functions are callable
   - Updated frontend configuration

## Frontend Integration

Updated files:
- `frontend/src/config/contracts.js` - Contract address and metadata
- `frontend/.env.production` - Production environment variables
- `frontend/.env.example` - Environment documentation
- `README.md` - Deployment information

## Migration Notes

### From Previous Deployment
- **Old Address:** SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T
- **New Address:** SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60
- **Reason:** New deployer wallet, fresh V2 deployment

### Breaking Changes
- None - V2 maintains backward compatibility with V1 API

### Data Migration
- No automatic migration - users start fresh on new contract
- Previous tips remain on old contract (read-only)

## Post-Deployment Checklist

- [x] Contracts deployed successfully
- [x] Frontend configuration updated
- [x] README documentation updated
- [ ] Frontend deployed to production
- [ ] DNS/CDN cache cleared
- [ ] Smoke tests on production
- [ ] Monitor for errors in first 24 hours

## Rollback Plan

If issues are discovered:
1. Revert frontend to previous contract address
2. Deploy hotfix if needed
3. Redeploy with fixes
4. Update configuration again

## Support

- **Explorer:** https://explorer.hiro.so/address/SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60?chain=mainnet
- **Contract Source:** contracts/tipstream-v2.clar
- **Deployment Config:** deployments/v2-mainnet-deployment.yaml

## Next Steps

1. Deploy frontend to production (Vercel)
2. Test all features on mainnet
3. Monitor transaction success rates
4. Gather user feedback
5. Plan V3 features (streaming payments, escrow, composability)
