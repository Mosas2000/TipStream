# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `SECURITY.md` with vulnerability reporting and wallet rotation advisory.
- `CONTRIBUTING.md` with setup instructions and PR workflow.
- `ARCHITECTURE.md` with system design documentation.
- `settings/Mainnet.toml.example` and `settings/Testnet.toml.example` safe
  credential templates.
- `settings/README.md` documenting network configuration setup.
- `.gitleaks.toml` secret scanning configuration.
- `scripts/hooks/pre-commit` mnemonic detection hook.
- `scripts/setup-hooks.sh` one-command hook installer.
- GitHub Actions secret scanning workflow (`.github/workflows/secret-scan.yml`).

### Changed
- `.gitignore` expanded to cover private keys, certificates, and hosting
  platform local state.
- `scripts/deploy.sh` validates credential file presence and git tracking
  status before deployment.
- `scripts/test-contract.cjs` validates mnemonic word count.
- `settings/Devnet.toml` header updated with cross-reference to example
  templates.
- `.env.example` expanded with deployment-specific variables.
- README security section rewritten with credential handling details.

### Security
- Mainnet seed phrases are excluded from version control (never committed).
- Pre-commit hook blocks staged changes containing mnemonic patterns.
- CI pipeline scans every push and PR for leaked secrets.
