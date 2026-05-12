# Configuration Changelog

## [2.0.0] - 2026-05-12

### Changed
- Updated `CONTRACT_ADDRESS` to `SP1W6XQZ6XVYGTVW32SJW2ZG48ZJBW9BATRD19N60`
- Updated `CONTRACT_NAME` to `tipstream` (V2 deployment)

### Added
- `CONTRACT_VERSION` constant (v2.0.0)
- `CONTRACT_DEPLOYMENT_BLOCK` constant (7940053)
- `TRAITS_CONTRACT_ADDRESS` for SIP-010 support
- `TRAITS_CONTRACT_NAME` constant
- `FULL_CONTRACT_ID` helper
- `FULL_TRAITS_CONTRACT_ID` helper
- `CONTRACT_EXPLORER_URL` for easy verification
- `DEPLOYMENT_TX_URL` for deployment reference
- `validateContractDeployment()` helper function

### Migration
- Frontend automatically uses new contract
- No breaking changes to function signatures
- Users need to recreate profiles on new contract

## [1.0.0] - 2024-XX-XX

### Initial Release
- Basic contract configuration
- Function name constants
- Network configuration
