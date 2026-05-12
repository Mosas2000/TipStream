# Migration Guide: V1 to V2 Contract

## Overview

This guide helps users and developers migrate from the old TipStream contract to the new V2 deployment.

## Contract Changes

### Old Contract
- **Address:** SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T.tipstream
- **Version:** v1.0.0

### New Contract  
- **Address:** SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60.tipstream
- **Version:** v2.0.0
- **Deployment Block:** 7940053

## For Users

### What Stays the Same
- All tipping functionality works identically
- Same 0.5% platform fee
- Same user interface
- Same wallet connection process

### What Changes
- Tips sent to the new contract start fresh (no history migration)
- User profiles need to be recreated
- Previous tips remain viewable on old contract

### Action Required
1. **No immediate action needed** - frontend automatically uses new contract
2. **Optional:** Recreate your profile on the new contract
3. **Optional:** Export old tip history for records

## For Developers

### Frontend Integration

Update your contract configuration:

```javascript
// Old
export const CONTRACT_ADDRESS = 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T';

// New
export const CONTRACT_ADDRESS = 'SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60';
export const CONTRACT_VERSION = 'v2.0.0';
```

### API Changes

**No breaking changes** - All function signatures remain the same.

### Testing

Test your integration:
```bash
# Update environment
VITE_CONTRACT_ADDRESS=SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60

# Run tests
npm test
```

## Data Migration

### User Profiles
- Not automatically migrated
- Users can recreate profiles manually
- Consider building a migration tool if needed

### Tip History
- Old tips remain on old contract
- Query both contracts to show complete history
- Example:
```javascript
const oldTips = await fetchTips('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T');
const newTips = await fetchTips('SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60');
const allTips = [...oldTips, ...newTips];
```

## Rollback Plan

If issues occur:
1. Revert frontend to old contract address
2. Users can continue using old contract
3. Fix issues and redeploy

## Support

Questions? Check:
- [README.md](../README.md)
- [DEPLOYMENT_V2.md](../DEPLOYMENT_V2.md)
- Contract Explorer: https://explorer.hiro.so/address/SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60
